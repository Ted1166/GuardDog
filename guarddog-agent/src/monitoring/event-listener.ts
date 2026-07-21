import { ethers } from 'ethers';
import { GUARDIAN_VAULT_ABI, THREAT_REGISTRY_ABI, getContractAddresses, type NetworkKey } from '../config/contracts.js';
import type { AlertMessage } from '../messaging/openclaw.js';

const RECONNECT_BASE_DELAY_MS = 2_000;
const RECONNECT_MAX_DELAY_MS = 60_000;

// Minimal interface (not the concrete OpenClawMessaging class) so tests can
// inject a spy/mock without needing to satisfy private class fields.
export interface AlertSender {
  sendAlert(alert: AlertMessage): Promise<void>;
}

/**
 * Listens for ThreatRegistry/GuardianVault events over a WebSocket so alerts
 * fire in near real-time instead of waiting for the next poll cycle. The
 * polling loop in GuardDogAgent keeps running independently as a backstop —
 * if the WS connection is unavailable or drops permanently, threats still
 * get caught (just on the slower poll cadence).
 */
export class ThreatEventListener {
  private wssUrl: string;
  private network: NetworkKey;
  private messaging: AlertSender;
  private onThreatReported?: () => void;
  private provider?: ethers.WebSocketProvider;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private stopped = true;

  constructor(
    wssUrl: string,
    network: NetworkKey,
    messaging: AlertSender,
    onThreatReported?: () => void
  ) {
    this.wssUrl = wssUrl;
    this.network = network;
    this.messaging = messaging;
    this.onThreatReported = onThreatReported;
  }

  start(): void {
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.provider?.destroy().catch(() => {});
    this.provider = undefined;
  }

  private connect(): void {
    const addresses = getContractAddresses(this.network);

    console.log(`🔌 Event listener connecting: ${this.wssUrl}`);
    const provider = new ethers.WebSocketProvider(this.wssUrl);
    this.provider = provider;

    // ethers' own onclose/reconnect handling is a no-op today (dead code in
    // the library itself), so we own reconnection: attach directly to the
    // underlying socket without touching the onopen/onmessage handlers
    // ethers already wired up on construction.
    const socket = provider.websocket as unknown as {
      onclose: ((...args: any[]) => any) | null;
      onerror: ((...args: any[]) => any) | null;
    };
    socket.onclose = () => {
      if (this.stopped) return;
      console.warn('⚠️  Event listener WebSocket closed — reconnecting (polling remains active as backstop)');
      this.scheduleReconnect();
    };
    socket.onerror = (err: any) => {
      console.error('❌ Event listener WebSocket error:', err?.message ?? err);
    };

    const registry = new ethers.Contract(addresses.ThreatRegistry, THREAT_REGISTRY_ABI, provider);
    const vault = new ethers.Contract(addresses.GuardianVault, GUARDIAN_VAULT_ABI, provider);

    registry.on(
      'ThreatReported',
      async (contractAddress: string, reporter: string, threatLevel: bigint, threatType: string) => {
        console.log(`📡 [event] ThreatReported: ${contractAddress} level=${threatLevel} type=${threatType}`);
        try {
          await this.messaging.sendAlert({
            type: 'threat_detected',
            tokenAddress: contractAddress,
            threatLevel: Number(threatLevel),
            message: `${threatType} reported by ${reporter}`,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error('event-listener: failed to send ThreatReported alert:', err);
        }
        // Trigger an immediate scan/protect cycle instead of waiting for the
        // next poll — reuses the existing scan → protect → alert pipeline,
        // so this may also produce a normal protection_executed alert.
        this.onThreatReported?.();
      }
    );

    vault.on(
      'TokensProtected',
      async (wallet: string, token: string, amount: bigint, threatLevel: bigint, event: any) => {
        const txHash = event?.log?.transactionHash;
        console.log(`📡 [event] TokensProtected: wallet=${wallet} token=${token} amount=${ethers.formatEther(amount)}`);
        try {
          await this.messaging.sendAlert({
            type: 'protection_executed',
            walletAddress: wallet,
            tokenAddress: token,
            threatLevel: Number(threatLevel),
            txHash,
            message: `Protected ${ethers.formatEther(amount)} tokens (real-time)`,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error('event-listener: failed to send TokensProtected alert:', err);
        }
      }
    );

    // Wrap (not replace) ethers' own onopen handler — it calls the internal
    // _start()/resume() that makes the provider actually usable.
    const originalOnOpen = (socket as any).onopen;
    (socket as any).onopen = async (...args: any[]) => {
      if (typeof originalOnOpen === 'function') await originalOnOpen(...args);
      this.reconnectAttempts = 0;
      console.log(`✅ Event listener connected (ThreatReported + TokensProtected)`);
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_DELAY_MS);
    this.reconnectAttempts++;
    console.log(`   Reconnecting in ${delay / 1000}s...`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

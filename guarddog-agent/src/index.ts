import 'dotenv/config';
import { BlockchainService } from './core/blockchain.js';
import { WalletMonitor } from './monitoring/wallet-monitor.js';
import { OpenClawMessaging } from './messaging/openclaw.js';
import { MoltbookService } from './messaging/moltbook.js';
import { createServer } from './api/server.js';
import { ethers } from 'ethers';

export class GuardDogAgent {
  private blockchain: BlockchainService;
  private monitor: WalletMonitor;
  private messaging: OpenClawMessaging;
  private moltbook: MoltbookService;
  private monitorInterval: number;
  private isRunning: boolean = false;
  private intervalHandle?: NodeJS.Timeout;
  private startTime: number;
  private eventUnsubscribes: Array<() => void> = [];
  private pendingScans: Map<string, NodeJS.Timeout> = new Map();
  private readonly REACTIVE_SCAN_DEBOUNCE_MS = 3000;

  constructor() {
    this.blockchain = new BlockchainService(
      process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      process.env.GUARDIAN_PRIVATE_KEY || '',
      (process.env.NETWORK as 'bscTestnet' | 'bscMainnet') || 'bscTestnet'
    );

    this.monitor = new WalletMonitor(
      this.blockchain,
      parseInt(process.env.THREAT_THRESHOLD || '75'),
      process.env.MAX_PROTECTION_AMOUNT || '1000'
    );

    this.messaging = new OpenClawMessaging(
      process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789',
      process.env.OPENCLAW_GATEWAY_TOKEN || '',
      {
        telegramEnabled: process.env.TELEGRAM_ENABLED === 'true',
        telegramChatId: process.env.TELEGRAM_CHAT_ID,
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
        whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
        whatsappPhone: process.env.WHATSAPP_PHONE,
      }
    );

    this.moltbook = new MoltbookService(
      process.env.MOLTBOOK_API_URL || 'https://api.moltbook.com',
      process.env.MOLTBOOK_API_KEY || '',
      process.env.MOLTBOOK_SUBMOLT || 'lablab',
      process.env.MOLTBOOK_ENABLED === 'true',
    );

    this.monitorInterval = parseInt(process.env.MONITOR_INTERVAL_MINUTES || '5') * 60 * 1000;
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    console.log('\n🐕 GuardDog Agent Initializing...\n');

    const guardianAddress = await this.blockchain.getGuardianAddress();
    console.log(`Guardian Address: ${guardianAddress}`);

    const isGuardian = await this.blockchain.verifyGuardianRole();
    if (!isGuardian) {
      throw new Error('❌ This wallet is not the authorized guardian for the GuardianVault contract!');
    }
    console.log('✅ Guardian role verified\n');

    const balance = await this.blockchain.getBalance();
    console.log(`Guardian Balance: ${ethers.formatEther(balance)} BNB`);

    if (balance < ethers.parseEther('0.01')) {
      console.warn('⚠️  WARNING: Guardian balance is low. Please fund for gas fees.\n');
    }

    console.log('🐕 GuardDog Agent Ready!\n');
  }

  addWallet(address: string, tokens: string[] = []): void {
    this.monitor.addWallet(address, tokens);
  }

  removeWallet(address: string): void {
    this.monitor.removeWallet(address);
  }

  async runScanCycle(): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🐕 GuardDog Scan Cycle Started`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const threats = await this.monitor.scanAllWallets();

      let totalThreats = 0;
      let totalProtections = 0;

      for (const [walletAddress, detections] of threats) {
        totalThreats += detections.length;
        console.log(`\n🚨 Processing ${detections.length} threats for wallet ${walletAddress}`);

        for (const detection of detections) {
          await this.messaging.sendAlert({
            type: 'threat_detected',
            walletAddress: detection.walletAddress,
            tokenAddress: detection.tokenAddress,
            threatLevel: detection.threatLevel,
            message: `Threat detected: ${detection.reason}`,
            timestamp: Date.now(),
          });

          await this.moltbook.postThreatDetection(
            detection.walletAddress,
            detection.tokenAddress,
            detection.threatLevel,
            detection.reason
          );
        }

        const protectableDetections = detections.filter(d => d.shouldProtect);

        if (protectableDetections.length > 0) {
          console.log(`\n🛡️  Executing batch protection for ${protectableDetections.length} tokens...`);

          const txHash = await this.monitor.batchExecuteProtection(walletAddress, protectableDetections);

          if (txHash) {
            totalProtections += protectableDetections.length;
            const totalAmount = protectableDetections.reduce((sum, d) => sum + d.balance, 0n);

            await this.messaging.sendAlert({
              type: 'protection_executed',
              walletAddress,
              txHash,
              message: `Protected ${protectableDetections.length} tokens (${ethers.formatEther(totalAmount)} total)`,
              timestamp: Date.now(),
            });

            await this.moltbook.postProtectionExecution(
              walletAddress,
              protectableDetections[0].tokenAddress,
              ethers.formatEther(totalAmount),
              txHash
            );
          }
        }
      }

      const stats = await this.monitor.getMonitoringStats();
      await this.moltbook.postScanComplete(stats.totalWallets, totalThreats);

      await this.messaging.sendAlert({
        type: 'scan_complete',
        message: `Scan complete: ${stats.totalWallets} wallets checked, ${totalThreats} threats found, ${totalProtections} protections executed`,
        timestamp: Date.now(),
      });

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Scan Cycle Complete`);
      console.log(`   Wallets Scanned: ${stats.totalWallets}`);
      console.log(`   Threats Found: ${totalThreats}`);
      console.log(`   Protections Executed: ${totalProtections}`);
      console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
      console.error('\n❌ Error during scan cycle:', error);

      await this.messaging.sendAlert({
        type: 'system_status',
        message: `Error during scan cycle: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      });
    }
  }

  private subscribeToRegistryEvents(): void {
    const onRegistered = (wallet: string, token: string) => {
      console.log(`📥 TokenRegistered: ${token} for wallet ${wallet}`);
      if (!this.monitor.getMonitoredWallets().includes(wallet)) {
        this.monitor.addWallet(wallet);
      }
      this.scheduleReactiveScan(wallet);
    };

    const onUnregistered = (wallet: string, token: string) => {
      console.log(`📤 TokenUnregistered: ${token} for wallet ${wallet}`);
      // No scan needed — the next cycle will simply not include this token.
    };

    this.eventUnsubscribes.push(this.blockchain.onTokenRegistered(onRegistered));
    this.eventUnsubscribes.push(this.blockchain.onTokenUnregistered(onUnregistered));
    console.log('🎧 Subscribed to TokenRegistered / TokenUnregistered events');
  }

  private scheduleReactiveScan(walletAddress: string): void {
    const existing = this.pendingScans.get(walletAddress);
    if (existing) clearTimeout(existing);

    const handle = setTimeout(async () => {
      this.pendingScans.delete(walletAddress);
      try {
        console.log(`\n⚡ Reactive scan for ${walletAddress}`);
        const detections = await this.monitor.scanWallet(walletAddress);
        const protectable = detections.filter(d => d.shouldProtect);
        if (protectable.length > 0) {
          const txHash = await this.monitor.batchExecuteProtection(walletAddress, protectable);
          if (txHash) {
            const totalAmount = protectable.reduce((sum, d) => sum + d.balance, 0n);
            await this.messaging.sendAlert({
              type: 'protection_executed',
              walletAddress,
              txHash,
              message: `Reactive protection: ${protectable.length} token(s), ${ethers.formatEther(totalAmount)} total`,
              timestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        console.error(`Reactive scan failed for ${walletAddress}:`, err);
      }
    }, this.REACTIVE_SCAN_DEBOUNCE_MS);

    this.pendingScans.set(walletAddress, handle);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Agent is already running');
      return;
    }

    console.log(`\n🚀 Starting autonomous monitoring (interval: ${this.monitorInterval / 60000} minutes)...\n`);
    this.isRunning = true;

    this.subscribeToRegistryEvents();

    await this.runScanCycle();

    this.intervalHandle = setInterval(async () => {
      await this.runScanCycle();
    }, this.monitorInterval);

    // Post system status every 6 hours
    setInterval(async () => {
      const stats = await this.monitor.getMonitoringStats();
      await this.moltbook.postSystemStatus(
        stats.totalWallets,
        'TBD',
        this.getUptime()
      );
    }, 6 * 60 * 60 * 1000);
  }

  stop(): void {
    if (!this.isRunning) return;
    console.log('\n🛑 Stopping autonomous monitoring...\n');
    if (this.intervalHandle) clearInterval(this.intervalHandle);

    for (const unsub of this.eventUnsubscribes) unsub();
    this.eventUnsubscribes = [];

    for (const handle of this.pendingScans.values()) clearTimeout(handle);
    this.pendingScans.clear();

    this.isRunning = false;
    console.log('✅ Agent stopped\n');
  }

  getStatus(): {
    isRunning: boolean;
    uptime: string;
    monitoredWallets: string[];
  } {
    return {
      isRunning: this.isRunning,
      uptime: this.getUptime(),
      monitoredWallets: this.monitor.getMonitoredWallets(),
    };
  }

  private getUptime(): string {
    const uptimeMs = Date.now() - this.startTime;
    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}

// ── Main entry point ──────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new GuardDogAgent();

  // Boot HTTP API server first (so Render health checks pass immediately)
  createServer(agent);

  try {
    await agent.initialize();

    const wallets = (process.env.MONITORED_WALLETS || '').split(',').filter(Boolean);
    const seedTokens = (process.env.MONITORED_TOKENS || '').split(',').filter(Boolean);

    console.log(
      `🔍 Monitoring ${wallets.length} wallet(s); ` +
      `tokens are read from the on-chain registry per scan` +
      (seedTokens.length ? ` (+ ${seedTokens.length} env-seeded)` : '')
    );

    if (wallets.length > 0) {
      for (const wallet of wallets) {
        agent.addWallet(wallet.trim(), seedTokens.map(t => t.trim()));
      }
    } else {
      console.log('⚠️  No wallets in MONITORED_WALLETS — add via API or .env\n');
    }

    await agent.start();

    process.on('SIGINT',  () => { agent.stop(); process.exit(0); });
    process.on('SIGTERM', () => { agent.stop(); process.exit(0); });

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

export default GuardDogAgent;
import 'dotenv/config';
import { BlockchainService } from './core/blockchain.js';
import { WalletMonitor } from './monitoring/wallet-monitor.js';
import { OpenClawMessaging } from './messaging/openclaw.js';
import { MoltbookService } from './messaging/moltbook.js';
import { createServer } from './api/server.js';
import { mongoService } from './db/mongodb.js';
import { ethers } from 'ethers';
import type { NetworkKey } from './config/contracts.js';
import { getRpcUrl, getGuardianPrivateKey, getExpectedChainId, getNativeSymbol, getWssUrl } from './config/network.js';
import { ThreatEventListener } from './monitoring/event-listener.js';

export class GuardDogAgent {
  private blockchain: BlockchainService;
  private monitor: WalletMonitor;
  private messaging: OpenClawMessaging;
  private moltbook: MoltbookService;
  private monitorInterval: number;
  private isRunning: boolean = false;
  private intervalHandle?: NodeJS.Timeout;
  private startTime: number;
  private network: NetworkKey;
  private eventListener?: ThreatEventListener;

  constructor() {
    this.network = (process.env.NETWORK as NetworkKey) || 'bscTestnet';
    const rpcUrl = getRpcUrl(this.network);

    this.blockchain = new BlockchainService(
      rpcUrl,
      getGuardianPrivateKey(this.network),
      this.network
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

    const wssUrl = getWssUrl(this.network);
    if (wssUrl) {
      this.eventListener = new ThreatEventListener(wssUrl, this.network, this.messaging, () =>
        this.runScanCycle()
      );
    }
  }

  async initialize(): Promise<void> {
    console.log('\n🐕 GuardDog Agent Initializing...\n');

    // ── MongoDB ──────────────────────────────────────────────────────
    await mongoService.connect();

    const expectedChainId = getExpectedChainId(this.network);
    const actualChainId = await this.blockchain.getChainId();
    if (actualChainId !== expectedChainId) {
      throw new Error(
        `❌ ChainId mismatch: NETWORK="${this.network}" expects chainId ${expectedChainId} but the RPC returned ${actualChainId}. Check your RPC URL configuration.`
      );
    }

    const guardianAddress = await this.blockchain.getGuardianAddress();
    console.log(`Guardian Address: ${guardianAddress}`);

    const isGuardian = await this.blockchain.verifyGuardianRole();
    if (!isGuardian) {
      throw new Error('❌ This wallet is not the authorized guardian for the GuardianVault contract!');
    }
    console.log('✅ Guardian role verified\n');

    const balance = await this.blockchain.getBalance();
    const nativeSymbol = getNativeSymbol(this.network);
    console.log(`Guardian Balance: ${ethers.formatEther(balance)} ${nativeSymbol}`);
    if (balance < ethers.parseEther('0.01')) {
      console.warn(`⚠️  WARNING: Guardian balance is low. Please fund with ${nativeSymbol} for gas fees.\n`);
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
          // Persist to MongoDB
          await mongoService.saveThreatDetection({
            walletAddress: detection.walletAddress,
            tokenAddress: detection.tokenAddress,
            threatLevel: detection.threatLevel,
            reason: detection.reason,
            threatSource: detection.threatSource || 'community',
            oklinkLevel: detection.oklinkLevel ?? null,
            oklinkCategories: detection.oklinkCategories ?? [],
            network: process.env.NETWORK || 'bscTestnet',
            protected: detection.shouldProtect,
            txHash: null,
          });

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
            const amountStr = ethers.formatEther(totalAmount);

            // Persist protection events to MongoDB
            for (const d of protectableDetections) {
              await mongoService.saveProtectionEvent({
                walletAddress: walletAddress,
                tokenAddress: d.tokenAddress,
                amount: ethers.formatEther(d.balance),
                threatLevel: d.threatLevel,
                txHash,
                network: process.env.NETWORK || 'bscTestnet',
                reason: d.reason,
              });
            }

            await this.messaging.sendAlert({
              type: 'protection_executed',
              walletAddress,
              txHash,
              message: `Protected ${protectableDetections.length} tokens (${amountStr} total)`,
              timestamp: Date.now(),
            });

            await this.moltbook.postProtectionExecution(
              walletAddress,
              protectableDetections[0].tokenAddress,
              amountStr,
              txHash
            );
          }
        }
      }

      const stats = await this.monitor.getMonitoringStats();

      // Persist scan cycle to MongoDB
      await mongoService.saveScanCycle({
        walletsScanned: stats.totalWallets,
        threatsFound: totalThreats,
        protectionsExecuted: totalProtections,
        network: process.env.NETWORK || 'bscTestnet',
        uptime: this.getUptime(),
      });

      await this.moltbook.postScanComplete(stats.totalWallets, totalThreats);
      await this.messaging.sendAlert({
        type: 'scan_complete',
        message: `Scan complete: ${stats.totalWallets} wallets checked, ${totalThreats} threats found, ${totalProtections} protections executed`,
        timestamp: Date.now(),
      });

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Scan Cycle Complete`);
      console.log(`   Wallets Scanned:      ${stats.totalWallets}`);
      console.log(`   Threats Found:        ${totalThreats}`);
      console.log(`   Protections Executed: ${totalProtections}`);
      console.log(`   MongoDB:              ${mongoService.isConnected() ? '✅ persisted' : '⚠️  offline'}`);
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

  async start(): Promise<void> {
    if (this.isRunning) { console.log('⚠️  Agent is already running'); return; }
    console.log(`\n🚀 Starting autonomous monitoring (interval: ${this.monitorInterval / 60000} minutes)...\n`);
    this.isRunning = true;

    await this.runScanCycle();

    this.intervalHandle = setInterval(async () => {
      await this.runScanCycle();
    }, this.monitorInterval);

    if (this.eventListener) {
      this.eventListener.start();
    } else {
      console.log('ℹ️  No WSS endpoint for this network — running on polling only.');
    }

    // Post system status every 6 hours
    setInterval(async () => {
      const stats = await this.monitor.getMonitoringStats();
      const dbStats = await mongoService.getStats();
      await this.moltbook.postSystemStatus(
        stats.totalWallets,
        `${dbStats.totalProtections} protections recorded`,
        this.getUptime()
      );
    }, 6 * 60 * 60 * 1000);
  }

  stop(): void {
    if (!this.isRunning) return;
    console.log('\n🛑 Stopping autonomous monitoring...\n');
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.eventListener?.stop();
    this.isRunning = false;
    mongoService.disconnect();
    console.log('✅ Agent stopped\n');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.getUptime(),
      monitoredWallets: this.monitor.getMonitoredWallets(),
      mongoConnected: mongoService.isConnected(),
    };
  }

  private getUptime(): string {
    const ms = Date.now() - this.startTime;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}

// ── Main entry point ──────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new GuardDogAgent();
  createServer(agent);

  try {
    await agent.initialize();

    const wallets = (process.env.MONITORED_WALLETS || '').split(',').filter(Boolean);
    const tokens = (process.env.MONITORED_TOKENS || '').split(',').filter(Boolean);
    console.log(`🔍 Monitoring ${wallets.length} wallet(s) with ${tokens.length} token(s)`);

    if (wallets.length > 0) {
      for (const wallet of wallets) {
        agent.addWallet(wallet.trim(), tokens.map(t => t.trim()));
      }
    } else {
      console.log('⚠️  No wallets in MONITORED_WALLETS — add via API or .env\n');
    }

    await agent.start();
    process.on('SIGINT', () => { agent.stop(); process.exit(0); });
    process.on('SIGTERM', () => { agent.stop(); process.exit(0); });

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

export default GuardDogAgent;
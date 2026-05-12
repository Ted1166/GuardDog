import { BlockchainService } from '../core/blockchain.js';
import { ethers } from 'ethers';

export interface MonitoredWallet {
  address: string;
  /** Tokens seeded from env/API. Unioned with on-chain registered tokens at scan time. */
  tokens: string[];
  lastScanTime: number;
}

export interface ThreatDetection {
  walletAddress: string;
  tokenAddress: string;
  threatLevel: number;
  reason: string;
  shouldProtect: boolean;
  balance: bigint;
}

export class WalletMonitor {
  private blockchain: BlockchainService;
  private monitoredWallets: Map<string, MonitoredWallet> = new Map();
  private threatThreshold: number;
  private maxProtectionAmount: bigint;

  constructor(
    blockchain: BlockchainService,
    threatThreshold: number = 75,
    maxProtectionAmount: string = '1000'
  ) {
    this.blockchain = blockchain;
    this.threatThreshold = threatThreshold;
    this.maxProtectionAmount = ethers.parseEther(maxProtectionAmount);
  }

  addWallet(address: string, tokens: string[] = []): void {
    this.monitoredWallets.set(address.toLowerCase(), {
      address: address.toLowerCase(),
      tokens,
      lastScanTime: 0,
    });
    console.log(`📋 Added wallet ${address} to monitoring list`);
  }

  removeWallet(address: string): void {
    this.monitoredWallets.delete(address.toLowerCase());
    console.log(`🗑️  Removed wallet ${address} from monitoring list`);
  }

  getMonitoredWallets(): string[] {
    return Array.from(this.monitoredWallets.keys());
  }

  async scanWallet(walletAddress: string): Promise<ThreatDetection[]> {
    console.log(`\n🔍 Scanning wallet: ${walletAddress}`);
    
    const isProtected = await this.blockchain.isWalletProtected(walletAddress);
    
    if (!isProtected) {
      console.log(`⚠️  Wallet ${walletAddress} is not protected. Skipping scan.`);
      return [];
    }

    const wallet = this.monitoredWallets.get(walletAddress.toLowerCase());
    if (!wallet) {
      console.log(`⚠️  Wallet ${walletAddress} not in monitoring list`);
      return [];
    }

    const onchainTokens = await this.blockchain.getRegisteredTokens(walletAddress);
    const tokensToScan = Array.from(
      new Set([...wallet.tokens.map(t => t.toLowerCase()), ...onchainTokens])
    );

    if (tokensToScan.length === 0) {
      console.log(`ℹ️  No registered tokens for ${walletAddress}. Skipping.`);
      return [];
    }

    console.log(`   Scanning ${tokensToScan.length} token(s) (${onchainTokens.length} on-chain)`);

    const detections: ThreatDetection[] = [];

    for (const tokenAddress of tokensToScan) {
      try {
        const threatScore = await this.blockchain.getThreatScore(tokenAddress);
        const isVerified = await this.blockchain.isVerifiedThreat(tokenAddress);

        if (threatScore >= this.threatThreshold || isVerified) {
          const balance = await this.blockchain.getTokenBalance(walletAddress, tokenAddress);
          
          if (balance > 0n) {
            const reports = await this.blockchain.getThreatReports(tokenAddress);
            const latestReport = reports.length > 0 ? reports[reports.length - 1] : null;
            
            const reason = latestReport 
              ? `${latestReport.threatType}: ${latestReport.evidence.substring(0, 100)}`
              : `Threat score: ${threatScore}`;

            const shouldProtect = balance <= this.maxProtectionAmount;

            detections.push({
              walletAddress,
              tokenAddress,
              threatLevel: Math.max(Number(threatScore), Number(latestReport?.threatLevel || 0)),
              reason,
              shouldProtect,
              balance,
            });

            console.log(`🚨 THREAT DETECTED!`);
            console.log(`   Token: ${tokenAddress}`);
            console.log(`   Threat Level: ${threatScore}`);
            console.log(`   Verified: ${isVerified}`);
            console.log(`   Balance: ${ethers.formatEther(balance)}`);
            console.log(`   Action: ${shouldProtect ? 'PROTECT' : 'SKIP (exceeds max)'}`);
          }
        }
      } catch (error) {
        console.error(`Error scanning token ${tokenAddress}:`, error);
      }
    }

    // Update last scan time
    const walletData = this.monitoredWallets.get(walletAddress.toLowerCase());
    if (walletData) {
      walletData.lastScanTime = Date.now();
    }

    return detections;
  }

  async scanAllWallets(): Promise<Map<string, ThreatDetection[]>> {
    console.log(`\n🔍 Starting scan of ${this.monitoredWallets.size} wallets...`);
    
    const results = new Map<string, ThreatDetection[]>();

    for (const [address] of this.monitoredWallets) {
      try {
        const detections = await this.scanWallet(address);
        if (detections.length > 0) {
          results.set(address, detections);
        }
      } catch (error) {
        console.error(`Error scanning wallet ${address}:`, error);
      }
    }

    console.log(`\n✅ Scan complete. Found ${results.size} wallets with threats.`);
    return results;
  }

  async executeProtection(detection: ThreatDetection): Promise<string | null> {
    if (!detection.shouldProtect) {
      console.log(`⏭️  Skipping protection (balance exceeds max protection amount)`);
      return null;
    }

    try {
      const txHash = await this.blockchain.protectTokens(
        detection.walletAddress,
        detection.tokenAddress,
        detection.balance,
        detection.reason
      );

      return txHash;
    } catch (error: any) {
      console.error(`Failed to execute protection:`, error);
      return null;
    }
  }

  async batchExecuteProtection(walletAddress: string, detections: ThreatDetection[]): Promise<string | null> {
    const protectableDetections = detections.filter(d => d.shouldProtect);

    if (protectableDetections.length === 0) {
      console.log(`⏭️  No tokens to protect for wallet ${walletAddress}`);
      return null;
    }

    try {
      const tokens = protectableDetections.map(d => ({
        address: d.tokenAddress,
        amount: d.balance,
        reason: d.reason,
      }));

      const txHash = await this.blockchain.batchProtectTokens(walletAddress, tokens);
      return txHash;
    } catch (error: any) {
      console.error(`Failed to batch execute protection:`, error);
      return null;
    }
  }

  async getMonitoringStats(): Promise<{
    totalWallets: number;
    protectedWallets: number;
    lastScanTimes: Map<string, number>;
  }> {
    let protectedCount = 0;
    const lastScanTimes = new Map<string, number>();

    for (const [address, wallet] of this.monitoredWallets) {
      const isProtected = await this.blockchain.isWalletProtected(address);
      if (isProtected) protectedCount++;
      lastScanTimes.set(address, wallet.lastScanTime);
    }

    return {
      totalWallets: this.monitoredWallets.size,
      protectedWallets: protectedCount,
      lastScanTimes,
    };
  }
}
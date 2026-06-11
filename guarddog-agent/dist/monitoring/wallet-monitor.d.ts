import { BlockchainService } from '../core/blockchain.js';
export interface MonitoredWallet {
    address: string;
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
    threatSource: 'community' | 'oklink' | 'both' | 'verified';
    oklinkLevel?: string | null;
    oklinkCategories?: string[];
}
export declare class WalletMonitor {
    private blockchain;
    private monitoredWallets;
    private threatThreshold;
    private maxProtectionAmount;
    constructor(blockchain: BlockchainService, threatThreshold?: number, maxProtectionAmount?: string);
    addWallet(address: string, tokens?: string[]): void;
    removeWallet(address: string): void;
    getMonitoredWallets(): string[];
    scanWallet(walletAddress: string): Promise<ThreatDetection[]>;
    scanAllWallets(): Promise<Map<string, ThreatDetection[]>>;
    executeProtection(detection: ThreatDetection): Promise<string | null>;
    batchExecuteProtection(walletAddress: string, detections: ThreatDetection[]): Promise<string | null>;
    getMonitoringStats(): Promise<{
        totalWallets: number;
        protectedWallets: number;
        lastScanTimes: Map<string, number>;
    }>;
}
//# sourceMappingURL=wallet-monitor.d.ts.map
export interface ScanCycleDoc {
    timestamp: Date;
    walletsScanned: number;
    threatsFound: number;
    protectionsExecuted: number;
    network: string;
    uptime: string;
}
export interface ThreatDetectionDoc {
    timestamp: Date;
    walletAddress: string;
    tokenAddress: string;
    threatLevel: number;
    reason: string;
    threatSource: string;
    oklinkLevel: string | null;
    oklinkCategories: string[];
    network: string;
    protected: boolean;
    txHash: string | null;
}
export interface ProtectionEventDoc {
    timestamp: Date;
    walletAddress: string;
    tokenAddress: string;
    amount: string;
    threatLevel: number;
    txHash: string;
    network: string;
    reason: string;
}
export interface WalletStatsDoc {
    walletAddress: string;
    lastScan: Date;
    totalThreatsFound: number;
    totalProtections: number;
    isProtected: boolean;
    network: string;
}
export declare class MongoDBService {
    private client;
    private db;
    private enabled;
    private scanCycles;
    private threats;
    private protections;
    private walletStats;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    saveScanCycle(data: {
        walletsScanned: number;
        threatsFound: number;
        protectionsExecuted: number;
        network: string;
        uptime: string;
    }): Promise<void>;
    saveThreatDetection(data: {
        walletAddress: string;
        tokenAddress: string;
        threatLevel: number;
        reason: string;
        threatSource: string;
        oklinkLevel: string | null;
        oklinkCategories: string[];
        network: string;
        protected: boolean;
        txHash: string | null;
    }): Promise<void>;
    saveProtectionEvent(data: {
        walletAddress: string;
        tokenAddress: string;
        amount: string;
        threatLevel: number;
        txHash: string;
        network: string;
        reason: string;
    }): Promise<void>;
    private updateWalletStats;
    getRecentThreats(limit?: number): Promise<ThreatDetectionDoc[]>;
    getWalletThreats(walletAddress: string, limit?: number): Promise<ThreatDetectionDoc[]>;
    getRecentProtections(limit?: number): Promise<ProtectionEventDoc[]>;
    getScanHistory(limit?: number): Promise<ScanCycleDoc[]>;
    getStats(): Promise<{
        totalScans: number;
        totalThreats: number;
        totalProtections: number;
        walletsMonitored: number;
    }>;
    isConnected(): boolean;
}
export declare const mongoService: MongoDBService;
//# sourceMappingURL=mongodb.d.ts.map
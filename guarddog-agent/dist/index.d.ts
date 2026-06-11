import 'dotenv/config';
export declare class GuardDogAgent {
    private blockchain;
    private monitor;
    private messaging;
    private moltbook;
    private monitorInterval;
    private isRunning;
    private intervalHandle?;
    private startTime;
    constructor();
    initialize(): Promise<void>;
    addWallet(address: string, tokens?: string[]): void;
    removeWallet(address: string): void;
    runScanCycle(): Promise<void>;
    start(): Promise<void>;
    stop(): void;
    getStatus(): {
        isRunning: boolean;
        uptime: string;
        monitoredWallets: string[];
        mongoConnected: boolean;
    };
    private getUptime;
}
export default GuardDogAgent;
//# sourceMappingURL=index.d.ts.map
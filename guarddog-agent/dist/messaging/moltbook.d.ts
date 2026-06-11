export interface MoltbookPost {
    content: string;
    metadata?: {
        walletAddress?: string;
        tokenAddress?: string;
        threatLevel?: number;
        txHash?: string;
        action?: string;
    };
}
export declare class MoltbookService {
    private apiUrl;
    private apiKey;
    private submolt;
    private enabled;
    constructor(apiUrl: string, apiKey: string, submolt?: string, enabled?: boolean);
    postActivity(post: MoltbookPost): Promise<void>;
    private solveVerification;
    private parseMathChallenge;
    private formatPost;
    postThreatDetection(walletAddress: string, tokenAddress: string, threatLevel: number, reason: string): Promise<void>;
    postProtectionExecution(walletAddress: string, tokenAddress: string, amount: string, txHash: string): Promise<void>;
    postScanComplete(walletsScanned: number, threatsFound: number): Promise<void>;
    postSystemStatus(walletsMonitored: number, totalProtectedValue: string, uptime: string): Promise<void>;
    postHackathonUpdate(milestone: string, details?: string): Promise<void>;
}
//# sourceMappingURL=moltbook.d.ts.map
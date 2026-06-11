export interface ThreatReport {
    reporter: string;
    timestamp: bigint;
    threatLevel: number;
    threatType: string;
    evidence: string;
    verified: boolean;
    upvotes: bigint;
}
export interface ProtectedWallet {
    address: string;
    isProtected: boolean;
    protectionStartTime?: bigint;
}
export declare class BlockchainService {
    private provider;
    private guardianWallet;
    private vaultContract;
    private registryContract;
    private network;
    constructor(rpcUrl: string, guardianPrivateKey: string, network?: 'bscTestnet' | 'bscMainnet');
    getGuardianAddress(): Promise<string>;
    verifyGuardianRole(): Promise<boolean>;
    isWalletProtected(walletAddress: string): Promise<boolean>;
    getTokenBalance(walletAddress: string, tokenAddress: string): Promise<bigint>;
    getThreatScore(contractAddress: string): Promise<number>;
    isVerifiedThreat(contractAddress: string): Promise<boolean>;
    getThreatReports(contractAddress: string): Promise<ThreatReport[]>;
    protectTokens(walletAddress: string, tokenAddress: string, amount: bigint, threatLevel: number, reason: string): Promise<string>;
    batchProtectTokens(walletAddress: string, tokens: Array<{
        address: string;
        amount: bigint;
        threatLevel: number;
        reason: string;
    }>): Promise<string>;
    getProtectedBalance(walletAddress: string, tokenAddress: string): Promise<bigint>;
    getGasPrice(): Promise<bigint>;
    getBalance(): Promise<bigint>;
}
//# sourceMappingURL=blockchain.d.ts.map
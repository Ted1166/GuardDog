export const GUARDIAN_VAULT_ABI = [
    "function isWalletProtected(address wallet) external view returns (bool)",
    "function getProtectedBalance(address wallet, address token) external view returns (uint256)",
    "function protectTokens(address wallet, address token, uint256 amount, uint8 threatLevel, string calldata reason) external",
    "function batchProtectTokens(address wallet, address[] calldata tokens, uint256[] calldata amounts, uint8[] calldata threatLevels, string[] calldata reasons) external",
    "function guardian() external view returns (address)",
    "event ThreatDetected(address indexed token, address indexed spender, uint8 threatLevel, string reason)",
    "event TokensProtected(address indexed wallet, address indexed token, uint256 amount, uint8 threatLevel)"
];
export const THREAT_REGISTRY_ABI = [
    "function threats(address, uint256) external view returns (address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes)",
    "function getReportCount(address contractAddress) external view returns (uint256)",
    "function getAllReports(address contractAddress) external view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes)[])",
    "function getAggregateThreatScore(address contractAddress) external view returns (uint8)",
    "function isVerifiedThreat(address contractAddress) external view returns (bool)",
    "function getThreatStats(address contractAddress) external view returns (uint256 totalReports, uint256 verifiedReports, uint8 avgThreatLevel, uint256 totalUpvotes)",
    "event ThreatReported(address indexed contractAddress, address indexed reporter, uint8 threatLevel, string threatType)"
];
export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];
export function getContractAddresses(network) {
    // These will be set from environment variables after deployment
    return {
        GuardianVault: process.env.GUARDIAN_VAULT_ADDRESS || '',
        ThreatRegistry: process.env.THREAT_REGISTRY_ADDRESS || '',
    };
}
//# sourceMappingURL=contracts.js.map
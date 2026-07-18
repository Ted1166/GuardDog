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

export interface ContractAddresses {
  GuardianVault: string;
  ThreatRegistry: string;
}

export type NetworkKey = 'bscTestnet' | 'bscMainnet' | 'botchainTestnet' | 'botchainMainnet';

export function getContractAddresses(network: NetworkKey): ContractAddresses {
  switch (network) {
    case 'botchainTestnet':
      return {
        GuardianVault: process.env.BOTCHAIN_GUARDIAN_VAULT || '0xEF650672437A97A7b987984239064D502F56272d',
        ThreatRegistry: process.env.BOTCHAIN_THREAT_REGISTRY || '0x2D101FaFb24C660Bfef07fd3106Caf1074C80bF7',
      };
    case 'botchainMainnet':
      return {
        GuardianVault: process.env.BOTCHAIN_MAINNET_GUARDIAN_VAULT || '',
        ThreatRegistry: process.env.BOTCHAIN_MAINNET_THREAT_REGISTRY || '',
      };
    case 'bscMainnet':
      return {
        GuardianVault: process.env.BSC_MAINNET_GUARDIAN_VAULT || '',
        ThreatRegistry: process.env.BSC_MAINNET_THREAT_REGISTRY || '',
      };
    default: // bscTestnet
      return {
        GuardianVault: process.env.GUARDIAN_VAULT_ADDRESS || '0x02A8AdD3ECAE73Adb908048E70A9fe18156B3785',
        ThreatRegistry: process.env.THREAT_REGISTRY_ADDRESS || '0x8de977504d2bfF46ecfD153B10cdb9F22715F988',
      };
  }
}
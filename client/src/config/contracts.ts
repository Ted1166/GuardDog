export const CONTRACT_ADDRESSES = {
  bscTestnet: {
    GuardianVault: '0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9',
    ThreatRegistry: '0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9',
  },
  // Add mainnet addresses when deployed
  bscMainnet: {
    GuardianVault: '',
    ThreatRegistry: '',
  },
} as const;

// Network configuration
export const NETWORKS = {
  bscTestnet: {
    chainId: '0x61', // 97 in hex
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
  bscMainnet: {
    chainId: '0x38', // 56 in hex
    chainName: 'BNB Smart Chain',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
  },
} as const;

// Default network
export const DEFAULT_NETWORK = 'bscTestnet';

// GuardianVault ABI (only essential functions)
export const GUARDIAN_VAULT_ABI = [
  // Read functions
  'function isProtected(address wallet) view returns (bool)',
  'function protectionStartTime(address wallet) view returns (uint256)',
  'function protectedBalances(address wallet, address token) view returns (uint256)',
  'function guardian() view returns (address)',
  'function isWalletProtected(address wallet) view returns (bool)',
  'function getProtectionDuration(address wallet) view returns (uint256)',
  'function getProtectedBalance(address wallet, address token) view returns (uint256)',
  
  // Write functions
  'function enableProtection()',
  'function disableProtection()',
  'function withdraw(address token, uint256 amount)',
  'function withdrawAll(address token)',
  
  // Events
  'event ProtectionEnabled(address indexed wallet, uint256 timestamp)',
  'event ProtectionDisabled(address indexed wallet, uint256 timestamp)',
  'event TokensProtected(address indexed wallet, address indexed token, uint256 amount, uint8 threatLevel)',
  'event TokensWithdrawn(address indexed wallet, address indexed token, uint256 amount)',
] as const;

// ThreatRegistry ABI (only essential functions)
export const THREAT_REGISTRY_ABI = [
  // Read functions
  'function threats(address contractAddress, uint256 index) view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes))',
  'function isVerifiedThreat(address contractAddress) view returns (bool)',
  'function getReportCount(address contractAddress) view returns (uint256)',
  'function getAllReports(address contractAddress) view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes)[])',
  'function getAggregateThreatScore(address contractAddress) view returns (uint8)',
  'function getThreatStats(address contractAddress) view returns (uint256 totalReports, uint256 verifiedReports, uint8 avgThreatLevel, uint256 totalUpvotes)',
  
  // Write functions
  'function reportThreat(address contractAddress, uint8 threatLevel, string calldata threatType, string calldata evidence)',
  'function upvoteReport(address contractAddress, uint256 reportIndex)',
  
  // Events
  'event ThreatReported(address indexed contractAddress, address indexed reporter, uint8 threatLevel, string threatType)',
  'event ReportUpvoted(address indexed contractAddress, uint256 reportIndex, address indexed voter)',
  'event ThreatVerified(address indexed contractAddress, uint256 reportIndex, bool verified)',
] as const;

// Helper to get contract address for current network
export function getContractAddress(
  contractName: 'GuardianVault' | 'ThreatRegistry',
  network: keyof typeof CONTRACT_ADDRESSES = DEFAULT_NETWORK
): string {
  const address = CONTRACT_ADDRESSES[network][contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not deployed on ${network}`);
  }
  return address;
}

// Helper to get network config
export function getNetworkConfig(network: keyof typeof NETWORKS) {
  return NETWORKS[network];
}

// BSCScan URLs
export const BLOCK_EXPLORER = {
  bscTestnet: 'https://testnet.bscscan.com',
  bscMainnet: 'https://bscscan.com',
} as const;

export function getExplorerUrl(
  network: keyof typeof BLOCK_EXPLORER,
  type: 'tx' | 'address' | 'token',
  value: string
): string {
  const base = BLOCK_EXPLORER[network];
  switch (type) {
    case 'tx':
      return `${base}/tx/${value}`;
    case 'address':
      return `${base}/address/${value}`;
    case 'token':
      return `${base}/token/${value}`;
    default:
      return base;
  }
}
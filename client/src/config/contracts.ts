// ── Contract Addresses ───────────────────────────────────────────
export const CONTRACT_ADDRESSES = {
  // BNB Chain Testnet
  bscTestnet: {
    GuardianVault:  '0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9',
    ThreatRegistry: '0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9',
  },
  // BNB Chain Mainnet
  bscMainnet: {
    GuardianVault:  '',
    ThreatRegistry: '',
  },
  // opBNB Testnet (deploying)
  opBNBTestnet: {
    GuardianVault:  '',
    ThreatRegistry: '',
  },
  // opBNB Mainnet
  opBNBMainnet: {
    GuardianVault:  '',
    ThreatRegistry: '',
  },
  // Base Sepolia Testnet (deploying )
  baseSepolia: {
    GuardianVault:  '0xEF650672437A97A7b987984239064D502F56272d',
    ThreatRegistry: '0x2D101FaFb24C660Bfef07fd3106Caf1074C80bF7',
  },
  // Base Mainnet
  baseMainnet: {
    GuardianVault:  '',
    ThreatRegistry: '',
  },
  // Ethereum Sepolia Testnet (deploying)
  sepolia: {
    GuardianVault:  '0x9B05c7A71a02F39B18e979E4F84b784aFed3c284',
    ThreatRegistry: '0xf033A7Ff995a2A87C2ba4748bfF7626D6482Da64',
  },
} as const;

// ── Network Configuration ─────────────────────────────────────────
export const NETWORKS = {
  bscTestnet: {
    chainId: '0x61',
    chainName: 'BSC Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
  bscMainnet: {
    chainId: '0x38',        // 56
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  opBNBTestnet: {
    chainId: '0x15EB',      // 5611
    chainName: 'opBNB Testnet',
    nativeCurrency: { name: 'BNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://opbnb-testnet-rpc.bnbchain.org'],
    blockExplorerUrls: ['https://testnet.opbnbscan.com'],
  },
  opBNBMainnet: {
    chainId: '0xCC',        // 204
    chainName: 'opBNB Mainnet',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://opbnb-mainnet-rpc.bnbchain.org'],
    blockExplorerUrls: ['https://opbnbscan.com'],
  },
  baseSepolia: {
    chainId: '0x14A34',     // 84532
    chainName: 'Base Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
  },
  baseMainnet: {
    chainId: '0x2105',      // 8453
    chainName: 'Base',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  sepolia: {
    chainId: '0xAA36A7',    // 11155111
    chainName: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
} as const;

export type NetworkKey = keyof typeof NETWORKS;
export const DEFAULT_NETWORK: NetworkKey = 'bscTestnet';

// Chain ID → network key map (for auto-detection from MetaMask)
export const CHAIN_ID_TO_NETWORK: Record<string, NetworkKey> = {
  '97':       'bscTestnet',
  '56':       'bscMainnet',
  '5611':     'opBNBTestnet',
  '204':      'opBNBMainnet',
  '84532':    'baseSepolia',
  '8453':     'baseMainnet',
  '11155111': 'sepolia',
};

// ── ABIs ──────────────────────────────────────────────────────────
export const GUARDIAN_VAULT_ABI = [
  'function isProtected(address wallet) view returns (bool)',
  'function protectionStartTime(address wallet) view returns (uint256)',
  'function protectedBalances(address wallet, address token) view returns (uint256)',
  'function guardian() view returns (address)',
  'function isWalletProtected(address wallet) view returns (bool)',
  'function getProtectionDuration(address wallet) view returns (uint256)',
  'function getProtectedBalance(address wallet, address token) view returns (uint256)',
  'function enableProtection()',
  'function disableProtection()',
  'function withdraw(address token, uint256 amount)',
  'function withdrawAll(address token)',
  'event ProtectionEnabled(address indexed wallet, uint256 timestamp)',
  'event ProtectionDisabled(address indexed wallet, uint256 timestamp)',
  'event TokensProtected(address indexed wallet, address indexed token, uint256 amount, uint8 threatLevel)',
  'event TokensWithdrawn(address indexed wallet, address indexed token, uint256 amount)',
] as const;

export const THREAT_REGISTRY_ABI = [
  'function threats(address contractAddress, uint256 index) view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes))',
  'function isVerifiedThreat(address contractAddress) view returns (bool)',
  'function getReportCount(address contractAddress) view returns (uint256)',
  'function getAllReports(address contractAddress) view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes)[])',
  'function getAggregateThreatScore(address contractAddress) view returns (uint8)',
  'function getThreatStats(address contractAddress) view returns (uint256 totalReports, uint256 verifiedReports, uint8 avgThreatLevel, uint256 totalUpvotes)',
  'function reportThreat(address contractAddress, uint8 threatLevel, string calldata threatType, string calldata evidence)',
  'function upvoteReport(address contractAddress, uint256 reportIndex)',
  'event ThreatReported(address indexed contractAddress, address indexed reporter, uint8 threatLevel, string threatType)',
  'event ReportUpvoted(address indexed contractAddress, uint256 reportIndex, address indexed voter)',
  'event ThreatVerified(address indexed contractAddress, uint256 reportIndex, bool verified)',
] as const;

// ── Helpers ───────────────────────────────────────────────────────
export function getContractAddress(
  contractName: 'GuardianVault' | 'ThreatRegistry',
  network: NetworkKey = DEFAULT_NETWORK
): string {
  const address = CONTRACT_ADDRESSES[network][contractName];
  if (!address) {
    throw new Error(`${contractName} not yet deployed on ${network}`);
  }
  return address;
}

export function getNetworkConfig(network: NetworkKey) {
  return NETWORKS[network];
}

export function getNetworkFromChainId(chainId: number | string): NetworkKey {
  return CHAIN_ID_TO_NETWORK[String(chainId)] || DEFAULT_NETWORK;
}

export const BLOCK_EXPLORER = {
  bscTestnet:  'https://testnet.bscscan.com',
  bscMainnet:  'https://bscscan.com',
  opBNBTestnet:'https://testnet.opbnbscan.com',
  opBNBMainnet:'https://opbnbscan.com',
  baseSepolia: 'https://sepolia.basescan.org',
  baseMainnet: 'https://basescan.org',
  sepolia:     'https://sepolia.etherscan.io',
} as const;

export function getExplorerUrl(
  network: keyof typeof BLOCK_EXPLORER,
  type: 'tx' | 'address' | 'token',
  value: string
): string {
  const base = BLOCK_EXPLORER[network];
  switch (type) {
    case 'tx':      return `${base}/tx/${value}`;
    case 'address': return `${base}/address/${value}`;
    case 'token':   return `${base}/token/${value}`;
    default:        return base;
  }
}
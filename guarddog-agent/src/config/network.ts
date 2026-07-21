import type { NetworkKey } from './contracts.js';

export function getRpcUrl(network: NetworkKey): string {
  switch (network) {
    case 'botchainTestnet':
      return process.env.BOTCHAIN_TESTNET_RPC_URL || 'https://rpc.bohr.life';
    case 'botchainMainnet':
      return process.env.BOTCHAIN_MAINNET_RPC_URL || 'https://rpc.botchain.ai';
    case 'bscMainnet':
      return process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed.binance.org';
    default: // bscTestnet
      return process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';
  }
}

export function getWssUrl(network: NetworkKey): string | undefined {
  switch (network) {
    case 'botchainTestnet':
      return process.env.BOTCHAIN_TESTNET_WSS_URL || 'wss://ws-rpc.bohr.life';
    case 'botchainMainnet':
      return process.env.BOTCHAIN_MAINNET_WSS_URL || 'wss://ws-rpc.botchain.ai';
    default:
      return undefined;
  }
}

// Mainnet intentionally does NOT fall back to GUARDIAN_PRIVATE_KEY — signing
// mainnet transactions with an unrelated testnet key would silently fail the
// guardian check (or worse, silently succeed against the wrong wallet).
export function getGuardianPrivateKey(network: NetworkKey): string {
  if (network === 'botchainMainnet') {
    return process.env.BOTCHAIN_MAINNET_PRIVATE_KEY || '';
  }
  return process.env.GUARDIAN_PRIVATE_KEY || '';
}

export function getExpectedChainId(network: NetworkKey): bigint {
  switch (network) {
    case 'botchainTestnet':
      return 968n;
    case 'botchainMainnet':
      return 677n;
    case 'bscMainnet':
      return 56n;
    default: // bscTestnet
      return 97n;
  }
}

export function getExplorerUrl(network: NetworkKey): string {
  switch (network) {
    case 'botchainTestnet':
      return 'https://scan.bohr.life';
    case 'botchainMainnet':
      return 'https://scan.botchain.ai';
    case 'bscMainnet':
      return 'https://bscscan.com';
    default: // bscTestnet
      return 'https://testnet.bscscan.com';
  }
}

export function getNativeSymbol(network: NetworkKey): string {
  return network.startsWith('botchain') ? 'BOT' : 'BNB';
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_GUARDIAN_VAULT_ADDRESS: string;
  readonly VITE_THREAT_REGISTRY_ADDRESS: string;
  readonly VITE_BSC_TESTNET_RPC?: string;
  readonly VITE_BSC_MAINNET_RPC?: string;
  readonly VITE_BLOCK_EXPLORER_URL: string;
  readonly VITE_ENABLE_NOTIFICATIONS?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_DEBUG_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
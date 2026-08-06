import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import {
    defineChain,
    sepolia,
    bscTestnet,
    opBNBTestnet,
    baseSepolia,
    type AppKitNetwork,
} from '@reown/appkit/networks';

// Get a free Project ID at https://cloud.reown.com (takes ~2 min).
// Without a real project ID, the WalletConnect modal will fail to open.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;

if (!projectId) {
    console.warn(
        '[GuardDog] VITE_WALLETCONNECT_PROJECT_ID is not set — mobile WalletConnect ' +
        'login will not work until you add one from https://cloud.reown.com'
    );
}

// BOTchain isn't a preset chain in @reown/appkit/networks, so we define it
// manually using the same values already used in src/config/contracts.ts.
const botchainMainnet = defineChain({
    id: 677,
    caipNetworkId: 'eip155:677',
    chainNamespace: 'eip155',
    name: 'BOT Chain',
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.botchain.ai'] },
    },
    blockExplorers: {
        default: { name: 'BOTchain Explorer', url: 'https://scan.botchain.ai' },
    },
});

const botchainTestnet = defineChain({
    id: 968,
    caipNetworkId: 'eip155:968',
    chainNamespace: 'eip155',
    name: 'BOTchain Testnet',
    nativeCurrency: { name: 'BOT', symbol: 'tBOT', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.bohr.life'] },
    },
    blockExplorers: {
        default: { name: 'BOTchain Testnet Explorer', url: 'https://scan.bohr.life' },
    },
});

// Mirrors SUPPORTED_NETWORKS in src/config/contracts.ts
export const appKitNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
    botchainMainnet,
    botchainTestnet,
    bscTestnet,
    opBNBTestnet,
    baseSepolia,
    sepolia,
];

const metadata = {
    name: 'GuardDog',
    description: 'AI-Powered Autonomous Wallet Security',
    url: 'https://guard-dog.vercel.app',
    icons: ['https://guard-dog.vercel.app/favicon.ico'],
};

export const appKit = createAppKit({
    adapters: [new EthersAdapter()],
    networks: appKitNetworks,
    defaultNetwork: botchainMainnet,
    projectId,
    metadata,
    features: {
        analytics: false,
        email: false,
        socials: false,
    },
});
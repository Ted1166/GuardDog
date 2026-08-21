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

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string;

if (!projectId) {
    console.warn(
        '[GuardDog] VITE_WALLETCONNECT_PROJECT_ID is not set — mobile WalletConnect ' +
        'login will not work until you add one from https://cloud.reown.com'
    );
}

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

const xLayerMainnet = defineChain({
    id: 196,
    caipNetworkId: 'eip155:196',
    chainNamespace: 'eip155',
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://rpc.xlayer.tech'] },
    },
    blockExplorers: {
        default: { name: 'X Layer Explorer', url: 'https://web3.okx.com/explorer/x-layer/evm' },
    },
});

export const appKitNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
    botchainMainnet,
    botchainTestnet,
    bscTestnet,
    opBNBTestnet,
    baseSepolia,
    sepolia,
    xLayerMainnet,
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
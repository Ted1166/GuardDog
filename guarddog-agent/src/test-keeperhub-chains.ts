import 'dotenv/config';
import { KeeperHubService } from './core/keeperhub.js';

/**
 * Run this FIRST, before any KeeperHub integration work.
 * It answers the one question that decides everything else: does KeeperHub
 * support the chain(s) GuardDog actually needs?
 *
 * Usage:
 *   KEEPERHUB_API_KEY=kh_... npm run check:keeperhub-chains
 */
async function main() {
    const apiKey = process.env.KEEPERHUB_API_KEY;
    if (!apiKey) {
        console.error('❌ KEEPERHUB_API_KEY is not set. Add it to your .env first.');
        process.exitCode = 1;
        return;
    }

    const kh = new KeeperHubService(apiKey);

    console.log('🔍 Fetching supported chains from KeeperHub...\n');
    const chains = await kh.listChains();

    console.log(`✅ Got ${chains.length} chains total.\n`);

    // The chain IDs GuardDog actually cares about.
    const targets: Array<{ label: string; chainId: number }> = [
        { label: 'BOTchain Mainnet', chainId: 677 },
        { label: 'BOTchain Testnet', chainId: 968 },
        { label: 'BSC Testnet', chainId: 97 },
        { label: 'opBNB Testnet', chainId: 5611 },
        { label: 'Base Sepolia', chainId: 84532 },
        { label: 'Ethereum Sepolia', chainId: 11155111 },
    ];

    console.log('--- GuardDog networks vs KeeperHub support ---');
    for (const { label, chainId } of targets) {
        const match = chains.find(c => c.chainId === chainId);
        if (!match) {
            console.log(`❌ ${label} (chainId ${chainId}) - NOT in KeeperHub's chain list`);
        } else if (!match.isEnabled) {
            console.log(`⚠️ ${label} (chainId ${chainId}) - listed but disabled`);
        } else {
            console.log(`✅ ${label} (chainId ${chainId}) - supported (${match.name})`);
        }
    }

    console.log('\n--- All KeeperHub-enabled chains (for reference) ---');
    chains
        .filter(c => c.isEnabled)
        .forEach(c => console.log(`   ${c.chainId}\t${c.name}${c.isTestnet ? ' (testnet)' : ''}`));
}

main().catch((err) => {
    console.error('❌ Failed to check KeeperHub chains:', err.response?.data || err.message);
    process.exitCode = 1;
});
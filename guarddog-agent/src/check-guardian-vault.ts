import { ethers } from 'ethers';

/**
 * Read-only check — no private key needed. Confirms who currently owns
 * GuardianVault (can call updateGuardian) and who the current guardian is,
 * on the already-deployed BSC Testnet contract.
 *
 * Usage: npm run check:guardian-vault
 */
const GUARDIAN_VAULT_ADDRESS = '0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9'; // BSC Testnet
const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';

const MINIMAL_ABI = [
    'function owner() view returns (address)',
    'function guardian() view returns (address)',
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const vault = new ethers.Contract(GUARDIAN_VAULT_ADDRESS, MINIMAL_ABI, provider);

    const [owner, guardian] = await Promise.all([
        vault.owner(),
        vault.guardian(),
    ]);

    console.log(`GuardianVault (BSC Testnet): ${GUARDIAN_VAULT_ADDRESS}`);
    console.log(` owner() = ${owner} ← must sign the updateGuardian() call`);
    console.log(` guardian() = ${guardian}  ← currently allowed to call protectTokens()`);
    console.log('\nOnce you have the KeeperHub wallet address (npm run check:keeperhub-wallet),');
    console.log('whoever holds the owner private key needs to call:');
    console.log('  vault.updateGuardian(<keeperhub_wallet_address>)');
}

main().catch((err) => {
    console.error('❌ Failed to read contract state:', err.message);
    process.exitCode = 1;
});
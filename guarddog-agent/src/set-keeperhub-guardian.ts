import 'dotenv/config';
import { ethers } from 'ethers';

/**
 * ONE-TIME action: points GuardianVault's guardian role at the KeeperHub
 * wallet, so KeeperHub-executed protectTokens() calls will pass the
 * on-chain guardian check.
 *
 * ⚠️  After this runs, your existing direct ethers.js flow in
 *     blockchain.ts will no longer be authorized to call protectTokens()
 *     on THIS contract (0x9E2d...4A58 will lose guardian status).
 *     Reversible any time by re-running with the old address.
 *
 * Usage: npm run set:keeperhub-guardian
 */
const GUARDIAN_VAULT_ADDRESS = '0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9'; // BSC Testnet
const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const NEW_GUARDIAN = '0x45e11c29d03aa528ca20306a8cc48d8d632362a2'; // KeeperHub org wallet

const MINIMAL_ABI = [
    'function owner() view returns (address)',
    'function guardian() view returns (address)',
    'function updateGuardian(address newGuardian) external',
];

async function main() {
    const ownerKey = process.env.GUARDIAN_PRIVATE_KEY;
    if (!ownerKey) {
        console.error('❌ GUARDIAN_PRIVATE_KEY is not set in .env');
        process.exitCode = 1;
        return;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(ownerKey, provider);
    const vault = new ethers.Contract(GUARDIAN_VAULT_ADDRESS, MINIMAL_ABI, signer);

    const owner = await vault.owner();
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error(`❌ This key (${signer.address}) is not the contract owner (${owner}). Aborting.`);
        process.exitCode = 1;
        return;
    }

    console.log(`Current guardian: ${await vault.guardian()}`);
    console.log(`Setting guardian to KeeperHub wallet: ${NEW_GUARDIAN}`);

    const tx = await vault.updateGuardian(NEW_GUARDIAN);
    console.log(`Tx submitted: ${tx.hash}`);
    console.log('Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`New guardian: ${await vault.guardian()}`);
}

main().catch((err) => {
    console.error('❌ Failed to update guardian:', err.reason || err.message);
    process.exitCode = 1;
});
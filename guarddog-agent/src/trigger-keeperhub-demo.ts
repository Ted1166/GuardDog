import 'dotenv/config';
import { ethers } from 'ethers';
import { BlockchainService } from './core/blockchain.js';
import { KeeperHubService } from './core/keeperhub.js';
import { WalletMonitor, type ThreatDetection } from './monitoring/wallet-monitor.js';
import { getRpcUrl, getGuardianPrivateKey, getExplorerUrl } from './config/network.js';

const NETWORK = 'bscTestnet';
const TEST_TOKEN_ADDRESS = '0x23A524E860294Cf35050d8dA281e288649322a41';
const PROTECT_AMOUNT = ethers.parseEther('50');
const THREAT_LEVEL = 95;

const ERC20_MINIMAL_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

async function main() {
    const apiKey = process.env.KEEPERHUB_API_KEY;
    if (!apiKey) {
        console.error('❌ KEEPERHUB_API_KEY is not set.');
        process.exitCode = 1;
        return;
    }

    const rpcUrl = getRpcUrl(NETWORK);
    const guardianPrivateKey = getGuardianPrivateKey(NETWORK);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const victimAddress = process.env.DEMO_VICTIM_ADDRESS
        || new ethers.Wallet(guardianPrivateKey).address;

    console.log('🐕 GuardDog × KeeperHub — live demo trigger');
    console.log(` Network: ${NETWORK}`);
    console.log(` Victim wallet: ${victimAddress}`);
    console.log(` Test token:    ${TEST_TOKEN_ADDRESS}\n`);

    // Readiness checks (all read-only, no gas spent)
    const blockchain = new BlockchainService(rpcUrl, guardianPrivateKey, NETWORK);
    const token = new ethers.Contract(TEST_TOKEN_ADDRESS, ERC20_MINIMAL_ABI, provider);
    const vaultAddress = blockchain.getVaultAddress();

    const [isProtected, balance, allowance] = await Promise.all([
        blockchain.isWalletProtected(victimAddress),
        token.balanceOf(victimAddress),
        token.allowance(victimAddress, vaultAddress),
    ]);

    console.log('--- Readiness ---');
    console.log(`Protection enabled: ${isProtected ? '✅' : '❌'}`);
    console.log(`Token balance: ${ethers.formatEther(balance)} TEST ${balance >= PROTECT_AMOUNT ? '✅' : '❌ (need ≥ 50)'}`);
    console.log(`Vault allowance: ${ethers.formatEther(allowance)} TEST ${allowance >= PROTECT_AMOUNT ? '✅' : '❌ (need ≥ 50)'}`);

    if (!isProtected || balance < PROTECT_AMOUNT || allowance < PROTECT_AMOUNT) {
        console.log('\n⚠️  Not ready yet. From contracts/scripts (fill in the private key field):');
        if (!isProtected) console.log(' - node enable-protection.js (run as the victim wallet)');
        if (balance < PROTECT_AMOUNT) console.log(' - transfer TEST tokens to the victim wallet (deployer holds the supply)');
        if (allowance < PROTECT_AMOUNT) console.log(' - node approve-token.js (run as the victim wallet)');
        process.exitCode = 1;
        return;
    }

    console.log('\n✅ All checks passed. Executing protectTokens() via KeeperHub...\n');

    const keeperHub = new KeeperHubService(apiKey);
    const monitor = new WalletMonitor(blockchain, 75, '1000', keeperHub);

    const detection: ThreatDetection = {
        walletAddress: victimAddress,
        tokenAddress: TEST_TOKEN_ADDRESS,
        threatLevel: THREAT_LEVEL,
        reason: 'GuardDog x KeeperHub hackathon demo - simulated honeypot threat',
        shouldProtect: true,
        balance: PROTECT_AMOUNT,
        threatSource: 'verified',
    };

    const txHash = await monitor.executeProtection(detection);

    if (!txHash) {
        console.error('\n❌ Execution did not return a transaction hash - check the logs above for the failure reason.');
        process.exitCode = 1;
        return;
    }

    const explorer = `${getExplorerUrl(NETWORK)}/tx/${txHash}`;
    console.log('\n🎉 SUCCESS — this is your submission transaction:');
    console.log(`${explorer}`);
}

main().catch((err) => {
    console.error('❌ Demo trigger failed:', err.message || err);
    process.exitCode = 1;
});
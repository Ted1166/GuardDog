import { ethers } from 'ethers';

/**
 * One-off diagnostic: tests candidate function selectors directly against
 * the LIVE deployed bytecode, to find out which protection-status getter
 * (if any) this specific deployment actually supports.
 */
const VAULT_ADDRESS = '0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9';
const RPC_URL = 'https://bsc-testnet-rpc.publicnode.com';
const TEST_ADDRESS = '0x9E2d2c2522a904EF07DC61F88D189833476D4A58';

const CANDIDATES = [
    'function isWalletProtected(address wallet) view returns (bool)',
    'function isProtected(address) view returns (bool)',
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Confirm there's actually a contract at this address at all.
    const code = await provider.getCode(VAULT_ADDRESS);
    console.log(`Bytecode at ${VAULT_ADDRESS}: ${code === '0x' ? '❌ NO CONTRACT DEPLOYED HERE' : `✅ ${code.length} chars`}\n`);

    for (const sig of CANDIDATES) {
        const iface = new ethers.Interface([sig]);
        const fn = sig.split('(')[0].replace('function ', '');
        try {
            const result = await provider.call({
                to: VAULT_ADDRESS,
                data: iface.encodeFunctionData(fn, [TEST_ADDRESS]),
            });
            if (result === '0x') {
                console.log(`❌ ${fn}(address) - exists as a call but returned empty data (likely reverted or wrong selector)`);
            } else {
                const decoded = iface.decodeFunctionResult(fn, result);
                console.log(`✅ ${fn}(address) - WORKS, returned: ${decoded}`);
            }
        } catch (err: any) {
            console.log(`❌ ${fn}(address) - threw: ${err.shortMessage || err.message}`);
        }
    }
}

main();
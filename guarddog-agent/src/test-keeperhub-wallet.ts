import 'dotenv/config';
import axios from 'axios';

/**
 * Fetches (or reports missing) the org's KeeperHub Turnkey wallet address.
 * This is the address that will need the `guardian` role on GuardianVault
 * for KeeperHub-executed protectTokens() calls to succeed.
 *
 * Usage: npm run check:keeperhub-wallet
 */
async function main() {
    const apiKey = process.env.KEEPERHUB_API_KEY;
    if (!apiKey) {
        console.error('❌ KEEPERHUB_API_KEY is not set. Add it to your .env first.');
        process.exitCode = 1;
        return;
    }

    const client = axios.create({
        baseURL: 'https://app.keeperhub.com',
        headers: { Authorization: `Bearer ${apiKey}` },
    });

    try {
        const res = await client.get('/api/user/wallet');

        if (res.data?.hasWallet === false) {
            console.log('⚠️  No wallet provisioned for this organization yet.');
            console.log(' Provision one first — either:');
            console.log(' a) In the dashboard: app.keeperhub.com → Integrations → add a wallet, or');
            console.log(' b) POST https://app.keeperhub.com/api/integrations/wallet');
            console.log(' Then re-run this script.');
            return;
        }

        console.log('✅ KeeperHub wallet found:\n');
        console.log(JSON.stringify(res.data, null, 2));
        console.log('\n👉 This is the address that needs the guardian role on GuardianVault.');
    } catch (err: any) {
        console.error('❌ Failed to fetch wallet:', err.response?.data || err.message);
        process.exitCode = 1;
    }
}

main();
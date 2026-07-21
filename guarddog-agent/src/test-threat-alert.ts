import 'dotenv/config';
import { ethers } from 'ethers';
import type { NetworkKey } from './config/contracts.js';
import { THREAT_REGISTRY_ABI, getContractAddresses } from './config/contracts.js';
import { getRpcUrl, getGuardianPrivateKey, getExplorerUrl } from './config/network.js';

/**
 * Manual end-to-end check: fires a real ThreatReported event on-chain against
 * the configured NETWORK, then tells you what to look for in the RUNNING
 * `guarddog-agent` process (this script is a separate process — it can prove
 * the on-chain half worked, but reading another process's console/Telegram
 * delivery has to be confirmed by you).
 *
 * Usage:
 *   NETWORK=botchainTestnet npm run test:e2e   (recommended first)
 *   NETWORK=botchainMainnet npm run test:e2e   (only after testnet passes)
 */
async function main() {
  const network = (process.env.NETWORK as NetworkKey) || 'bscTestnet';
  const rpcUrl = getRpcUrl(network);
  const privateKey = getGuardianPrivateKey(network);

  if (!privateKey) {
    console.error(`❌ No private key configured for network "${network}". Set GUARDIAN_PRIVATE_KEY (or BOTCHAIN_MAINNET_PRIVATE_KEY for botchainMainnet).`);
    process.exitCode = 1;
    return;
  }

  console.log(`🐕 GuardDog threat-alert e2e test`);
  console.log(`   Network: ${network}`);
  console.log(`   RPC:     ${rpcUrl}\n`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const reporter = new ethers.Wallet(privateKey, provider);
  const addresses = getContractAddresses(network);
  const registry = new ethers.Contract(addresses.ThreatRegistry, THREAT_REGISTRY_ABI, reporter);

  // A fresh random address each run avoids ThreatRegistry's one-report-per-reporter rule.
  const tokenAddress = ethers.Wallet.createRandom().address;
  console.log(`Reporting a simulated threat against ${tokenAddress}...`);

  try {
    const tx = await registry.reportThreat(tokenAddress, 95, 'Honeypot', 'test-threat-alert.ts simulated threat');
    console.log(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();

    const emitted = receipt.logs.some((log: any) => {
      try {
        return registry.interface.parseLog(log)?.name === 'ThreatReported';
      } catch {
        return false;
      }
    });

    if (!emitted) {
      console.error('\n❌ FAIL: transaction confirmed but no ThreatReported event was found in the receipt.');
      process.exitCode = 1;
      return;
    }

    const explorer = `${getExplorerUrl(network)}/tx/${tx.hash}`;
    console.log(`\n✅ PASS: ThreatReported emitted on-chain in block ${receipt.blockNumber}.`);
    console.log(`   Explorer: ${explorer}`);
    console.log(`\n👉 Now check the RUNNING guarddog-agent process:`);
    console.log(`   - Its logs should show: 📡 [event] ThreatReported: ${tokenAddress} ...`);
    console.log(`   - If TELEGRAM_ENABLED=true, a Telegram alert should arrive within a few seconds.`);
    console.log(`   - If nothing appears, the agent is likely falling back to polling only —`);
    console.log(`     check it logged "✅ Event listener connected" at startup.`);
  } catch (error: any) {
    console.error(`\n❌ FAIL: ${error.message || error}`);
    process.exitCode = 1;
  }
}

main();

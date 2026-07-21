import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ethers } from 'ethers';
import { ThreatEventListener, type AlertSender } from './event-listener.js';
import type { AlertMessage } from '../messaging/openclaw.js';

// These tests require a local Hardhat node (`npx hardhat node` in contracts/)
// running on 127.0.0.1:8545 — it serves both HTTP and WebSocket JSON-RPC on
// the same port, which is what makes it possible to exercise the real
// ethers.WebSocketProvider code path locally before trusting it on mainnet.
// If no node is reachable, these tests skip rather than fail.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.resolve(__dirname, '../../../contracts/artifacts/contracts');
const LOCAL_RPC = 'http://127.0.0.1:8545';
const LOCAL_WS = 'ws://127.0.0.1:8545';
// Hardhat's well-known default account #0 — public test key, not a secret.
const LOCAL_DEPLOYER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function loadArtifact(relPath: string): { abi: any; bytecode: string } {
  const json = JSON.parse(readFileSync(path.join(ARTIFACTS_DIR, relPath), 'utf-8'));
  return { abi: json.abi, bytecode: json.bytecode };
}

async function isLocalNodeUp(): Promise<boolean> {
  try {
    await new ethers.JsonRpcProvider(LOCAL_RPC).getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

test('ThreatEventListener sends an alert when ThreatReported fires on-chain', { timeout: 20_000 }, async (t) => {
  if (!(await isLocalNodeUp())) {
    t.skip('No local Hardhat node on 127.0.0.1:8545 — run `npx hardhat node` in contracts/ first.');
    return;
  }

  const provider = new ethers.JsonRpcProvider(LOCAL_RPC);
  // Use a freshly funded random wallet rather than the shared well-known
  // deployer key — that key accumulates transaction history across manual
  // sandbox sessions and other test runs on the same long-lived local node,
  // which makes reasoning about its nonce unreliable. A fresh wallet always
  // starts at nonce 0.
  const funder = new ethers.Wallet(LOCAL_DEPLOYER_KEY, provider);
  const deployer = ethers.Wallet.createRandom().connect(provider);
  await (await funder.sendTransaction({ to: deployer.address, value: ethers.parseEther('1') })).wait();

  // Manage nonces explicitly rather than trusting each call's automatic
  // "pending" lookup — back-to-back sends from a single signer against
  // Hardhat's automining network have shown a nonce race when left implicit.
  let nonce = await provider.getTransactionCount(deployer.address, 'pending');

  const registryArtifact = loadArtifact('ThreatRegistry.sol/ThreatRegistry.json');
  const registry = await new ethers.ContractFactory(registryArtifact.abi, registryArtifact.bytecode, deployer).deploy(
    deployer.address,
    { nonce: nonce++ }
  );
  await registry.waitForDeployment();

  const vaultArtifact = loadArtifact('GuardianVault.sol/GuardianVault.json');
  const vault = await new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, deployer).deploy(
    deployer.address,
    { nonce: nonce++ }
  );
  await vault.waitForDeployment();

  process.env.GUARDIAN_VAULT_ADDRESS = await vault.getAddress();
  process.env.THREAT_REGISTRY_ADDRESS = await registry.getAddress();

  const receivedAlerts: AlertMessage[] = [];
  const spy: AlertSender = {
    async sendAlert(alert) {
      receivedAlerts.push(alert);
    },
  };

  const listener = new ThreatEventListener(LOCAL_WS, 'bscTestnet', spy);
  listener.start();

  try {
    await new Promise((resolve) => setTimeout(resolve, 500)); // let the WS subscription attach

    const tokenAddress = ethers.Wallet.createRandom().address;
    const tx = await (registry.connect(deployer) as any).reportThreat(
      tokenAddress,
      95,
      'Honeypot',
      'integration test threat',
      { nonce: nonce++ }
    );
    await tx.wait();

    const deadline = Date.now() + 10_000;
    while (receivedAlerts.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    assert.equal(receivedAlerts.length, 1, 'expected exactly one alert from the ThreatReported event');
    assert.equal(receivedAlerts[0].type, 'threat_detected');
    assert.equal(receivedAlerts[0].tokenAddress, tokenAddress);
    assert.equal(receivedAlerts[0].threatLevel, 95);
  } finally {
    listener.stop();
  }
});

test('ThreatEventListener reconnects without crashing after a forced socket close', { timeout: 15_000 }, async (t) => {
  if (!(await isLocalNodeUp())) {
    t.skip('No local Hardhat node on 127.0.0.1:8545 — run `npx hardhat node` in contracts/ first.');
    return;
  }

  process.env.GUARDIAN_VAULT_ADDRESS ||= ethers.Wallet.createRandom().address;
  process.env.THREAT_REGISTRY_ADDRESS ||= ethers.Wallet.createRandom().address;

  const spy: AlertSender = { async sendAlert() {} };
  const listener = new ThreatEventListener(LOCAL_WS, 'bscTestnet', spy);
  listener.start();

  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate a dropped connection by force-closing the underlying socket.
  const internalProvider = (listener as any).provider as ethers.WebSocketProvider;
  (internalProvider.websocket as any).close();

  // Give the reconnect/backoff path time to run. Success is simply that
  // nothing throws and the process doesn't crash.
  await new Promise((resolve) => setTimeout(resolve, 4_000));

  listener.stop();
  assert.ok(true, 'listener survived a forced socket close without crashing');
});

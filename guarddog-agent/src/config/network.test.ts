import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRpcUrl,
  getWssUrl,
  getGuardianPrivateKey,
  getExpectedChainId,
  getExplorerUrl,
  getNativeSymbol,
} from './network.js';
import { getContractAddresses, THREAT_REGISTRY_ABI } from './contracts.js';

const ENV_KEYS = [
  'BOTCHAIN_TESTNET_RPC_URL',
  'BOTCHAIN_MAINNET_RPC_URL',
  'BOTCHAIN_TESTNET_WSS_URL',
  'BOTCHAIN_MAINNET_WSS_URL',
  'BSC_MAINNET_RPC_URL',
  'BSC_RPC_URL',
  'BOTCHAIN_MAINNET_PRIVATE_KEY',
  'GUARDIAN_PRIVATE_KEY',
  'BOTCHAIN_MAINNET_GUARDIAN_VAULT',
  'BOTCHAIN_MAINNET_THREAT_REGISTRY',
];

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('getRpcUrl', () => {
  test('botchainMainnet defaults to rpc.botchain.ai', () => {
    assert.equal(getRpcUrl('botchainMainnet'), 'https://rpc.botchain.ai');
  });

  test('botchainTestnet defaults to rpc.bohr.life', () => {
    assert.equal(getRpcUrl('botchainTestnet'), 'https://rpc.bohr.life');
  });

  test('bscTestnet (default) falls back to public testnet RPC', () => {
    assert.equal(getRpcUrl('bscTestnet'), 'https://data-seed-prebsc-1-s1.binance.org:8545');
  });

  test('env override wins over the hardcoded default', () => {
    process.env.BOTCHAIN_MAINNET_RPC_URL = 'http://127.0.0.1:8545';
    assert.equal(getRpcUrl('botchainMainnet'), 'http://127.0.0.1:8545');
  });
});

describe('getWssUrl', () => {
  test('botchainMainnet defaults to ws-rpc.botchain.ai', () => {
    assert.equal(getWssUrl('botchainMainnet'), 'wss://ws-rpc.botchain.ai');
  });

  test('non-botchain networks have no WSS endpoint', () => {
    assert.equal(getWssUrl('bscTestnet'), undefined);
    assert.equal(getWssUrl('bscMainnet'), undefined);
  });
});

describe('getGuardianPrivateKey', () => {
  test('botchainMainnet reads BOTCHAIN_MAINNET_PRIVATE_KEY', () => {
    process.env.BOTCHAIN_MAINNET_PRIVATE_KEY = '0xmainnetkey';
    assert.equal(getGuardianPrivateKey('botchainMainnet'), '0xmainnetkey');
  });

  test('botchainMainnet does NOT fall back to GUARDIAN_PRIVATE_KEY', () => {
    process.env.GUARDIAN_PRIVATE_KEY = '0xtestnetkey';
    assert.equal(getGuardianPrivateKey('botchainMainnet'), '');
  });

  test('other networks read GUARDIAN_PRIVATE_KEY', () => {
    process.env.GUARDIAN_PRIVATE_KEY = '0xtestnetkey';
    assert.equal(getGuardianPrivateKey('botchainTestnet'), '0xtestnetkey');
    assert.equal(getGuardianPrivateKey('bscTestnet'), '0xtestnetkey');
  });
});

describe('getExpectedChainId', () => {
  test('maps each network to its correct chainId', () => {
    assert.equal(getExpectedChainId('botchainMainnet'), 677n);
    assert.equal(getExpectedChainId('botchainTestnet'), 968n);
    assert.equal(getExpectedChainId('bscMainnet'), 56n);
    assert.equal(getExpectedChainId('bscTestnet'), 97n);
  });
});

describe('getExplorerUrl', () => {
  test('maps each network to its correct explorer', () => {
    assert.equal(getExplorerUrl('botchainMainnet'), 'https://scan.botchain.ai');
    assert.equal(getExplorerUrl('botchainTestnet'), 'https://scan.bohr.life');
    assert.equal(getExplorerUrl('bscTestnet'), 'https://testnet.bscscan.com');
  });
});

describe('getNativeSymbol', () => {
  test('botchain networks use BOT', () => {
    assert.equal(getNativeSymbol('botchainMainnet'), 'BOT');
    assert.equal(getNativeSymbol('botchainTestnet'), 'BOT');
  });

  test('bsc networks use BNB', () => {
    assert.equal(getNativeSymbol('bscMainnet'), 'BNB');
    assert.equal(getNativeSymbol('bscTestnet'), 'BNB');
  });
});

describe('THREAT_REGISTRY_ABI', () => {
  test('includes reportThreat — needed by test-threat-alert.ts to file a threat', () => {
    assert.ok(
      THREAT_REGISTRY_ABI.some((entry) => entry.includes('function reportThreat')),
      'THREAT_REGISTRY_ABI is missing reportThreat'
    );
  });
});

describe('getContractAddresses', () => {
  test('botchainMainnet resolves to the locked deployed addresses', () => {
    const addresses = getContractAddresses('botchainMainnet');
    assert.equal(addresses.GuardianVault, '0xEF650672437A97A7b987984239064D502F56272d');
    assert.equal(addresses.ThreatRegistry, '0x2D101FaFb24C660Bfef07fd3106Caf1074C80bF7');
  });

  test('env override wins for botchainMainnet addresses', () => {
    process.env.BOTCHAIN_MAINNET_GUARDIAN_VAULT = '0x1111111111111111111111111111111111111111';
    process.env.BOTCHAIN_MAINNET_THREAT_REGISTRY = '0x2222222222222222222222222222222222222222';
    const addresses = getContractAddresses('botchainMainnet');
    assert.equal(addresses.GuardianVault, '0x1111111111111111111111111111111111111111');
    assert.equal(addresses.ThreatRegistry, '0x2222222222222222222222222222222222222222');
  });

  test('botchainTestnet and botchainMainnet no longer collide (dead duplicate case removed)', () => {
    // Both currently share the same deployed addresses per the audit, but each
    // must resolve through its OWN switch case (env var names differ) rather
    // than one silently shadowing the other.
    process.env.BOTCHAIN_MAINNET_GUARDIAN_VAULT = '0x3333333333333333333333333333333333333333';
    const mainnet = getContractAddresses('botchainMainnet');
    const testnet = getContractAddresses('botchainTestnet');
    assert.equal(mainnet.GuardianVault, '0x3333333333333333333333333333333333333333');
    assert.equal(testnet.GuardianVault, '0xEF650672437A97A7b987984239064D502F56272d');
  });
});

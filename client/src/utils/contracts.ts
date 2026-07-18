import { ethers } from 'ethers';
import {
  GUARDIAN_VAULT_ABI,
  THREAT_REGISTRY_ABI,
  getContractAddress,
  NETWORKS,
  type NetworkKey,
  DEFAULT_NETWORK,
} from '../config/contracts';

// ── Gas limits per network (prevents RPC hang on slow testnets) ───────
const GAS_LIMITS: Record<NetworkKey, bigint> = {
  bscTestnet:   300_000n,
  bscMainnet:   300_000n,
  opBNBTestnet: 300_000n,
  opBNBMainnet: 300_000n,
  baseSepolia:  300_000n,
  baseMainnet:  300_000n,
  sepolia:      300_000n,
};

// ── Read-only provider (bypasses wallet origin restrictions) ──────────
export function getReadProvider(network: NetworkKey = DEFAULT_NETWORK): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORKS[network].rpcUrls[0]);
}

export function getGuardianVaultContract(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const address = getContractAddress('GuardianVault', network);
  return new ethers.Contract(address, GUARDIAN_VAULT_ABI, signerOrProvider);
}

export function getThreatRegistryContract(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const address = getContractAddress('ThreatRegistry', network);
  return new ethers.Contract(address, THREAT_REGISTRY_ABI, signerOrProvider);
}

export async function enableProtection(
  signer: ethers.Signer,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.enableProtection({ gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export async function disableProtection(
  signer: ethers.Signer,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.disableProtection({ gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export async function checkProtectionStatus(
  address: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<boolean> {
  try {
    // Always use direct RPC for reads — avoids wallet origin blocks
    const readProvider = getReadProvider(network);
    const contract = getGuardianVaultContract(readProvider, network);
    return await contract.isWalletProtected(address);
  } catch {
    return false;
  }
}

export async function getProtectionDuration(
  address: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  try {
    const readProvider = getReadProvider(network);
    const contract = getGuardianVaultContract(readProvider, network);
    return await contract.getProtectionDuration(address);
  } catch {
    return 0n;
  }
}

export async function getProtectedBalance(
  walletAddress: string,
  tokenAddress: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  try {
    const readProvider = getReadProvider(network);
    const contract = getGuardianVaultContract(readProvider, network);
    return await contract.getProtectedBalance(walletAddress, tokenAddress);
  } catch {
    return 0n;
  }
}

export async function withdrawTokens(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.withdraw(tokenAddress, amount, { gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export async function withdrawAllTokens(
  signer: ethers.Signer,
  tokenAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.withdrawAll(tokenAddress, { gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export interface RecoveryInfo {
  recovery: string;
  pending: string;
  eta: bigint;
}

export async function getRecoveryInfo(
  walletAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<RecoveryInfo> {
  try {
    const readProvider = getReadProvider(network);
    const contract = getGuardianVaultContract(readProvider, network);
    const [recovery, pending, eta] = await Promise.all([
      contract.recoveryAddress(walletAddress),
      contract.pendingRecoveryAddress(walletAddress),
      contract.recoveryChangeEta(walletAddress),
    ]);
    return { recovery, pending, eta };
  } catch {
    // Older vault deployments don't have the recovery functions yet
    return { recovery: ethers.ZeroAddress, pending: ethers.ZeroAddress, eta: 0n };
  }
}

export async function setRecoveryAddress(
  signer: ethers.Signer,
  newRecovery: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.setRecoveryAddress(newRecovery, { gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export async function finalizeRecoveryChange(
  signer: ethers.Signer,
  walletAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.finalizeRecoveryChange(walletAddress, { gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export async function cancelRecoveryChange(
  signer: ethers.Signer,
  walletAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.cancelRecoveryChange(walletAddress, { gasLimit: GAS_LIMITS[network] });
  return tx.wait();
}

export async function reportThreat(
  signer: ethers.Signer,
  contractAddress: string,
  threatLevel: number,
  threatType: string,
  evidence: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getThreatRegistryContract(signer, network);

  // ── uint8 cast — critical for ETH Sepolia / Base Sepolia storage ─────
  const level = Math.min(255, Math.max(0, Math.round(threatLevel)));

  const tx = await contract.reportThreat(
    contractAddress,
    level,          // explicit uint8-safe integer
    threatType,
    evidence,
    { gasLimit: GAS_LIMITS[network] }
  );
  return tx.wait();
}

export async function upvoteThreat(
  signer: ethers.Signer,
  contractAddress: string,
  reportIndex: number,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getThreatRegistryContract(signer, network);
  const tx = await contract.upvoteReport(contractAddress, reportIndex, {
    gasLimit: GAS_LIMITS[network],
  });
  return tx.wait();
}

export async function getThreatReports(
  contractAddress: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
) {
  try {
    // Use direct RPC — avoids wallet provider origin blocks
    const readProvider = getReadProvider(network);
    const contract = getThreatRegistryContract(readProvider, network);
    return await contract.getAllReports(contractAddress);
  } catch {
    return [];
  }
}

export async function getThreatScore(
  contractAddress: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<number> {
  try {
    const readProvider = getReadProvider(network);
    const contract = getThreatRegistryContract(readProvider, network);
    const score = await contract.getAggregateThreatScore(contractAddress);
    return Number(score);
  } catch {
    return 0;
  }
}

export async function getThreatStats(
  contractAddress: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<{
  totalReports: bigint;
  verifiedReports: bigint;
  avgThreatLevel: number;
  totalUpvotes: bigint;
}> {
  try {
    const readProvider = getReadProvider(network);
    const contract = getThreatRegistryContract(readProvider, network);
    const [totalReports, verifiedReports, avgThreatLevel, totalUpvotes] =
      await contract.getThreatStats(contractAddress);
    return {
      totalReports,
      verifiedReports,
      avgThreatLevel: Number(avgThreatLevel),
      totalUpvotes,
    };
  } catch {
    return { totalReports: 0n, verifiedReports: 0n, avgThreatLevel: 0, totalUpvotes: 0n };
  }
}

export async function isVerifiedThreat(
  contractAddress: string,
  _provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<boolean> {
  try {
    const readProvider = getReadProvider(network);
    const contract = getThreatRegistryContract(readProvider, network);
    return await contract.isVerifiedThreat(contractAddress);
  } catch {
    return false;
  }
}

export function parseContractError(error: any): string {
  if (error.reason) return error.reason;
  if (error.data?.message) return error.data.message;
  if (error.message) {
    const match = error.message.match(/reason="([^"]+)"/);
    if (match) return match[1];
    // Clean up common RPC error noise
    if (error.message.includes('user rejected')) return 'Transaction rejected by user.';
    if (error.message.includes('insufficient funds')) return 'Insufficient funds for gas.';
    return error.message;
  }
  return 'Transaction failed. Please try again.';
}
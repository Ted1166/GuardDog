import { ethers } from 'ethers';
import {
  GUARDIAN_VAULT_ABI,
  THREAT_REGISTRY_ABI,
  getContractAddress,
} from '../config/contracts';

export function getGuardianVaultContract(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: 'bscTestnet' | 'bscMainnet' = 'bscTestnet'
) {
  const address = getContractAddress('GuardianVault', network);
  return new ethers.Contract(address, GUARDIAN_VAULT_ABI, signerOrProvider);
}

export function getThreatRegistryContract(
  signerOrProvider: ethers.Signer | ethers.Provider,
  network: 'bscTestnet' | 'bscMainnet' = 'bscTestnet'
) {
  const address = getContractAddress('ThreatRegistry', network);
  return new ethers.Contract(address, THREAT_REGISTRY_ABI, signerOrProvider);
}

export async function enableProtection(signer: ethers.Signer) {
  const contract = getGuardianVaultContract(signer);
  const tx = await contract.enableProtection();
  return tx.wait();
}

export async function disableProtection(signer: ethers.Signer) {
  const contract = getGuardianVaultContract(signer);
  const tx = await contract.disableProtection();
  return tx.wait();
}

export async function checkProtectionStatus(
  address: string,
  provider: ethers.Provider
): Promise<boolean> {
  const contract = getGuardianVaultContract(provider);
  return contract.isWalletProtected(address);
}

export async function getProtectionDuration(
  address: string,
  provider: ethers.Provider
): Promise<bigint> {
  const contract = getGuardianVaultContract(provider);
  return contract.getProtectionDuration(address);
}

export async function getProtectedBalance(
  walletAddress: string,
  tokenAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  const contract = getGuardianVaultContract(provider);
  return contract.getProtectedBalance(walletAddress, tokenAddress);
}

export async function withdrawTokens(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint
) {
  const contract = getGuardianVaultContract(signer);
  const tx = await contract.withdraw(tokenAddress, amount);
  return tx.wait();
}

export async function withdrawAllTokens(
  signer: ethers.Signer,
  tokenAddress: string
) {
  const contract = getGuardianVaultContract(signer);
  const tx = await contract.withdrawAll(tokenAddress);
  return tx.wait();
}

export async function reportThreat(
  signer: ethers.Signer,
  contractAddress: string,
  threatLevel: number,
  threatType: string,
  evidence: string
) {
  const contract = getThreatRegistryContract(signer);
  const tx = await contract.reportThreat(
    contractAddress,
    threatLevel,
    threatType,
    evidence
  );
  return tx.wait();
}

export async function upvoteThreat(
  signer: ethers.Signer,
  contractAddress: string,
  reportIndex: number
) {
  const contract = getThreatRegistryContract(signer);
  const tx = await contract.upvoteReport(contractAddress, reportIndex);
  return tx.wait();
}

export async function getThreatReports(
  contractAddress: string,
  provider: ethers.Provider
) {
  const contract = getThreatRegistryContract(provider);
  return contract.getAllReports(contractAddress);
}

export async function getThreatScore(
  contractAddress: string,
  provider: ethers.Provider
): Promise<number> {
  const contract = getThreatRegistryContract(provider);
  return contract.getAggregateThreatScore(contractAddress);
}

export async function getThreatStats(
  contractAddress: string,
  provider: ethers.Provider
): Promise<{
  totalReports: bigint;
  verifiedReports: bigint;
  avgThreatLevel: number;
  totalUpvotes: bigint;
}> {
  const contract = getThreatRegistryContract(provider);
  const [totalReports, verifiedReports, avgThreatLevel, totalUpvotes] =
    await contract.getThreatStats(contractAddress);
  
  return {
    totalReports,
    verifiedReports,
    avgThreatLevel,
    totalUpvotes,
  };
}

export async function isVerifiedThreat(
  contractAddress: string,
  provider: ethers.Provider
): Promise<boolean> {
  const contract = getThreatRegistryContract(provider);
  return contract.isVerifiedThreat(contractAddress);
}

export function parseContractError(error: any): string {
  if (error.reason) {
    return error.reason;
  }
  
  if (error.data?.message) {
    return error.data.message;
  }
  
  if (error.message) {
    const match = error.message.match(/reason="([^"]+)"/);
    if (match) {
      return match[1];
    }
    return error.message;
  }
  
  return 'Transaction failed. Please try again.';
}
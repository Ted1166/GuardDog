import { ethers } from 'ethers';
import {
  GUARDIAN_VAULT_ABI,
  THREAT_REGISTRY_ABI,
  ERC20_ABI,
  getContractAddress,
  type NetworkKey,
  DEFAULT_NETWORK,
} from '../config/contracts';

export const MAX_UINT256 = ethers.MaxUint256;

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

export function getErc20Contract(
  tokenAddress: string,
  signerOrProvider: ethers.Signer | ethers.Provider
) {
  return new ethers.Contract(tokenAddress, ERC20_ABI, signerOrProvider);
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export async function getTokenMetadata(
  tokenAddress: string,
  provider: ethers.Provider
): Promise<TokenMetadata> {
  const token = getErc20Contract(tokenAddress, provider);
  const [name, symbol, decimals] = await Promise.all([
    token.name().catch(() => 'Unknown'),
    token.symbol().catch(() => '???'),
    token.decimals().catch(() => 18),
  ]);
  return {
    address: tokenAddress,
    name,
    symbol,
    decimals: Number(decimals),
  };
}

export async function getAllowance(
  tokenAddress: string,
  owner: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  const vault = getContractAddress('GuardianVault', network);
  const token = getErc20Contract(tokenAddress, provider);
  return token.allowance(owner, vault);
}

export async function approveToken(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const vault = getContractAddress('GuardianVault', network);
  const token = getErc20Contract(tokenAddress, signer);
  const tx = await token.approve(vault, amount);
  return tx.wait();
}

export async function registerToken(
  signer: ethers.Signer,
  tokenAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const vault = getGuardianVaultContract(signer, network);
  const tx = await vault.registerToken(tokenAddress);
  return tx.wait();
}

export async function unregisterToken(
  signer: ethers.Signer,
  tokenAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const vault = getGuardianVaultContract(signer, network);
  const tx = await vault.unregisterToken(tokenAddress);
  return tx.wait();
}

export async function getRegisteredTokens(
  walletAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<string[]> {
  const vault = getGuardianVaultContract(provider, network);
  return vault.getRegisteredTokens(walletAddress);
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  const token = getErc20Contract(tokenAddress, provider);
  return token.balanceOf(walletAddress);
}

export async function getUserMaxProtection(
  walletAddress: string,
  tokenAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  const vault = getGuardianVaultContract(provider, network);
  return vault.userMaxProtection(walletAddress, tokenAddress);
}

export async function getEffectiveCap(
  walletAddress: string,
  tokenAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  const vault = getGuardianVaultContract(provider, network);
  return vault.getEffectiveCap(walletAddress, tokenAddress);
}

export async function setUserMaxProtection(
  signer: ethers.Signer,
  tokenAddress: string,
  maxAmount: bigint,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const vault = getGuardianVaultContract(signer, network);
  const tx = await vault.setUserMaxProtection(tokenAddress, maxAmount);
  return tx.wait();
}

export async function enableProtection(signer: ethers.Signer, network: NetworkKey = DEFAULT_NETWORK) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.enableProtection();
  return tx.wait();
}

export async function disableProtection(signer: ethers.Signer, network: NetworkKey = DEFAULT_NETWORK) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.disableProtection();
  return tx.wait();
}

export async function checkProtectionStatus(
  address: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<boolean> {
  const contract = getGuardianVaultContract(provider, network);
  return contract.isWalletProtected(address);
}

export async function getProtectionDuration(
  address: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  const contract = getGuardianVaultContract(provider, network);
  return contract.getProtectionDuration(address);
}

export async function getProtectedBalance(
  walletAddress: string,
  tokenAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<bigint> {
  const contract = getGuardianVaultContract(provider, network);
  return contract.getProtectedBalance(walletAddress, tokenAddress);
}

export async function withdrawTokens(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.withdraw(tokenAddress, amount);
  return tx.wait();
}

export async function withdrawAllTokens(
  signer: ethers.Signer,
  tokenAddress: string,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getGuardianVaultContract(signer, network);
  const tx = await contract.withdrawAll(tokenAddress);
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
  reportIndex: number,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getThreatRegistryContract(signer, network);
  const tx = await contract.upvoteReport(contractAddress, reportIndex);
  return tx.wait();
}

export async function getThreatReports(
  contractAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
) {
  const contract = getThreatRegistryContract(provider, network);
  return contract.getAllReports(contractAddress);
}

export async function getThreatScore(
  contractAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<number> {
  const contract = getThreatRegistryContract(provider, network);
  return contract.getAggregateThreatScore(contractAddress);
}

export async function getThreatStats(
  contractAddress: string,
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<{
  totalReports: bigint;
  verifiedReports: bigint;
  avgThreatLevel: number;
  totalUpvotes: bigint;
}> {
  const contract = getThreatRegistryContract(provider, network);
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
  provider: ethers.Provider,
  network: NetworkKey = DEFAULT_NETWORK
): Promise<boolean> {
  const contract = getThreatRegistryContract(provider, network);
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
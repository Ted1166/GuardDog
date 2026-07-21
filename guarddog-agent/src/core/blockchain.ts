import { ethers } from 'ethers';
import { GUARDIAN_VAULT_ABI, THREAT_REGISTRY_ABI, ERC20_ABI, getContractAddresses, NetworkKey } from "../config/contracts.js";

export interface ThreatReport {
  reporter: string;
  timestamp: bigint;
  threatLevel: number;
  threatType: string;
  evidence: string;
  verified: boolean;
  upvotes: bigint;
}

export interface ProtectedWallet {
  address: string;
  isProtected: boolean;
  protectionStartTime?: bigint;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private guardianWallet: ethers.Wallet;
  private vaultContract: ethers.Contract;
  private registryContract: ethers.Contract;
  private network: NetworkKey;

  constructor(
    rpcUrl: string,
    guardianPrivateKey: string,
    network: NetworkKey = 'bscTestnet'
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.guardianWallet = new ethers.Wallet(guardianPrivateKey, this.provider);
    this.network = network;

    const addresses = getContractAddresses(network);

    this.vaultContract = new ethers.Contract(
      addresses.GuardianVault,
      GUARDIAN_VAULT_ABI,
      this.guardianWallet
    );

    this.registryContract = new ethers.Contract(
      addresses.ThreatRegistry,
      THREAT_REGISTRY_ABI,
      this.provider
    );
  }

  async getGuardianAddress(): Promise<string> {
    return this.guardianWallet.address;
  }

  async getChainId(): Promise<bigint> {
    const network = await this.provider.getNetwork();
    return network.chainId;
  }

  async verifyGuardianRole(): Promise<boolean> {
    try {
      const contractGuardian = await this.vaultContract.guardian();
      const myAddress = await this.getGuardianAddress();
      return contractGuardian.toLowerCase() === myAddress.toLowerCase();
    } catch (error) {
      console.error('Failed to verify guardian role:', error);
      return false;
    }
  }

  async isWalletProtected(walletAddress: string): Promise<boolean> {
    try {
      return await this.vaultContract.isWalletProtected(walletAddress);
    } catch (error) {
      console.error(`Failed to check protection status for ${walletAddress}:`, error);
      return false;
    }
  }

  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<bigint> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      return await tokenContract.balanceOf(walletAddress);
    } catch (error) {
      console.error(`Failed to get token balance for ${tokenAddress}:`, error);
      return 0n;
    }
  }

  async getThreatScore(contractAddress: string): Promise<number> {
    try {
      return await this.registryContract.getAggregateThreatScore(contractAddress);
    } catch (error) {
      console.error(`Failed to get threat score for ${contractAddress}:`, error);
      return 0;
    }
  }

  async isVerifiedThreat(contractAddress: string): Promise<boolean> {
    try {
      return await this.registryContract.isVerifiedThreat(contractAddress);
    } catch (error) {
      console.error(`Failed to check verified threat for ${contractAddress}:`, error);
      return false;
    }
  }

  async getThreatReports(contractAddress: string): Promise<ThreatReport[]> {
    try {
      const reports = await this.registryContract.getAllReports(contractAddress);
      return reports.map((r: any) => ({
        reporter: r.reporter,
        timestamp: r.timestamp,
        threatLevel: r.threatLevel,
        threatType: r.threatType,
        evidence: r.evidence,
        verified: r.verified,
        upvotes: r.upvotes,
      }));
    } catch (error) {
      console.error(`Failed to get threat reports for ${contractAddress}:`, error);
      return [];
    }
  }

  async protectTokens(
    walletAddress: string,
    tokenAddress: string,
    amount: bigint,
    threatLevel: number,
    reason: string
  ): Promise<string> {
    try {
      console.log(`🛡️  Protecting ${ethers.formatEther(amount)} tokens from ${tokenAddress}`);
      console.log(`   Wallet: ${walletAddress}`);
      console.log(`   Threat Level: ${threatLevel}`);
      console.log(`   Reason: ${reason}`);

      const tx = await this.vaultContract.protectTokens(
        walletAddress,
        tokenAddress,
        amount,
        threatLevel,
        reason
      );

      console.log(`   Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`✅ Protection executed! Block: ${receipt.blockNumber}`);
      return tx.hash;
    } catch (error: any) {
      console.error('Failed to protect tokens:', error);
      throw new Error(`Protection failed: ${error.message || 'Unknown error'}`);
    }
  }

  async batchProtectTokens(
    walletAddress: string,
    tokens: Array<{
      address: string;
      amount: bigint;
      threatLevel: number;
      reason: string;
    }>
  ): Promise<string> {
    try {
      const tokenAddresses = tokens.map(t => t.address);
      const amounts = tokens.map(t => t.amount);
      const threatLevels = tokens.map(t => t.threatLevel);
      const reasons = tokens.map(t => t.reason);

      console.log(`🛡️  Batch protecting ${tokens.length} tokens for wallet ${walletAddress}`);

      const tx = await this.vaultContract.batchProtectTokens(
        walletAddress,
        tokenAddresses,
        amounts,
        threatLevels,
        reasons
      );

      console.log(`   Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();

      console.log(`✅ Batch protection executed! Block: ${receipt.blockNumber}`);
      return tx.hash;
    } catch (error: any) {
      console.error('Failed to batch protect tokens:', error);
      throw new Error(`Batch protection failed: ${error.message || 'Unknown error'}`);
    }
  }

  async getProtectedBalance(walletAddress: string, tokenAddress: string): Promise<bigint> {
    try {
      return await this.vaultContract.getProtectedBalance(walletAddress, tokenAddress);
    } catch (error) {
      console.error(`Failed to get protected balance:`, error);
      return 0n;
    }
  }

  async getGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || 0n;
    } catch (error) {
      console.error('Failed to get gas price:', error);
      return 0n;
    }
  }

  async getBalance(): Promise<bigint> {
    try {
      return await this.provider.getBalance(this.guardianWallet.address);
    } catch (error) {
      console.error('Failed to get guardian balance:', error);
      return 0n;
    }
  }
}
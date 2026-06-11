import { ethers } from 'ethers';
import { GUARDIAN_VAULT_ABI, THREAT_REGISTRY_ABI, ERC20_ABI, getContractAddresses } from "../config/contracts.js";
export class BlockchainService {
    provider;
    guardianWallet;
    vaultContract;
    registryContract;
    network;
    constructor(rpcUrl, guardianPrivateKey, network = 'bscTestnet') {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.guardianWallet = new ethers.Wallet(guardianPrivateKey, this.provider);
        this.network = network;
        const addresses = getContractAddresses(network);
        this.vaultContract = new ethers.Contract(addresses.GuardianVault, GUARDIAN_VAULT_ABI, this.guardianWallet);
        this.registryContract = new ethers.Contract(addresses.ThreatRegistry, THREAT_REGISTRY_ABI, this.provider);
    }
    async getGuardianAddress() {
        return this.guardianWallet.address;
    }
    async verifyGuardianRole() {
        try {
            const contractGuardian = await this.vaultContract.guardian();
            const myAddress = await this.getGuardianAddress();
            return contractGuardian.toLowerCase() === myAddress.toLowerCase();
        }
        catch (error) {
            console.error('Failed to verify guardian role:', error);
            return false;
        }
    }
    async isWalletProtected(walletAddress) {
        try {
            return await this.vaultContract.isWalletProtected(walletAddress);
        }
        catch (error) {
            console.error(`Failed to check protection status for ${walletAddress}:`, error);
            return false;
        }
    }
    async getTokenBalance(walletAddress, tokenAddress) {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
            return await tokenContract.balanceOf(walletAddress);
        }
        catch (error) {
            console.error(`Failed to get token balance for ${tokenAddress}:`, error);
            return 0n;
        }
    }
    async getThreatScore(contractAddress) {
        try {
            return await this.registryContract.getAggregateThreatScore(contractAddress);
        }
        catch (error) {
            console.error(`Failed to get threat score for ${contractAddress}:`, error);
            return 0;
        }
    }
    async isVerifiedThreat(contractAddress) {
        try {
            return await this.registryContract.isVerifiedThreat(contractAddress);
        }
        catch (error) {
            console.error(`Failed to check verified threat for ${contractAddress}:`, error);
            return false;
        }
    }
    async getThreatReports(contractAddress) {
        try {
            const reports = await this.registryContract.getAllReports(contractAddress);
            return reports.map((r) => ({
                reporter: r.reporter,
                timestamp: r.timestamp,
                threatLevel: r.threatLevel,
                threatType: r.threatType,
                evidence: r.evidence,
                verified: r.verified,
                upvotes: r.upvotes,
            }));
        }
        catch (error) {
            console.error(`Failed to get threat reports for ${contractAddress}:`, error);
            return [];
        }
    }
    async protectTokens(walletAddress, tokenAddress, amount, threatLevel, reason) {
        try {
            console.log(`🛡️  Protecting ${ethers.formatEther(amount)} tokens from ${tokenAddress}`);
            console.log(`   Wallet: ${walletAddress}`);
            console.log(`   Threat Level: ${threatLevel}`);
            console.log(`   Reason: ${reason}`);
            const tx = await this.vaultContract.protectTokens(walletAddress, tokenAddress, amount, threatLevel, reason);
            console.log(`   Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Protection executed! Block: ${receipt.blockNumber}`);
            return tx.hash;
        }
        catch (error) {
            console.error('Failed to protect tokens:', error);
            throw new Error(`Protection failed: ${error.message || 'Unknown error'}`);
        }
    }
    async batchProtectTokens(walletAddress, tokens) {
        try {
            const tokenAddresses = tokens.map(t => t.address);
            const amounts = tokens.map(t => t.amount);
            const threatLevels = tokens.map(t => t.threatLevel);
            const reasons = tokens.map(t => t.reason);
            console.log(`🛡️  Batch protecting ${tokens.length} tokens for wallet ${walletAddress}`);
            const tx = await this.vaultContract.batchProtectTokens(walletAddress, tokenAddresses, amounts, threatLevels, reasons);
            console.log(`   Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Batch protection executed! Block: ${receipt.blockNumber}`);
            return tx.hash;
        }
        catch (error) {
            console.error('Failed to batch protect tokens:', error);
            throw new Error(`Batch protection failed: ${error.message || 'Unknown error'}`);
        }
    }
    async getProtectedBalance(walletAddress, tokenAddress) {
        try {
            return await this.vaultContract.getProtectedBalance(walletAddress, tokenAddress);
        }
        catch (error) {
            console.error(`Failed to get protected balance:`, error);
            return 0n;
        }
    }
    async getGasPrice() {
        try {
            const feeData = await this.provider.getFeeData();
            return feeData.gasPrice || 0n;
        }
        catch (error) {
            console.error('Failed to get gas price:', error);
            return 0n;
        }
    }
    async getBalance() {
        try {
            return await this.provider.getBalance(this.guardianWallet.address);
        }
        catch (error) {
            console.error('Failed to get guardian balance:', error);
            return 0n;
        }
    }
}
//# sourceMappingURL=blockchain.js.map
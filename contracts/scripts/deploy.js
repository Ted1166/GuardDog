import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explorer URLs per chain ID
const EXPLORERS = {
  97:      "https://testnet.bscscan.com",
  56:      "https://bscscan.com",
  5611:    "https://testnet.opbnbscan.com",
  204:     "https://opbnbscan.com",
  84532:   "https://sepolia.basescan.org",
  8453:    "https://basescan.org",
  11155111:"https://sepolia.etherscan.io",
  1:       "https://etherscan.io",
};

async function main() {
  console.log("🐕 GuardDog Multichain Deployment Starting...\n");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "native token\n");

  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const explorer = EXPLORERS[chainId] || "https://explorer.unknown";

  // Deploy ThreatRegistry
  console.log("📋 Deploying ThreatRegistry...");
  const ThreatRegistry = await hre.ethers.getContractFactory("ThreatRegistry");
  const threatRegistry = await ThreatRegistry.deploy(deployer.address);
  await threatRegistry.waitForDeployment();
  const threatRegistryAddress = await threatRegistry.getAddress();
  console.log("✅ ThreatRegistry:", threatRegistryAddress);
  console.log(`   ${explorer}/address/${threatRegistryAddress}`);

  const deployTx1 = await threatRegistry.deploymentTransaction();
  const receipt1 = await deployTx1?.wait();

  // Deploy GuardianVault
  console.log("\n🛡️  Deploying GuardianVault...");
  const GuardianVault = await hre.ethers.getContractFactory("GuardianVault");
  const guardianVault = await GuardianVault.deploy(deployer.address);
  await guardianVault.waitForDeployment();
  const guardianVaultAddress = await guardianVault.getAddress();
  console.log("✅ GuardianVault:", guardianVaultAddress);
  console.log(`   ${explorer}/address/${guardianVaultAddress}`);

  const deployTx2 = await guardianVault.deploymentTransaction();
  const receipt2 = await deployTx2?.wait();

  const totalGas = (receipt1?.gasUsed || 0n) + (receipt2?.gasUsed || 0n);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log(`Network:   ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Gas Used:  ${totalGas.toString()}`);
  console.log("\n📝 Add these to your contracts.ts:");
  console.log(`ThreatRegistry:  "${threatRegistryAddress}"`);
  console.log(`GuardianVault:   "${guardianVaultAddress}"`);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasUsed: totalGas.toString(),
    explorer,
    contracts: {
      ThreatRegistry: threatRegistryAddress,
      GuardianVault: guardianVaultAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  const fileName = `deployment-${network.name}-${chainId}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, fileName),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n💾 Saved to: deployments/${fileName}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
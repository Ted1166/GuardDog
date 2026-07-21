import hre from "hardhat";

async function main() {
  const [deployer, victim, reporter] = await hre.ethers.getSigners();
  console.log("Deployer/Guardian:", deployer.address);
  console.log("Victim wallet:    ", victim.address);
  console.log("Reporter:         ", reporter.address);

  console.log("\nDeploying ThreatRegistry...");
  const ThreatRegistry = await hre.ethers.getContractFactory("ThreatRegistry");
  const registry = await ThreatRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ThreatRegistry:", registryAddress);

  console.log("\nDeploying GuardianVault...");
  const GuardianVault = await hre.ethers.getContractFactory("GuardianVault");
  const vault = await GuardianVault.deploy(deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("GuardianVault:", vaultAddress);

  console.log("\nDeploying TestToken...");
  const TestToken = await hre.ethers.getContractFactory("TestToken", deployer);
  const token = await TestToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("TestToken:", tokenAddress);

  console.log("\nFunding victim wallet with 500 TEST...");
  await (await token.transfer(victim.address, hre.ethers.parseEther("500"))).wait();

  console.log("Victim enabling protection...");
  await (await vault.connect(victim).enableProtection()).wait();

  console.log("Victim approving vault to pull TEST...");
  await (await token.connect(victim).approve(vaultAddress, hre.ethers.parseEther("500"))).wait();

  console.log("Reporter flagging TestToken as a threat (level 95, auto-verified)...");
  await (
    await registry
      .connect(reporter)
      .reportThreat(tokenAddress, 95, "Honeypot", "Local demo threat for GuardDog agent test run")
  ).wait();

  console.log("\n=== Demo environment ready ===");
  console.log(`NETWORK=bscTestnet`);
  console.log(`BSC_RPC_URL=http://127.0.0.1:8545`);
  console.log(`GUARDIAN_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`THREAT_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`GUARDIAN_PRIVATE_KEY=<hardhat node account #0 private key, printed when "npx hardhat node" started>`);
  console.log(`MONITORED_WALLETS=${victim.address}`);
  console.log(`MONITORED_TOKENS=${tokenAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

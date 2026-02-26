import hre from "hardhat";

async function main() {
  const privateKey = "";
  const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);
  
  console.log("Enabling protection with wallet:", wallet.address);

  const vault = await hre.ethers.getContractAt(
    "GuardianVault",
    "0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9",
    wallet
  );

  const tx = await vault.enableProtection();
  console.log("Transaction hash:", tx.hash);
  
  await tx.wait();
  console.log("✅ Protection enabled!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
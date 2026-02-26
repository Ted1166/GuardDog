import hre from "hardhat";

async function main() {
  const privateKey = "";
  const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);

  const token = await hre.ethers.getContractAt(
    "TestToken",
    "0xA6e12043F663fc803ae467e9F77A46E4754e3dC8",
    wallet
  );

  const vaultAddress = "0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9";
  const amount = hre.ethers.parseEther("2000000"); 

  const tx = await token.approve(vaultAddress, amount);
  console.log("Approval tx:", tx.hash);
  await tx.wait();
  console.log("✅ Approved GuardianVault to spend tokens!");
}

main().catch(console.error);
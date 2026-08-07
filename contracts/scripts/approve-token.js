import hre from "hardhat";

async function main() {
  const privateKey = "";
  const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);

  const token = await hre.ethers.getContractAt(
    "TestToken",
    "0x23A524E860294Cf35050d8dA281e288649322a41",
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
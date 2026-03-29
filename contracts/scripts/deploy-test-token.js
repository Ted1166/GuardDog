import hre from "hardhat";

async function main() {
  const privateKey = "";
  const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);

  const TestToken = await hre.ethers.getContractFactory("TestToken", wallet);
  const token = await TestToken.deploy();
  await token.waitForDeployment();

  console.log("TestToken deployed to:", await token.getAddress());
}

main().catch(console.error);
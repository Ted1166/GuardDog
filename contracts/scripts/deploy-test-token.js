import hre from "hardhat";

async function main() {
  const privateKey = "f2620bd9f41c1a7a8e284bb9cb1bd6f35e80229151b3c062572ad5b0aa9f5017";
  const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);

  const TestToken = await hre.ethers.getContractFactory("TestToken", wallet);
  const token = await TestToken.deploy();
  await token.waitForDeployment();

  console.log("TestToken deployed to:", await token.getAddress());
}

main().catch(console.error);
import hre from "hardhat";

async function main() {
  const privateKey = "";
  const wallet = new hre.ethers.Wallet(privateKey, hre.ethers.provider);

  const registry = await hre.ethers.getContractAt(
    "ThreatRegistry",
    "0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9",
    wallet
  );

  const testTokenAddress = "0xA6e12043F663fc803ae467e9F77A46E4754e3dC8"; 
  
  const tx = await registry.reportThreat(
    testTokenAddress,
    85, 
    "Honeypot",
    "Test threat for hackathon demo"
  );
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  console.log("✅ Threat reported!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
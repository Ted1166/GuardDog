import hre from "hardhat";

async function main() {
  const vault = await hre.ethers.getContractAt(
    "GuardianVault",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );
  const balance = await vault.getProtectedBalance(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  );
  console.log("Protected balance in vault:", hre.ethers.formatEther(balance), "TEST");
}

main().catch(console.error);

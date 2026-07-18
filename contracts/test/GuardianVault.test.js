import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

const THREAT_LEVEL = 80;
const RECOVERY_TIMELOCK = 48 * 60 * 60;
const COOLDOWN = 5 * 60;

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("GuardianVault", function () {
  let owner, guardian, alice, bob, recovery, attacker;
  let vault, token;

  beforeEach(async function () {
    [owner, guardian, alice, bob, recovery, attacker] = await ethers.getSigners();

    const Vault = await ethers.getContractFactory("GuardianVault", owner);
    vault = await Vault.deploy(guardian.address);
    await vault.waitForDeployment();

    const Token = await ethers.getContractFactory("TestToken", owner);
    token = await Token.deploy();
    await token.waitForDeployment();

    for (const user of [alice, bob]) {
      await token.transfer(user.address, ethers.parseEther("1000"));
      await vault.connect(user).enableProtection();
      await token.connect(user).approve(vault.target, ethers.MaxUint256);
    }
  });

  async function protect(wallet, tkn, amount) {
    return vault
      .connect(guardian)
      .protectTokens(wallet.address, tkn.target, amount, THREAT_LEVEL, "test threat");
  }

  describe("recovery address", function () {
    it("first set is immediate, no proof beyond msg.sender needed", async function () {
      await expect(vault.connect(alice).setRecoveryAddress(recovery.address))
        .to.emit(vault, "RecoveryAddressSet")
        .withArgs(alice.address, recovery.address);
      expect(await vault.recoveryAddress(alice.address)).to.equal(recovery.address);
    });

    it("rejects zero address and self", async function () {
      await expect(vault.connect(alice).setRecoveryAddress(ethers.ZeroAddress)).to.be.revertedWith(
        "GuardDog: Invalid recovery"
      );
      await expect(vault.connect(alice).setRecoveryAddress(alice.address)).to.be.revertedWith(
        "GuardDog: Recovery is self"
      );
    });

    it("changing an existing recovery goes through the 48h timelock", async function () {
      await vault.connect(alice).setRecoveryAddress(recovery.address);
      await vault.connect(alice).setRecoveryAddress(attacker.address);

      // still the old one until the timelock passes
      expect(await vault.recoveryAddress(alice.address)).to.equal(recovery.address);
      await expect(vault.finalizeRecoveryChange(alice.address)).to.be.revertedWith(
        "GuardDog: Timelock active"
      );

      await increaseTime(RECOVERY_TIMELOCK + 1);
      await vault.finalizeRecoveryChange(alice.address);
      expect(await vault.recoveryAddress(alice.address)).to.equal(attacker.address);
    });

    it("current recovery address can veto a pending change", async function () {
      await vault.connect(alice).setRecoveryAddress(recovery.address);
      await vault.connect(alice).setRecoveryAddress(attacker.address);

      await expect(vault.connect(recovery).cancelRecoveryChange(alice.address))
        .to.emit(vault, "RecoveryChangeCancelled")
        .withArgs(alice.address, attacker.address, recovery.address);

      await increaseTime(RECOVERY_TIMELOCK + 1);
      await expect(vault.finalizeRecoveryChange(alice.address)).to.be.revertedWith(
        "GuardDog: No pending change"
      );
      expect(await vault.recoveryAddress(alice.address)).to.equal(recovery.address);
    });

    it("a stranger cannot cancel a pending change", async function () {
      await vault.connect(alice).setRecoveryAddress(recovery.address);
      await vault.connect(alice).setRecoveryAddress(bob.address);
      await expect(vault.connect(attacker).cancelRecoveryChange(alice.address)).to.be.revertedWith(
        "GuardDog: Not authorized"
      );
    });

    it("recovery address can pull rescued funds; funds go to recovery, not the wallet", async function () {
      await vault.connect(alice).setRecoveryAddress(recovery.address);
      await protect(alice, token, ethers.parseEther("100"));

      await expect(vault.connect(recovery).recoveryWithdraw(alice.address, token.target))
        .to.emit(vault, "RecoveryWithdrawal")
        .withArgs(alice.address, recovery.address, token.target, ethers.parseEther("100"));

      expect(await token.balanceOf(recovery.address)).to.equal(ethers.parseEther("100"));
      expect(await vault.protectedBalances(alice.address, token.target)).to.equal(0n);
    });

    it("nobody else can recovery-withdraw", async function () {
      await vault.connect(alice).setRecoveryAddress(recovery.address);
      await protect(alice, token, ethers.parseEther("100"));

      for (const caller of [attacker, bob, guardian, owner, alice]) {
        await expect(
          vault.connect(caller).recoveryWithdraw(alice.address, token.target)
        ).to.be.revertedWith("GuardDog: Not recovery address");
      }
    });
  });

  describe("fee-on-transfer accounting", function () {
    let feeToken;

    beforeEach(async function () {
      const FeeToken = await ethers.getContractFactory("FeeOnTransferToken", owner);
      feeToken = await FeeToken.deploy();
      await feeToken.waitForDeployment();
      for (const user of [alice, bob]) {
        await feeToken.transfer(user.address, ethers.parseEther("1000"));
        await feeToken.connect(user).approve(vault.target, ethers.MaxUint256);
      }
    });

    it("credits what the vault received, not the requested amount", async function () {
      await protect(alice, feeToken, ethers.parseEther("100"));
      expect(await vault.protectedBalances(alice.address, feeToken.target)).to.equal(
        ethers.parseEther("95")
      );
      expect(await vault.totalProtected(feeToken.target)).to.equal(ethers.parseEther("95"));
    });

    it("every owner can withdraw their full recorded balance", async function () {
      await protect(alice, feeToken, ethers.parseEther("100"));
      await protect(bob, feeToken, ethers.parseEther("100"));

      await vault.connect(alice).withdrawAll(feeToken.target);
      // before the fix this reverted: the vault held less than the ledger claimed
      await vault.connect(bob).withdrawAll(feeToken.target);

      expect(await vault.totalProtected(feeToken.target)).to.equal(0n);
    });

    it("normal tokens are still credited in full", async function () {
      await protect(alice, token, ethers.parseEther("100"));
      expect(await vault.protectedBalances(alice.address, token.target)).to.equal(
        ethers.parseEther("100")
      );
    });

    it("batchProtectTokens uses received amounts too", async function () {
      await vault
        .connect(guardian)
        .batchProtectTokens(
          alice.address,
          [token.target, feeToken.target],
          [ethers.parseEther("50"), ethers.parseEther("50")],
          [THREAT_LEVEL, THREAT_LEVEL],
          ["threat a", "threat b"]
        );

      expect(await vault.protectedBalances(alice.address, token.target)).to.equal(
        ethers.parseEther("50")
      );
      expect(await vault.protectedBalances(alice.address, feeToken.target)).to.equal(
        ethers.parseEther("47.5")
      );
    });
  });

  describe("existing owner-only access still holds", function () {
    it("only the original wallet can withdraw when no recovery is involved", async function () {
      await protect(alice, token, ethers.parseEther("100"));
      await expect(vault.connect(bob).withdrawAll(token.target)).to.be.revertedWith(
        "GuardDog: No balance"
      );
      await vault.connect(alice).withdrawAll(token.target);
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
    });

    it("cooldown still applies per wallet+token", async function () {
      await protect(alice, token, ethers.parseEther("10"));
      await expect(protect(alice, token, ethers.parseEther("10"))).to.be.revertedWith(
        "GuardDog: Cooldown active"
      );
      await increaseTime(COOLDOWN + 1);
      await protect(alice, token, ethers.parseEther("10"));
    });
  });
});

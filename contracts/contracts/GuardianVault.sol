// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract GuardianVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
        
    event ProtectionEnabled(address indexed wallet, uint256 timestamp);
    event ProtectionDisabled(address indexed wallet, uint256 timestamp);
    event TokensProtected(address indexed wallet, address indexed token, uint256 amount, uint8 threatLevel);
    event ThreatDetected(address indexed token, address indexed spender, uint8 threatLevel, string reason);
    event TokensWithdrawn(address indexed wallet, address indexed token, uint256 amount);
    event EmergencyWithdrawal(address indexed wallet, address indexed token, uint256 amount);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    event RecoveryAddressSet(address indexed wallet, address indexed recovery);
    event RecoveryChangeRequested(address indexed wallet, address indexed newRecovery, uint256 effectiveTime);
    event RecoveryChangeCancelled(address indexed wallet, address indexed cancelledRecovery, address indexed cancelledBy);
    event RecoveryWithdrawal(address indexed wallet, address indexed recovery, address indexed token, uint256 amount);

    address public guardian;

    mapping(address => bool) public isProtected;
    mapping(address => uint256) public protectionStartTime;
    mapping(address => mapping(address => uint256)) public protectedBalances;
    mapping(address => uint256) public totalProtected;
    mapping(address => mapping(address => uint256)) public lastProtectionTime;

    mapping(address => address) public recoveryAddress;
    mapping(address => address) public pendingRecoveryAddress;
    mapping(address => uint256) public recoveryChangeEta;

    uint256 public constant PROTECTION_COOLDOWN = 5 minutes;
    uint8 public constant THREAT_THRESHOLD = 75;
    uint256 public constant RECOVERY_TIMELOCK = 48 hours;
    uint256 public maxProtectionAmount;
    
    
    modifier onlyGuardian() {
        require(msg.sender == guardian, "GuardDog: Not authorized guardian");
        _;
    }
    
    modifier onlyProtected(address wallet) {
        require(isProtected[wallet], "GuardDog: Wallet not protected");
        _;
    }
    
    
    constructor(address _guardian) Ownable(msg.sender) {
        require(_guardian != address(0), "GuardDog: Invalid guardian");
        guardian = _guardian;
        maxProtectionAmount = type(uint256).max; 
    }
    

    function enableProtection() external {
        require(!isProtected[msg.sender], "GuardDog: Already protected");
        
        isProtected[msg.sender] = true;
        protectionStartTime[msg.sender] = block.timestamp;
        
        emit ProtectionEnabled(msg.sender, block.timestamp);
    }

    function disableProtection() external onlyProtected(msg.sender) {
        isProtected[msg.sender] = false;
        emit ProtectionDisabled(msg.sender, block.timestamp);
    }

    /// Set while the wallet key is still trusted. First set is immediate;
    /// any later change goes through a 48h timelock the current recovery
    /// address can veto, so a stolen key cannot silently redirect funds.
    function setRecoveryAddress(address newRecovery) external {
        require(newRecovery != address(0), "GuardDog: Invalid recovery");
        require(newRecovery != msg.sender, "GuardDog: Recovery is self");

        if (recoveryAddress[msg.sender] == address(0)) {
            recoveryAddress[msg.sender] = newRecovery;
            emit RecoveryAddressSet(msg.sender, newRecovery);
        } else {
            pendingRecoveryAddress[msg.sender] = newRecovery;
            recoveryChangeEta[msg.sender] = block.timestamp + RECOVERY_TIMELOCK;
            emit RecoveryChangeRequested(msg.sender, newRecovery, recoveryChangeEta[msg.sender]);
        }
    }

    function finalizeRecoveryChange(address wallet) external {
        address pending = pendingRecoveryAddress[wallet];
        require(pending != address(0), "GuardDog: No pending change");
        require(block.timestamp >= recoveryChangeEta[wallet], "GuardDog: Timelock active");

        recoveryAddress[wallet] = pending;
        delete pendingRecoveryAddress[wallet];
        delete recoveryChangeEta[wallet];
        emit RecoveryAddressSet(wallet, pending);
    }

    function cancelRecoveryChange(address wallet) external {
        require(
            msg.sender == recoveryAddress[wallet] || msg.sender == wallet,
            "GuardDog: Not authorized"
        );
        address pending = pendingRecoveryAddress[wallet];
        require(pending != address(0), "GuardDog: No pending change");

        delete pendingRecoveryAddress[wallet];
        delete recoveryChangeEta[wallet];
        emit RecoveryChangeCancelled(wallet, pending, msg.sender);
    }

    /// Escape hatch for a compromised wallet: the pre-designated recovery
    /// address pulls the wallet's entire protected balance to itself, so
    /// funds never touch the compromised key again.
    function recoveryWithdraw(address wallet, address token) external nonReentrant {
        require(msg.sender == recoveryAddress[wallet], "GuardDog: Not recovery address");

        uint256 amount = protectedBalances[wallet][token];
        require(amount > 0, "GuardDog: No balance");

        protectedBalances[wallet][token] = 0;
        totalProtected[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);

        emit RecoveryWithdrawal(wallet, msg.sender, token, amount);
    }
    
    function protectTokens(
        address wallet,
        address token,
        uint256 amount,
        uint8 threatLevel,
        string calldata reason
    ) external onlyGuardian onlyProtected(wallet) nonReentrant {
        require(token != address(0), "GuardDog: Invalid token");
        require(amount > 0, "GuardDog: Zero amount");
        require(amount <= maxProtectionAmount, "GuardDog: Amount exceeds limit");
        require(threatLevel >= THREAT_THRESHOLD, "GuardDog: Threat level too low");
        
        require(
            block.timestamp >= lastProtectionTime[wallet][token] + PROTECTION_COOLDOWN,
            "GuardDog: Cooldown active"
        );
        
        lastProtectionTime[wallet][token] = block.timestamp;

        // Credit what the vault actually received, not the requested amount —
        // fee-on-transfer tokens deliver less than `amount`, and crediting the
        // full amount would let earlier withdrawers drain later ones' shares.
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(wallet, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;
        require(received > 0, "GuardDog: Nothing received");

        protectedBalances[wallet][token] += received;
        totalProtected[token] += received;

        emit ThreatDetected(token, address(0), threatLevel, reason);
        emit TokensProtected(wallet, token, received, threatLevel);
    }
    

    function batchProtectTokens(
        address wallet,
        address[] calldata tokens,
        uint256[] calldata amounts,
        uint8[] calldata threatLevels,
        string[] calldata reasons
    ) external onlyGuardian onlyProtected(wallet) nonReentrant {
        require(
            tokens.length == amounts.length && 
            amounts.length == threatLevels.length &&
            threatLevels.length == reasons.length,
            "GuardDog: Array length mismatch"
        );
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (threatLevels[i] >= THREAT_THRESHOLD && amounts[i] > 0) {

                if (block.timestamp < lastProtectionTime[wallet][tokens[i]] + PROTECTION_COOLDOWN) {
                    continue;
                }
                
                lastProtectionTime[wallet][tokens[i]] = block.timestamp;

                uint256 balanceBefore = IERC20(tokens[i]).balanceOf(address(this));
                IERC20(tokens[i]).safeTransferFrom(wallet, address(this), amounts[i]);
                uint256 received = IERC20(tokens[i]).balanceOf(address(this)) - balanceBefore;
                if (received == 0) {
                    continue;
                }

                protectedBalances[wallet][tokens[i]] += received;
                totalProtected[tokens[i]] += received;

                emit ThreatDetected(tokens[i], address(0), threatLevels[i], reasons[i]);
                emit TokensProtected(wallet, tokens[i], received, threatLevels[i]);
            }
        }
    }
    

    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "GuardDog: Zero amount");
        require(protectedBalances[msg.sender][token] >= amount, "GuardDog: Insufficient balance");
        
        protectedBalances[msg.sender][token] -= amount;
        totalProtected[token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit TokensWithdrawn(msg.sender, token, amount);
    }
    

    function withdrawAll(address token) external nonReentrant {
        uint256 amount = protectedBalances[msg.sender][token];
        require(amount > 0, "GuardDog: No balance");
        
        protectedBalances[msg.sender][token] = 0;
        totalProtected[token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit TokensWithdrawn(msg.sender, token, amount);
    }
    

    function emergencyWithdraw(address token) external nonReentrant {
        uint256 amount = protectedBalances[msg.sender][token];
        require(amount > 0, "GuardDog: No balance");
        
        protectedBalances[msg.sender][token] = 0;
        totalProtected[token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdrawal(msg.sender, token, amount);
    }
    

    function isWalletProtected(address wallet) external view returns (bool) {
        return isProtected[wallet];
    }
    

    function getProtectionDuration(address wallet) external view returns (uint256) {
        if (!isProtected[wallet]) return 0;
        return block.timestamp - protectionStartTime[wallet];
    }
    

    function getProtectedBalance(address wallet, address token) external view returns (uint256) {
        return protectedBalances[wallet][token];
    }
    
    function getTotalProtected(address token) external view returns (uint256) {
        return totalProtected[token];
    }
    
    function getTimeUntilNextProtection(address wallet, address token) external view returns (uint256) {
        uint256 nextAllowed = lastProtectionTime[wallet][token] + PROTECTION_COOLDOWN;
        if (block.timestamp >= nextAllowed) return 0;
        return nextAllowed - block.timestamp;
    }
    
    function updateGuardian(address newGuardian) external onlyOwner {
        require(newGuardian != address(0), "GuardDog: Invalid guardian");
        address oldGuardian = guardian;
        guardian = newGuardian;
        emit GuardianUpdated(oldGuardian, newGuardian);
    }
    
    function updateMaxProtectionAmount(uint256 newMax) external onlyOwner {
        maxProtectionAmount = newMax;
    }
    
    function pauseGuardian() external onlyOwner {
        address oldGuardian = guardian;
        guardian = address(0);
        emit GuardianUpdated(oldGuardian, address(0));
    }
}

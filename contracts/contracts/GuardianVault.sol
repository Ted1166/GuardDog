// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IThreatRegistry {
    function getAggregateThreatScore(address contractAddress) external view returns (uint8);
}

contract GuardianVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event ProtectionEnabled(address indexed wallet, uint256 timestamp);
    event ProtectionDisabled(address indexed wallet, uint256 timestamp);
    event TokensProtected(address indexed wallet, address indexed token, uint256 amount, uint8 threatLevel);
    event ThreatDetected(address indexed token, address indexed spender, uint8 threatLevel, string reason);
    event TokensWithdrawn(address indexed wallet, address indexed token, uint256 amount);
    event EmergencyWithdrawal(address indexed wallet, address indexed token, uint256 amount);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    event TokenRegistered(address indexed wallet, address indexed token);
    event TokenUnregistered(address indexed wallet, address indexed token);
    event UserMaxProtectionUpdated(address indexed wallet, address indexed token, uint256 maxAmount);
    event MaxProtectionAmountUpdated(uint256 oldMax, uint256 newMax);

    IThreatRegistry public immutable threatRegistry;
    address public guardian;

    mapping(address => bool) public isProtected;
    mapping(address => uint256) public protectionStartTime;
    mapping(address => mapping(address => uint256)) public protectedBalances;
    mapping(address => uint256) public totalProtected;
    mapping(address => mapping(address => uint256)) public lastProtectionTime;

    // Tokens a wallet has opted into monitoring for.
    // `_tokenIndexPlusOne` stores (index + 1) so 0 means "not registered".
    mapping(address => address[]) private _registeredTokens;
    mapping(address => mapping(address => uint256)) private _tokenIndexPlusOne;

    // Per-user, per-token cap. 0 = fall back to global `maxProtectionAmount`.
    mapping(address => mapping(address => uint256)) public userMaxProtection;

    uint256 public constant PROTECTION_COOLDOWN = 5 minutes;
    uint8 public constant THREAT_THRESHOLD = 75;
    uint256 public maxProtectionAmount;
    
    
    modifier onlyGuardian() {
        require(msg.sender == guardian, "GuardDog: Not authorized guardian");
        _;
    }
    
    modifier onlyProtected(address wallet) {
        require(isProtected[wallet], "GuardDog: Wallet not protected");
        _;
    }
    
    
    constructor(address _guardian, address _threatRegistry) Ownable(msg.sender) {
        require(_guardian != address(0), "GuardDog: Invalid guardian");
        require(_threatRegistry != address(0), "GuardDog: Invalid registry");
        guardian = _guardian;
        threatRegistry = IThreatRegistry(_threatRegistry);
        maxProtectionAmount = type(uint256).max;
    }

    function _effectiveCap(address wallet, address token) internal view returns (uint256) {
        uint256 userCap = userMaxProtection[wallet][token];
        return userCap == 0 ? maxProtectionAmount : userCap;
    }

    function setUserMaxProtection(address token, uint256 maxAmount) external {
        require(token != address(0), "GuardDog: Invalid token");
        userMaxProtection[msg.sender][token] = maxAmount;
        emit UserMaxProtectionUpdated(msg.sender, token, maxAmount);
    }

    function getEffectiveCap(address wallet, address token) external view returns (uint256) {
        return _effectiveCap(wallet, token);
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

    function registerToken(address token) external onlyProtected(msg.sender) {
        require(token != address(0), "GuardDog: Invalid token");
        require(_tokenIndexPlusOne[msg.sender][token] == 0, "GuardDog: Already registered");

        _registeredTokens[msg.sender].push(token);
        _tokenIndexPlusOne[msg.sender][token] = _registeredTokens[msg.sender].length;

        emit TokenRegistered(msg.sender, token);
    }

    function unregisterToken(address token) external {
        uint256 indexPlusOne = _tokenIndexPlusOne[msg.sender][token];
        require(indexPlusOne != 0, "GuardDog: Not registered");

        address[] storage tokens = _registeredTokens[msg.sender];
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = tokens.length - 1;

        if (index != lastIndex) {
            address lastToken = tokens[lastIndex];
            tokens[index] = lastToken;
            _tokenIndexPlusOne[msg.sender][lastToken] = index + 1;
        }

        tokens.pop();
        delete _tokenIndexPlusOne[msg.sender][token];

        emit TokenUnregistered(msg.sender, token);
    }

    function getRegisteredTokens(address wallet) external view returns (address[] memory) {
        return _registeredTokens[wallet];
    }

    function isTokenRegistered(address wallet, address token) external view returns (bool) {
        return _tokenIndexPlusOne[wallet][token] != 0;
    }

    /// @dev Common protection logic. Returns true if tokens were moved.
    /// Reverts on hard failures (zero amount, cap, low threat, cooldown, zero receipt) when `strict` is true;
    /// returns false on those conditions when `strict` is false (used by the batch path to skip-and-continue).
    function _protect(
        address wallet,
        address token,
        uint256 amount,
        string calldata reason,
        bool strict
    ) internal returns (bool) {
        if (amount == 0) {
            if (strict) revert("GuardDog: Zero amount");
            return false;
        }
        if (amount > _effectiveCap(wallet, token)) {
            if (strict) revert("GuardDog: Amount exceeds cap");
            return false;
        }
        if (block.timestamp < lastProtectionTime[wallet][token] + PROTECTION_COOLDOWN) {
            if (strict) revert("GuardDog: Cooldown active");
            return false;
        }

        uint8 threatLevel = threatRegistry.getAggregateThreatScore(token);
        if (threatLevel < THREAT_THRESHOLD) {
            if (strict) revert("GuardDog: Threat level too low");
            return false;
        }

        lastProtectionTime[wallet][token] = block.timestamp;

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(wallet, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balanceBefore;

        if (received == 0) {
            if (strict) revert("GuardDog: No tokens received");
            return false;
        }

        protectedBalances[wallet][token] += received;
        totalProtected[token] += received;

        emit ThreatDetected(token, address(0), threatLevel, reason);
        emit TokensProtected(wallet, token, received, threatLevel);
        return true;
    }

    function protectTokens(
        address wallet,
        address token,
        uint256 amount,
        string calldata reason
    ) external onlyGuardian onlyProtected(wallet) nonReentrant {
        require(token != address(0), "GuardDog: Invalid token");
        _protect(wallet, token, amount, reason, true);
    }


    function batchProtectTokens(
        address wallet,
        address[] calldata tokens,
        uint256[] calldata amounts,
        string[] calldata reasons
    ) external onlyGuardian onlyProtected(wallet) nonReentrant {
        require(
            tokens.length == amounts.length &&
            amounts.length == reasons.length,
            "GuardDog: Array length mismatch"
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == address(0)) continue;
            _protect(wallet, tokens[i], amounts[i], reasons[i], false);
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
        uint256 oldMax = maxProtectionAmount;
        maxProtectionAmount = newMax;
        emit MaxProtectionAmountUpdated(oldMax, newMax);
    }
    
    function pauseGuardian() external onlyOwner {
        guardian = address(0);
        emit GuardianUpdated(guardian, address(0));
    }
}

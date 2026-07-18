// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// Test-only token that skims a 5% fee on every transfer, mimicking the
/// tax-token pattern GuardianVault must account for correctly.
contract FeeOnTransferToken is ERC20 {
    uint256 public constant FEE_BPS = 500;
    address public immutable feeCollector;

    constructor() ERC20("Fee Token", "FEE") {
        feeCollector = msg.sender;
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && to != feeCollector) {
            uint256 fee = (value * FEE_BPS) / 10000;
            super._update(from, feeCollector, fee);
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZigaToken is ERC20 {
    
    constructor() ERC20("ZigaToken", "ZIGA") {
        // Mint 1,000,000 tokens to the deployer
        // Remember: we multiply by 10^18 for decimals
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }
}
# BOT Chain Project Integration Guide

## Welcome to BOT Chain

BOT Chain is a high-performance and EVM-compatible Layer 1 blockchain specifically designed for AI Agents, DePIN, verifiable computing, and the protocol economy.

This guide provides project teams with complete, step-by-step instructions to integrate and launch on BOT Chain Mainnet quickly, securely, and efficiently.

## Official Links

| Resource | Link |
|---|---|
| Website | https://www.botchain.ai |
| Testnet Faucet (Get test BOT) | https://faucet.botchain.ai |
| DEX | https://dex.botchain.ai/#/swap · https://dev-docs.botchain.ai/docs/DEX/ |
| Cross-Chain Bridge | https://bridge.botchain.ai |
| Official Wallet | https://wallet.botchain.ai |
| Block Explorer | https://scan.botchain.ai |
| Developer Documentation | https://dev-docs.botchain.ai/docs/Developers/quick-guide/ |
| GitHub | https://github.com/BOTChain-bot |
| BOT Price API | https://dex-wallet.botchain.ai/api/graph/price?token=0xD5452816194a3784dBa983426cCe7c122F4abd30 |
| WBOT contract | `0xD5452816194a3784dBa983426cCe7c122F4abd30` |
| USDT contract on BOT Chain | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` |
| BOT Chain Brand Kit | https://drive.google.com/drive/folders/1AYVj_gvnffA4T-QyXN3opgWNG5M7oD_1 |
| ERC4337 testnet bundler point | https://bundler.bohr.life/rpc |
| ERC4337 mainnet bundler point | https://bundler.botchain.ai/rpc |

## Add BOT Chain to Your Wallet

### Supporting EVM Wallets

- **Bitget Wallet** — https://web3.bitget.com/
- **TokenPocket** — https://www.tokenpocket.pro
- **OKX Wallet**
- **MetaMask**

### Add BOT Chain through Chainlist

1. Visit https://chainlist.org/?search=bot+chain&testnets=true
2. Connect Wallet
3. Add BOT Chain to your wallet

### Add BOT Chain Manually

1. Open your wallet
2. Select **Network** → **Add Custom Network**
3. Fill in the following Mainnet information:

| Item | Parameter |
|---|---|
| Network Name | BOT Chain |
| Default RPC URL | https://rpc.botchain.ai |
| Chain ID | 677 |
| Currency Symbol / Native Token | BOT |
| Block Explorer URL | https://scan.botchain.ai/ |

## Project Integration Steps

1. **Step 1:** Add BOT Chain Mainnet to your wallet (see instructions above)
2. **Step 2:** Obtain test tokens from the faucet for testing
3. **Step 3:** Deploy your smart contracts using Hardhat / Foundry / Remix via the official RPC
4. **Step 4:** Verify your contracts on the block explorer and test your product

## Security & Audit Reports

All core contracts of BOT Chain have been professionally audited by CertiK:

- **BOT Chain Audit Report:** https://www.botchain.ai/docs/Chain.pdf
- **BOT DEX Audit Report:** https://dex.botchain.ai/docs/Dex-Audit-Report.pdf
- **BOT Bridge Audit Report:** https://bridge.botchain.ai/docs/Bridge-Audit-Report.pdf
- **CertiK Skynet Project Insight:** https://skynet.certik.com/projects/botchain

Welcome to build the future of an intelligent economy together on BOT Chain! If you need any assistance during integration, please feel free to contact the BOT Chain team.

## Additional Information (其他信息)

| Item | Value |
|---|---|
| CA token on mainnet | https://scan.botchain.ai/token/0x546307af427902A75771434Df831d88219784E19 |
| WSS endpoint | `wss://ws-rpc.botchain.ai` · `wss://ws-rpc-debug.botchain.ai/` |

### Contract Addresses on BDEX

```json
"mainnet": {
  "chainId": 677,
  "deployer": "0xf0A2f56505f0dfea980567DA88830146B6b5c0b2",
  "tokens": {
    "wbot": "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    "usdt": "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"
  },
  "v3": {
    "deployedAt": "2026-02-26T05:57:53.573Z",
    "factory": "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
    "swapRouter": "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
    "quoter": "0x1e8bb093ade678ABAa49623D4c3a1a7F37716DEd",
    "quoterV2": "0x034A705b36067cff99ABf5C662Be881cBd8d0176",
    "botdexMulticall": "0x5FC578616301E56137dc3872593d496668525362",
    "nftDescriptor": "0x829D215662e89881adE3C7b15a0af812c4364dA4",
    "nftPositionDescriptor": "0x89b084964AF60BeE7bEc324Ea62267C97f6656E3",
    "nftPositionManager": "0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090"
  }
}
```

---

## BOT Chain 项目集成指南

### 欢迎来到 BOT Chain

BOT Chain 是专为 AI Agent、DePIN、可验证计算和协议经济设计的高性能、EVM兼容的 Layer 1 公链。

本指南为项目方提供从接入到上线的完整操作指引，帮助您快速、安全、高效地完成 BOT Chain 主网集成。

| 资源 | 链接 |
|---|---|
| 官网 | https://www.botchain.ai |
| 测试网（获取测试 BOT） | https://faucet.botchain.ai |
| DEX | https://dex.botchain.ai/#/swap · https://dev-docs.botchain.ai/zh-Hans/docs/DEX/ |
| 跨链桥 | https://bridge.botchain.ai/ |
| 官方钱包 | https://wallet.botchain.ai/ |
| 区块链浏览器 | https://scan.botchain.ai/ |
| 开发者文档 | https://dev-docs.botchain.ai/docs/Developers/quick-guide/ |
| GitHub 仓库 | https://github.com/BOTChain-bot |
| BOT 价格 API | https://dex-wallet.botchain.ai/api/graph/price?token=0xD5452816194a3784dBa983426cCe7c122F4abd30 |
| WBOT 合约 | `0xD5452816194a3784dBa983426cCe7c122F4abd30` |
| USDT 合约（BOT Chain） | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` |
| BOT Chain 品牌 logo | https://drive.google.com/drive/folders/1AYVj_gvnffA4T-QyXN3opgWNG5M7oD_1 |
| ERC4337 testnet bundler point | https://bundler.bohr.life/rpc |
| ERC4337 mainnet bundler point | https://bundler.botchain.ai/rpc |

### 将 BOT Chain 添加到钱包

**支持 EVM 钱包 / 钱包集成进度**

- Bitget Wallet — https://web3.bitget.com/
- TokenPocket — https://www.tokenpocket.pro
- OKX Wallet — https://web3.okx.com
- MetaMask

**通过 Chainlist 添加 BOT Chain**

1. 访问 https://chainlist.org/?search=bot+chain&testnets=true
2. 链接钱包
3. 将 BOT Chain 添加至钱包

**手动添加 BOT Chain**

1. 打开钱包
2. 点击网络，选择自定义网络
3. 填写主网信息：

| 项目 | 参数 |
|---|---|
| 网络名称 | BOT Chain |
| RPC URL | https://rpc.botchain.ai |
| Chain ID | 677 |
| 原生代币 | BOT |
| 区块浏览器 | https://scan.botchain.ai/ |

### 项目接入流程

1. **步骤 1：** 将 BOT Chain 主网添加到您的钱包
2. **步骤 2：** 通过水龙头获取测试币进行测试
3. **步骤 3：** 使用 Hardhat / Foundry / Remix 等工具，通过官方 RPC 部署智能合约
4. **步骤 4：** 在区块浏览器上验证合约、测试产品

### 安全与审计报告

BOT Chain 所有核心合约均已通过 CertiK 专业审计：

- **BOT Chain 审计报告：** https://www.botchain.ai/docs/Chain.pdf
- **BOT DEX 审计报告：** https://dex.botchain.ai/docs/Dex-Audit-Report.pdf
- **BOT Bridge 审计报告：** https://bridge.botchain.ai/docs/Bridge-Audit-Report.pdf
- **CertiK Skynet 项目洞察：** https://skynet.certik.com/projects/botchain
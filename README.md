# GuardDog 🐕‍🦺

**Autonomous Wallet Security, Powered by AI**

GuardDog is an autonomous agent that monitors wallets around the clock and executes onchain protection the moment a threat is detected — no manual intervention required. Most security tools stop at sending you an alert. GuardDog acts.

[![Live App](https://img.shields.io/badge/App-Live-green)](https://guard-dog.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🎯 The Problem

Wallet holders lose funds every day to:
- ❌ Unlimited token approvals left open on compromised dApps
- ❌ Honeypot tokens that can't be sold
- ❌ Rug pulls draining liquidity overnight
- ❌ Malicious contract interactions

**Existing tools only alert. GuardDog acts.**

## ✨ How It Works

An autonomous agent that:

1. **🔍 Monitors** — continuously scans protected wallets and an onchain threat registry
2. **🚨 Detects** — identifies malicious patterns using a configurable threat score
3. **🛡️ Executes** — automatically moves at-risk tokens into a secure vault before they can be drained
4. **📢 Notifies** — sends real-time alerts the moment protection is triggered

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GuardDog System                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ React Web App│         │ Autonomous   │                  │
│  │              │         │ Agent        │                  │
│  │ • Dashboard  │         │              │                  │
│  │ • Enable     │         │ • Monitoring │                  │
│  │ • Withdraw   │         │ • Detection  │                  │
│  └──────┬───────┘         │ • Execution  │                  │
│         │                 └──────┬───────┘                  │
│         └────────────┬───────────┘                           │
│                      ▼                                       │
│          ┌──────────────────────┐                           │
│          │   EVM-Compatible     │                           │
│          │   Chains             │                           │
│          ├──────────────────────┤                           │
│          │ GuardianVault.sol    │◄── Guardian protects      │
│          │ ThreatRegistry.sol   │◄── Community reports      │
│          └──────────────────────┘                           │
│                      ▲                                       │
│                      │                                       │
│          ┌──────────────────────┐                           │
│          │  Alerting Layer      │                           │
│          │  • Telegram Alerts   │                           │
│          └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

**Core Components:**
- **Autonomous Agent**: TypeScript agent providing 24/7 monitoring and execution
- **GuardianVault Contract**: Smart contract handling token protection
- **ThreatRegistry Contract**: Onchain threat intelligence database
- **React Frontend**: Wallet dashboard, with WalletConnect support for mobile
- **Telegram Bot**: Real-time threat notifications

## 🔥 Key Features

### ✅ Autonomous Protection
- 24/7 wallet monitoring
- Auto-protects tokens the moment a threat is detected
- No manual intervention required
- Configurable threat threshold

### ✅ Smart Contract Security
- GuardianVault safely holds threatened tokens
- User-controlled withdrawals — GuardDog never takes custody permanently
- Rate limiting to prevent abuse
- Guardian-role-gated execution

### ✅ Community Threat Intel
- Onchain ThreatRegistry for verified threats
- Community reporting system
- Aggregate threat scoring
- Verified threat flagging

### ✅ Multi-Channel Alerts
- Real-time Telegram notifications
- Activity posts to Moltbook
- Instant updates the moment protection is triggered

### ✅ Multi-Chain, Mobile-Ready
- Deployed across multiple EVM-compatible networks
- WalletConnect support — connect from any mobile browser, no extension required

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A wallet with testnet funds on your target network
- Anthropic API key (for agent reasoning components)

### 1. Clone Repository
```bash
git clone https://github.com/Ted1166/GuardDog.git
cd GuardDog
```

### 2. Deploy Smart Contracts
```bash
cd contracts/
npm install
npx hardhat compile

# Deploy to your target network (see hardhat.config.js for supported networks)
npx hardhat run scripts/deploy.js --network <network>

# Note the deployed addresses:
# GuardianVault: 0x...
# ThreatRegistry: 0x...
```

### 3. Set Up the Agent
```bash
cd ../guarddog-agent/
npm install

# Copy and configure environment
cp .env.example .env
nano .env

# Update with:
# - Guardian private key
# - Contract addresses
# - Telegram gateway credentials

# Start agent
npm run dev
```

### 4. Launch Frontend
```bash
cd ../client/
npm install

# Update contract addresses in src/config/contracts.ts
npm run dev

# Visit http://localhost:5173
```

### 5. Enable Protection
1. Connect wallet via the frontend (desktop or mobile)
2. Click "Enable Protection"
3. Approve the transaction
4. The agent starts monitoring automatically

## 📋 Smart Contracts

### GuardianVault.sol
**Main protection contract**
- `enableProtection()` — user enables wallet monitoring
- `protectTokens()` — guardian moves threatened tokens to the vault
- `withdraw()` — user reclaims protected tokens at any time
- `batchProtectTokens()` — batch protection for multiple tokens at once

### ThreatRegistry.sol
**Threat intelligence database**
- `reportThreat()` — submit a threat report
- `getAggregateThreatScore()` — get a threat score (0–100)
- `isVerifiedThreat()` — check if a threat has been verified
- `upvoteReport()` — community validation

See `client/src/config/contracts.ts` for the full list of deployed addresses across all supported networks.

**Primary deployment:**
- GuardianVault: `0xEF650672437A97A7b987984239064D502F56272d`
- ThreatRegistry: `0x2D101FaFb24C660Bfef07fd3106Caf1074C80bF7`

## 🧪 Testing

### Run the Full Protection Flow
```bash
cd contracts/

# 1. Enable protection for a wallet
npx hardhat run scripts/enable-protection.js --network <network>

# 2. Report a threat
npx hardhat run scripts/report-threat.js --network <network>

# 3. Approve tokens for protection
npx hardhat run scripts/approve-token.js --network <network>

# 4. Watch the agent detect and protect (in the agent terminal)
# Expected output:
# 🚨 THREAT DETECTED!
# 🛡️ Protecting tokens...
# ✅ Protection executed!
```

Every protection event is verifiable onchain — check the transaction hash the agent logs against your network's block explorer.

## 📊 Project Structure

```
guarddog/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Web3 hooks
│   │   ├── pages/            # Dashboard, Protection, Threats
│   │   └── config/           # Contract addresses & network config
│   └── package.json
│
├── contracts/                 # Smart contracts
│   ├── contracts/
│   │   ├── GuardianVault.sol
│   │   └── ThreatRegistry.sol
│   ├── scripts/
│   │   ├── deploy.js
│   │   ├── enable-protection.js
│   │   └── report-threat.js
│   └── hardhat.config.js
│
└── guarddog-agent/             # Autonomous monitoring agent
    ├── src/
    │   ├── core/               # Blockchain service
    │   ├── monitoring/         # Wallet scanner
    │   ├── messaging/          # Telegram alerts
    │   └── index.ts            # Main agent entrypoint
    └── .env.example
```

## 🛣️ Roadmap

**✅ Shipped**
- Autonomous token protection on threat detection
- Onchain threat detection via ThreatRegistry
- Real-time Telegram alerts
- Mainnet deployment
- WalletConnect support for mobile

**In Progress**
- Advanced threat detection (honeypot identification)
- Expanded multi-chain coverage
- Mobile app

**Future**
- Rug pull prediction
- Insurance integration
- DAO governance

## 🤝 Contributing

Contributions welcome!

### Development Setup
```bash
# Fork the repo
git clone https://github.com/Ted1166/GuardDog.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m 'Add amazing feature'

# Push and create PR
git push origin feature/amazing-feature
```

## 📄 License

MIT License — see [LICENSE](LICENSE) file

## 📞 Contact & Links

- **App:** https://guard-dog.vercel.app
- **Twitter/X:** [@guarddog_ai](https://x.com/guarddog_ai)
- **GitHub:** [github.com/Ted1166/GuardDog](https://github.com/Ted1166/GuardDog)

## 🏆 Acknowledgments

Thanks to everyone testing, reporting threats, and contributing feedback as GuardDog grows.

---

**Autonomous wallet security that actually protects, not just alerts.**
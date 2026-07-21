# GuardDog 🐕‍🦺

**AI-Powered Autonomous Wallet Security for BNB Chain**

GuardDog is an autonomous AI agent built with OpenClaw that monitors wallets 24/7 and executes onchain protection when threats are detected. No manual intervention needed—your guardian dog bites back automatically.

[![Demo](https://img.shields.io/badge/Demo-Live-green)](https://guarddog-demo.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with OpenClaw](https://img.shields.io/badge/Built%20with-OpenClaw-purple)](https://openclaw.ai)

## 🎯 Problem

BNB Chain users lose millions to:
- ❌ Unlimited token approvals on compromised dApps
- ❌ Honeypot tokens that can't be sold
- ❌ Rug pulls draining liquidity overnight
- ❌ Malicious contract interactions

**Existing tools only alert. GuardDog acts.**

## ✨ Solution

Autonomous AI agent running on OpenClaw that:

1. **🔍 Monitors** - Scans wallets + ThreatRegistry for threats every 5 minutes
2. **🚨 Detects** - Identifies malicious patterns (threat score ≥75)
3. **🛡️ Executes** - Auto-protects tokens by moving them to GuardianVault
4. **📢 Notifies** - Sends real-time alerts via Telegram and posts to Moltbook

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GuardDog System                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │ React Web App│         │OpenClaw Agent│                  │
│  │              │         │              │                  │
│  │ • Dashboard  │         │ • Monitoring │                  │
│  │ • Enable     │         │ • Detection  │                  │
│  │ • Withdraw   │         │ • Execution  │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         └────────────┬───────────┘                           │
│                      ▼                                       │
│          ┌──────────────────────┐                           │
│          │   BNB Chain (BSC)    │                           │
│          ├──────────────────────┤                           │
│          │ GuardianVault.sol    │◄── Guardian protects      │
│          │ ThreatRegistry.sol   │◄── Community reports      │
│          └──────────────────────┘                           │
│                      ▲                                       │
│                      │                                       │
│          ┌──────────────────────┐                           │
│          │   OpenClaw Gateway   │                           │
│          │ • Telegram Alerts    │                           │
│          │ • Moltbook Posts     │                           │
│          └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

**Core Components:**
- **OpenClaw Agent**: Autonomous TypeScript agent with 24/7 monitoring
- **GuardianVault Contract**: Smart contract for token protection
- **ThreatRegistry Contract**: Onchain threat database
- **React Frontend**: User dashboard for wallet management
- **Telegram Bot**: Real-time threat notifications

## 🔥 Key Features

### ✅ Autonomous Protection
- 24/7 wallet monitoring via OpenClaw agent
- Auto-protects tokens when threats detected
- No manual intervention required
- Configurable threat threshold (default: 75/100)

### ✅ Smart Contract Security
- GuardianVault safely stores threatened tokens
- User-controlled withdrawals
- Rate limiting (5-min cooldown)
- Guardian-only execution

### ✅ Community Threat Intel
- Onchain ThreatRegistry for verified threats
- Community reporting system
- Aggregate threat scoring
- Verified threat flagging

### ✅ Multi-Channel Alerts
- Telegram notifications
- Moltbook activity posts
- Real-time threat updates

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- OpenClaw installed
- BNB Chain wallet with testnet BNB
- Anthropic API key

### 1. Clone Repository
```bash
git clone https://github.com/Ted1166/GuardDog.git
cd guarddog
```

### 2. Deploy Smart Contracts
```bash
cd contracts/
npm install
npx hardhat compile

# Deploy to BSC Testnet
npx hardhat run scripts/deploy.js --network bscTestnet

# Note the deployed addresses:
# GuardianVault: 0x...
# ThreatRegistry: 0x...
```

### 3. Setup OpenClaw Agent
```bash
cd ../guarddog-agent/
npm install

# Copy and configure environment
cp .env.example .env
nano .env

# Update with:
# - Guardian private key
# - Contract addresses
# - OpenClaw gateway token
# - Moltbook API key

# Install OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon

# Pair Telegram bot
openclaw channels login
openclaw gateway --port 18789

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
1. Connect wallet via frontend
2. Click "Enable Protection"
3. Approve transaction
4. Agent starts monitoring automatically

## 📋 Smart Contracts

### GuardianVault.sol
**Main protection contract**
- `enableProtection()` - User enables wallet monitoring
- `protectTokens()` - Guardian moves threatened tokens to vault
- `withdraw()` - User reclaims protected tokens
- `batchProtectTokens()` - Batch protection for multiple tokens

**Deployed:** `0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9` (BSC Testnet)

### ThreatRegistry.sol
**Threat intelligence database**
- `reportThreat()` - Submit threat report
- `getAggregateThreatScore()` - Get threat score (0-100)
- `isVerifiedThreat()` - Check if threat verified
- `upvoteReport()` - Community validation

**Deployed:** `0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9` (BSC Testnet)

## 🧪 Testing & Demo

### Test Full Flow
```bash
# 1. Enable protection (via frontend or script)
cd contracts/
npx hardhat run scripts/enable-protection.js --network bscTestnet

# 2. Report a threat
npx hardhat run scripts/report-threat.js --network bscTestnet

# 3. Approve token for protection
npx hardhat run scripts/approve-token.js --network bscTestnet

# 4. Watch agent detect and protect (in agent terminal)
# Expected output:
# 🚨 THREAT DETECTED!
# 🛡️ Batch protecting 1 tokens...
# ✅ Protection executed!
```

### Verify Onchain
View transactions on BSCScan:
- Protection TX: `https://testnet.bscscan.com/tx/0x1102c8e9e0fba56e3d86e9cdfd1a245e6e49c23d44f207693e8815bb784bd65c`
- GuardianVault: `https://testnet.bscscan.com/address/0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9`

## 🤖 OpenClaw Integration

### Agent Features
- **Autonomous Monitoring**: Scans every 5 minutes
- **Threat Detection**: Queries ThreatRegistry onchain
- **Execution**: Calls GuardianVault.protectTokens()
- **Messaging**: Sends Telegram alerts
- **Activity Logging**: Posts to Moltbook

### Agent Commands (via Telegram)
```
/guarddog status - Check agent status
/guarddog scan - Run immediate scan
/guarddog add <wallet> <tokens> - Add wallet to monitoring
```

## 📊 Project Structure

```
guarddog/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Web3 hooks
│   │   ├── pages/            # Dashboard, Protection, Threats
│   │   └── utils/            # Contract utilities
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
└── guarddog-agent/            # OpenClaw agent
    ├── src/
    │   ├── core/             # Blockchain service
    │   ├── monitoring/       # Wallet scanner
    │   ├── messaging/        # Telegram & Moltbook
    │   └── index.ts          # Main agent
    ├── config/               # Contract ABIs
    └── .env.example
```

## 🛣️ Roadmap

**✅ Phase 1 (Hackathon - Complete)**
- Auto-protect threatened tokens
- Basic threat detection via ThreatRegistry
- OpenClaw integration with Telegram
- BSC Testnet deployment

**Phase 2 (Next)**
- Advanced ML threat detection
- Honeypot identification
- Multi-chain support (opBNB, Base)
- Mobile app

**Phase 3 (Future)**
- Rug pull prediction
- Insurance integration
- DAO governance
- Mainnet launch

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md)

### Development Setup
```bash
# Fork the repo
git clone https://github.com/Ted1166/Guarog.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m 'Add amazing feature'

# Push and create PR
git push origin feature/amazing-feature
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 📞 Contact & Links

- **Demo:** https://guarddog-demo.vercel.app
- **Twitter:** [@GuardDogAI](https://twitter.com/GuardDogAI)
- **Discord:** [Join Community](https://discord.gg/guarddog)
- **Docs:** [Full Documentation](https://docs.guarddog.ai)

## 🏆 Acknowledgments

- OpenClaw team for the amazing agent platform
- BNB Chain for the testnet environment
- Community for threat intelligence

---

**Built with 🤖 OpenClaw + ⛓️ Solidity + ⚛️ React**

*Autonomous wallet security that actually protects, not just alerts.*
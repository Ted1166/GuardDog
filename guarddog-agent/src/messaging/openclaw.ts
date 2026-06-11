import axios from 'axios';

export interface AlertMessage {
  type: 'threat_detected' | 'protection_executed' | 'scan_complete' | 'system_status';
  walletAddress?: string;
  tokenAddress?: string;
  threatLevel?: number;
  txHash?: string;
  message: string;
  timestamp: number;
}

export class OpenClawMessaging {
  private telegramEnabled: boolean;
  private telegramBotToken?: string;
  private telegramChatId?: string;
  private gatewayUrl: string;
  private gatewayToken: string;

  constructor(
    gatewayUrl: string,
    gatewayToken: string,
    config: {
      telegramEnabled?: boolean;
      telegramChatId?: string;
      telegramBotToken?: string;
      whatsappEnabled?: boolean;
      whatsappPhone?: string;
    } = {}
  ) {
    this.gatewayUrl = gatewayUrl;
    this.gatewayToken = gatewayToken;
    this.telegramEnabled = config.telegramEnabled || false;
    this.telegramChatId = config.telegramChatId;
    this.telegramBotToken = config.telegramBotToken;
  }

  async sendAlert(alert: AlertMessage): Promise<void> {
    const message = this.formatAlertMessage(alert);

    if (this.telegramEnabled) {
      if (!this.telegramBotToken) {
        console.warn('⚠️  TELEGRAM_ENABLED=true but TELEGRAM_BOT_TOKEN missing. Skipping.');
        return;
      }
      if (!this.telegramChatId) {
        console.warn('⚠️  TELEGRAM_ENABLED=true but TELEGRAM_CHAT_ID missing. Skipping.');
        return;
      }
      await this.sendToTelegram(message);
    } else {
      console.log(`📱 [Telegram disabled] ${alert.type}: ${alert.message.substring(0, 80)}`);
    }
  }

  private formatAlertMessage(alert: AlertMessage): string {
    const time = new Date(alert.timestamp).toUTCString();

    switch (alert.type) {

      case 'threat_detected': {
        const level = alert.threatLevel ?? 0;
        const severity = level >= 90 ? '🔴 CRITICAL' : level >= 75 ? '🟠 HIGH' : '🟡 MEDIUM';
        let msg = `🚨 *GuardDog — THREAT DETECTED*\n\n`;
        msg += `${severity} — Score: ${level}/100\n\n`;
        if (alert.walletAddress) {
          msg += `👛 *Wallet:* \`${alert.walletAddress.slice(0,10)}...${alert.walletAddress.slice(-6)}\`\n`;
        }
        if (alert.tokenAddress) {
          msg += `🪙 *Token:* \`${alert.tokenAddress.slice(0,10)}...${alert.tokenAddress.slice(-6)}\`\n`;
          msg += `🔍 [View on BSCScan](https://testnet.bscscan.com/address/${alert.tokenAddress})\n`;
        }
        msg += `\n📋 *Details:* ${alert.message}\n`;
        msg += `\n⚡ GuardDog is executing autonomous protection...`;
        msg += `\n\n🕐 ${time}`;
        return msg;
      }

      case 'protection_executed': {
        let msg = `🛡️ *GuardDog — TOKENS PROTECTED*\n\n`;
        msg += `✅ Autonomous protection executed successfully\n\n`;
        if (alert.walletAddress) {
          msg += `👛 *Wallet:* \`${alert.walletAddress.slice(0,10)}...${alert.walletAddress.slice(-6)}\`\n`;
        }
        msg += `📋 *Details:* ${alert.message}\n`;
        if (alert.txHash) {
          msg += `\n🔗 *Transaction:*\n\`${alert.txHash}\`\n`;
          msg += `[View on BSCScan](https://testnet.bscscan.com/tx/${alert.txHash})\n`;
        }
        msg += `\n💡 Tokens are safe in GuardianVault. Withdraw anytime at guard-dog.vercel.app`;
        msg += `\n\n🕐 ${time}`;
        return msg;
      }

      case 'scan_complete': {
        // Parse threat/protection counts from message
        const walletMatch = alert.message.match(/(\d+) wallets/);
        const threatMatch  = alert.message.match(/(\d+) threats/);
        const protectMatch = alert.message.match(/(\d+) protections/);
        const wallets      = walletMatch?.[1]  ?? '?';
        const threats      = parseInt(threatMatch?.[1]  ?? '0');
        const protections  = parseInt(protectMatch?.[1] ?? '0');

        // Only send scan_complete to Telegram if threats or protections found
        // (avoids spamming with clean scans every 5 min)
        if (threats === 0 && protections === 0) {
          // Log to console only — don't spam Telegram with clean scans
          console.log(`✅ Scan complete: ${wallets} wallets, no threats.`);
          return '';
        }

        let msg = `✅ *GuardDog — SCAN COMPLETE*\n\n`;
        msg += `📊 *Results:*\n`;
        msg += `  • Wallets scanned: ${wallets}\n`;
        msg += `  • Threats found: ${threats > 0 ? `⚠️ ${threats}` : '0 ✓'}\n`;
        msg += `  • Protections executed: ${protections > 0 ? `🛡️ ${protections}` : '0'}\n`;
        msg += `\n🕐 ${time}`;
        return msg;
      }

      case 'system_status': {
        let msg = `ℹ️ *GuardDog — System Status*\n\n`;
        msg += `${alert.message}\n`;
        msg += `\n🌐 guard-dog.vercel.app`;
        msg += `\n🕐 ${time}`;
        return msg;
      }

      default: {
        return `📢 *GuardDog Alert*\n\n${alert.message}\n\n🕐 ${time}`;
      }
    }
  }

  private async sendToTelegram(message: string): Promise<void> {
    // Empty message means we intentionally skipped (e.g. clean scan)
    if (!message) return;

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });
      console.log('📱 Telegram alert sent ✅');
    } catch (error: any) {
      const errMsg = error.response?.data?.description || error.message;
      console.error(`❌ Telegram failed: ${errMsg}`);
      if (errMsg?.includes('bot was blocked')) {
        console.error('   → Send /start to your bot first.');
      } else if (errMsg?.includes('chat not found')) {
        console.error('   → Invalid TELEGRAM_CHAT_ID. Get it from @userinfobot.');
      } else if (errMsg?.includes('Unauthorized')) {
        console.error('   → Invalid TELEGRAM_BOT_TOKEN. Check @BotFather.');
      }
    }
  }
}
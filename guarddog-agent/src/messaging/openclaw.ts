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
        console.warn('⚠️  TELEGRAM_ENABLED=true but TELEGRAM_BOT_TOKEN is missing. Skipping alert.');
        console.log(`   Message would have been: ${message.substring(0, 80)}...`);
        return;
      }
      if (!this.telegramChatId) {
        console.warn('⚠️  TELEGRAM_ENABLED=true but TELEGRAM_CHAT_ID is missing. Skipping alert.');
        return;
      }
      await this.sendToTelegram(message);
    } else {
      console.log('📱 Messaging disabled. Alert:');
      console.log(`   ${message.substring(0, 120)}`);
    }
  }

  private formatAlertMessage(alert: AlertMessage): string {
    const emoji = this.getEmojiForType(alert.type);
    const timestamp = new Date(alert.timestamp).toISOString();

    let message = `${emoji} *GuardDog Alert*\n\n`;
    message += `Type: ${alert.type.replace(/_/g, ' ').toUpperCase()}\n`;
    message += `Time: ${timestamp}\n\n`;
    message += `${alert.message}\n`;

    if (alert.walletAddress) {
      message += `\nWallet: \`${alert.walletAddress.substring(0, 10)}...${alert.walletAddress.substring(38)}\``;
    }
    if (alert.tokenAddress) {
      message += `\nToken: \`${alert.tokenAddress.substring(0, 10)}...${alert.tokenAddress.substring(38)}\``;
    }
    if (alert.threatLevel !== undefined) {
      message += `\nThreat Level: ${alert.threatLevel}/100`;
    }
    if (alert.txHash) {
      message += `\n\nTransaction: \`${alert.txHash}\``;
      message += `\nView: https://testnet.bscscan.com/tx/${alert.txHash}`;
    }

    return message;
  }

  private getEmojiForType(type: AlertMessage['type']): string {
    switch (type) {
      case 'threat_detected':    return '🚨';
      case 'protection_executed': return '🛡️';
      case 'scan_complete':      return '✅';
      case 'system_status':      return 'ℹ️';
      default:                   return '📢';
    }
  }


  private async sendToTelegram(message: string): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      await axios.post(url, {
        chat_id: this.telegramChatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      });
      console.log('📱 Alert sent to Telegram ✅');
    } catch (error: any) {
      const errMsg = error.response?.data?.description || error.message;
      console.error(`❌ Failed to send Telegram message: ${errMsg}`);
      // Common mistakes:
      if (errMsg?.includes('bot was blocked')) {
        console.error('   → User blocked the bot. Send /start to your bot first.');
      } else if (errMsg?.includes('chat not found')) {
        console.error('   → Invalid TELEGRAM_CHAT_ID. Get it from @userinfobot.');
      } else if (errMsg?.includes('Unauthorized')) {
        console.error('   → Invalid TELEGRAM_BOT_TOKEN. Check @BotFather.');
      }
    }
  }
}
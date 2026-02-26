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
  private gatewayUrl: string;
  private gatewayToken: string;
  private telegramEnabled: boolean;
  private whatsappEnabled: boolean;
  private telegramChatId?: string;
  private whatsappPhone?: string;

  constructor(
    gatewayUrl: string,
    gatewayToken: string,
    config: {
      telegramEnabled?: boolean;
      telegramChatId?: string;
      whatsappEnabled?: boolean;
      whatsappPhone?: string;
    } = {}
  ) {
    this.gatewayUrl = gatewayUrl;
    this.gatewayToken = gatewayToken;
    this.telegramEnabled = config.telegramEnabled || false;
    this.whatsappEnabled = config.whatsappEnabled || false;
    this.telegramChatId = config.telegramChatId;
    this.whatsappPhone = config.whatsappPhone;
  }

  async sendAlert(alert: AlertMessage): Promise<void> {
    const message = this.formatAlertMessage(alert);

    const promises: Promise<void>[] = [];

    if (this.telegramEnabled && this.telegramChatId) {
      promises.push(this.sendToTelegram(message));
    }

    if (this.whatsappEnabled && this.whatsappPhone) {
      promises.push(this.sendToWhatsApp(message));
    }

    if (promises.length === 0) {
      console.log('📱 No messaging channels enabled. Alert not sent.');
      console.log(`   Message: ${message}`);
      return;
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Failed to send alerts:', error);
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
      case 'threat_detected':
        return '🚨';
      case 'protection_executed':
        return '🛡️';
      case 'scan_complete':
        return '✅';
      case 'system_status':
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  private async sendToTelegram(message: string): Promise<void> {
    try {
      await axios.post(`${this.gatewayUrl}/api/send`, {
        channel: 'telegram',
        chatId: this.telegramChatId,
        message,
        parseMode: 'Markdown',
      }, {
        headers: {
          'Authorization': `Bearer ${this.gatewayToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📱 Alert sent to Telegram');
    } catch (error: any) {
      console.error('Failed to send Telegram message:', error.message);
    }
  }

  private async sendToWhatsApp(message: string): Promise<void> {
    try {
      await axios.post(`${this.gatewayUrl}/api/send`, {
        channel: 'whatsapp',
        phone: this.whatsappPhone,
        message,
      }, {
        headers: {
          'Authorization': `Bearer ${this.gatewayToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📱 Alert sent to WhatsApp');
    } catch (error: any) {
      console.error('Failed to send WhatsApp message:', error.message);
    }
  }
}
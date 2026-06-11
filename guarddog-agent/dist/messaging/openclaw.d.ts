export interface AlertMessage {
    type: 'threat_detected' | 'protection_executed' | 'scan_complete' | 'system_status';
    walletAddress?: string;
    tokenAddress?: string;
    threatLevel?: number;
    txHash?: string;
    message: string;
    timestamp: number;
}
export declare class OpenClawMessaging {
    private telegramEnabled;
    private telegramBotToken?;
    private telegramChatId?;
    private gatewayUrl;
    private gatewayToken;
    constructor(gatewayUrl: string, gatewayToken: string, config?: {
        telegramEnabled?: boolean;
        telegramChatId?: string;
        telegramBotToken?: string;
        whatsappEnabled?: boolean;
        whatsappPhone?: string;
    });
    sendAlert(alert: AlertMessage): Promise<void>;
    private formatAlertMessage;
    private sendToTelegram;
}
//# sourceMappingURL=openclaw.d.ts.map
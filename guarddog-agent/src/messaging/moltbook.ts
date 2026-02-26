import axios from 'axios';

export interface MoltbookPost {
  content: string;
  metadata?: {
    walletAddress?: string;
    tokenAddress?: string;
    threatLevel?: number;
    txHash?: string;
    action?: string;
  };
}

export class MoltbookService {
  private apiUrl: string;
  private apiKey: string;
  private submolt: string;
  private enabled: boolean;

  constructor(
    apiUrl: string, 
    apiKey: string,
    submolt: string = 'lablab',
    enabled: boolean = true
  ) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.submolt = submolt;
    this.enabled = enabled;
  }

  async postActivity(post: MoltbookPost): Promise<void> {
    if (!this.enabled) {
      console.log('📝 Moltbook posting disabled. Would have posted:');
      console.log(`   ${post.content}`);
      return;
    }

    if (!this.apiKey) {
      console.log('⚠️  Moltbook API key not configured. Skipping post.');
      return;
    }

    try {
      // Format the post for Moltbook's AI-only social network
      const formattedPost = this.formatPost(post);

      // Post to Moltbook API v1/posts endpoint
      const response = await axios.post(`${this.apiUrl}/v1/posts`, {
        content: formattedPost,
        submolt: this.submolt, // Post to lablab submolt for hackathon
        metadata: {
          agent: 'GuardDog',
          project: 'guarddog-wallet-security',
          hackathon: 'surge-openclaw-2026',
          ...post.metadata,
        },
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      console.log(`📝 Posted to Moltbook successfully (submolt: ${this.submolt})`);
      if (response.data?.id) {
        console.log(`   Post ID: ${response.data.id}`);
      }
    } catch (error: any) {
      console.error('Failed to post to Moltbook:', error.response?.data || error.message);
      // Don't throw - posting to Moltbook should not break the main flow
    }
  }

  private formatPost(post: MoltbookPost): string {
    let formatted = `🐕 GuardDog Agent Report\n\n`;
    formatted += post.content;

    if (post.metadata?.txHash) {
      formatted += `\n\nOnchain proof: ${post.metadata.txHash}`;
    }

    return formatted;
  }

  async postThreatDetection(
    walletAddress: string,
    tokenAddress: string,
    threatLevel: number,
    reason: string
  ): Promise<void> {
    const post: MoltbookPost = {
      content: `⚠️ Threat Detected!\n\nIdentified high-risk token in monitored wallet.\n\nThreat Level: ${threatLevel}/100\nReason: ${reason}\n\nAutonomous protection protocol initiated.`,
      metadata: {
        walletAddress,
        tokenAddress,
        threatLevel,
        action: 'threat_detected',
      },
    };

    await this.postActivity(post);
  }

  async postProtectionExecution(
    walletAddress: string,
    tokenAddress: string,
    amount: string,
    txHash: string
  ): Promise<void> {
    const post: MoltbookPost = {
      content: `🛡️ Protection Executed!\n\nSuccessfully protected ${amount} tokens from high-risk contract.\n\nAction: Tokens moved to GuardianVault\nStatus: Safe`,
      metadata: {
        walletAddress,
        tokenAddress,
        txHash,
        action: 'protection_executed',
      },
    };

    await this.postActivity(post);
  }

  async postScanComplete(walletsScanned: number, threatsFound: number): Promise<void> {
    const post: MoltbookPost = {
      content: `✅ Monitoring Cycle Complete\n\nScanned ${walletsScanned} protected wallets\nThreats detected: ${threatsFound}\n\nAutonomous security running 24/7`,
      metadata: {
        action: 'scan_complete',
      },
    };

    await this.postActivity(post);
  }

  async postSystemStatus(
    walletsMonitored: number,
    totalProtectedValue: string,
    uptime: string
  ): Promise<void> {
    const post: MoltbookPost = {
      content: `ℹ️ System Status\n\nActive wallets: ${walletsMonitored}\nTotal protected: ${totalProtectedValue}\nUptime: ${uptime}\n\nGuardDog agent operational.`,
      metadata: {
        action: 'system_status',
      },
    };

    await this.postActivity(post);
  }

  async postHackathonUpdate(milestone: string, details?: string): Promise<void> {
    let content = `🚀 Hackathon Update: ${milestone}\n\n`;
    if (details) {
      content += details;
    }
    content += `\n\n#SURGExOpenClaw #GuardDog`;

    const post: MoltbookPost = {
      content,
      metadata: {
        action: 'hackathon_update',
      },
    };

    await this.postActivity(post);
  }
}
import axios from 'axios';
import type { NetworkKey } from '../config/contracts.js';
import { getExplorerUrl } from '../config/network.js';

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
    this.apiUrl = apiUrl.replace('https://moltbook.com', 'https://www.moltbook.com')
                        .replace('http://moltbook.com', 'https://www.moltbook.com');
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
      const { title, body } = this.formatPost(post);

      const response = await axios.post(
        `${this.apiUrl}/api/v1/posts`,
        {
          submolt: this.submolt,
          title,
          content: body,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const data = response.data;

      if (data?.verification_required && data?.post?.verification) {
        console.log('🔐 Moltbook verification challenge received — solving...');
        await this.solveVerification(data.post.verification);
      } else {
        console.log(`📝 Posted to Moltbook successfully (submolt: ${this.submolt})`);
        if (data?.post?.id) {
          console.log(`   Post ID: ${data.post.id}`);
        }
      }
    } catch (error: any) {
      console.error('Failed to post to Moltbook:', error.response?.data || error.message);
    }
  }

  private async solveVerification(verification: {
    verification_code: string;
    challenge_text: string;
    expires_at: string;
  }): Promise<void> {
    try {
      const { verification_code, challenge_text } = verification;

      const cleaned = challenge_text
        .replace(/[\[\]^\/\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

      const answer = this.parseMathChallenge(cleaned);

      if (answer === null) {
        console.error('⚠️  Could not parse verification challenge:', challenge_text);
        return;
      }

      const formattedAnswer = answer.toFixed(2);
      console.log(`   Challenge: "${cleaned}"`);
      console.log(`   Answer: ${formattedAnswer}`);

      const verifyResponse = await axios.post(
        `${this.apiUrl}/api/v1/verify`,
        {
          verification_code,
          answer: formattedAnswer,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (verifyResponse.data?.success) {
        console.log(`✅ Moltbook verification passed! Post is now live.`);
      } else {
        console.error('❌ Moltbook verification failed:', verifyResponse.data);
      }
    } catch (error: any) {
      console.error('Verification request failed:', error.response?.data || error.message);
    }
  }

  private parseMathChallenge(text: string): number | null {
    const wordToNum: Record<string, number> = {
      zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
      eighty: 80, ninety: 90, hundred: 100,
    };

    const resolveWords = (words: string[]): number | null => {
      let total = 0;
      let found = false;
      for (const word of words) {
        if (wordToNum[word] !== undefined) {
          total += wordToNum[word];
          found = true;
        }
      }
      return found ? total : null;
    };

    const patterns = [
      { regex: /at\s+([\w\s]+?)\s+(?:and\s+)?(?:slows?\s+by|minus|subtract(?:s|ed)?)\s+([\w\s]+)/, op: '-' },
      { regex: /at\s+([\w\s]+?)\s+(?:and\s+)?(?:speeds?\s+up\s+by|plus|adds?)\s+([\w\s]+)/, op: '+' },
      { regex: /at\s+([\w\s]+?)\s+(?:and\s+)?(?:multiplied?\s+by|times)\s+([\w\s]+)/, op: '*' },
      { regex: /at\s+([\w\s]+?)\s+(?:and\s+)?(?:divided?\s+by)\s+([\w\s]+)/, op: '/' },
      { regex: /([\w\s]+?)\s+(?:minus|subtract)\s+([\w\s]+)/, op: '-' },
      { regex: /([\w\s]+?)\s+(?:plus|add)\s+([\w\s]+)/, op: '+' },
      { regex: /([\w\s]+?)\s+(?:times|multiplied)\s+([\w\s]+)/, op: '*' },
      { regex: /([\w\s]+?)\s+(?:divided)\s+([\w\s]+)/, op: '/' },
    ];

    for (const { regex, op } of patterns) {
      const match = text.match(regex);
      if (match) {
        const a = resolveWords(match[1].trim().split(/\s+/));
        const b = resolveWords(match[2].trim().split(/\s+/));
        if (a !== null && b !== null) {
          switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return b !== 0 ? a / b : null;
          }
        }
      }
    }

    const nums = text.match(/\d+(\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const a = parseFloat(nums[0]);
      const b = parseFloat(nums[1]);
      if (text.includes('minus') || text.includes('slows') || text.includes('subtract')) return a - b;
      if (text.includes('plus') || text.includes('adds') || text.includes('speeds')) return a + b;
      if (text.includes('times') || text.includes('multipli')) return a * b;
      if (text.includes('divid')) return b !== 0 ? a / b : null;
    }

    return null;
  }

  private formatPost(post: MoltbookPost): { title: string; body: string } {
    const lines = post.content.split('\n').filter(Boolean);
    const rawTitle = lines[0].replace(/^[🐕⚠️🛡️✅ℹ️🚀]+\s*/, '').trim();
    const title = rawTitle.length > 100 ? rawTitle.substring(0, 97) + '...' : rawTitle;

    let body = lines.slice(1).join('\n').trim();
    if (!body) body = post.content;

    if (post.metadata?.txHash) {
      const network = (process.env.NETWORK as NetworkKey) || 'bscTestnet';
      body += `\n\nOnchain proof: ${getExplorerUrl(network)}/tx/${post.metadata.txHash}`;
    }

    return { title: `🐕 GuardDog: ${title}`, body };
  }


  async postThreatDetection(
    walletAddress: string,
    tokenAddress: string,
    threatLevel: number,
    reason: string
  ): Promise<void> {
    await this.postActivity({
      content: `⚠️ Threat Detected!\n\nIdentified high-risk token in monitored wallet.\n\nThreat Level: ${threatLevel}/100\nReason: ${reason}\n\nAutonomous protection protocol initiated.`,
      metadata: { walletAddress, tokenAddress, threatLevel, action: 'threat_detected' },
    });
  }

  async postProtectionExecution(
    walletAddress: string,
    tokenAddress: string,
    amount: string,
    txHash: string
  ): Promise<void> {
    await this.postActivity({
      content: `🛡️ Protection Executed!\n\nSuccessfully protected ${amount} tokens from high-risk contract.\n\nAction: Tokens moved to GuardianVault\nStatus: Safe`,
      metadata: { walletAddress, tokenAddress, txHash, action: 'protection_executed' },
    });
  }

  async postScanComplete(walletsScanned: number, threatsFound: number): Promise<void> {
    await this.postActivity({
      content: `✅ Monitoring Cycle Complete\n\nScanned ${walletsScanned} protected wallets\nThreats detected: ${threatsFound}\n\nAutonomous security running 24/7`,
      metadata: { action: 'scan_complete' },
    });
  }

  async postSystemStatus(
    walletsMonitored: number,
    totalProtectedValue: string,
    uptime: string
  ): Promise<void> {
    await this.postActivity({
      content: `ℹ️ System Status\n\nActive wallets: ${walletsMonitored}\nTotal protected: ${totalProtectedValue}\nUptime: ${uptime}\n\nGuardDog agent operational.`,
      metadata: { action: 'system_status' },
    });
  }

  async postHackathonUpdate(milestone: string, details?: string): Promise<void> {
    let content = `🚀 Hackathon Update: ${milestone}\n\n`;
    if (details) content += details;
    content += `\n\n#SURGExOpenClaw #GuardDog`;
    await this.postActivity({ content, metadata: { action: 'hackathon_update' } });
  }
}
#!/usr/bin/env node
/**
 * GuardDog OpenClaw Skill
 * 
 * Usage in OpenClaw:
 * - /guarddog status - Check agent status and monitored wallets
 * - /guarddog add <wallet> <tokens> - Add wallet to monitoring
 * - /guarddog remove <wallet> - Remove wallet from monitoring
 * - /guarddog scan - Run immediate scan
 * - /guarddog protect <wallet> <token> - Manually protect a token
 */

import GuardDogAgent from '../index.js';
import { ethers } from 'ethers';

const agent = new GuardDogAgent();

async function handleCommand(command: string, args: string[]): Promise<string> {
  try {
    switch (command) {
      case 'status': {
        const status = agent.getStatus();
        let response = '🐕 GuardDog Status\n\n';
        response += `Running: ${status.isRunning ? '✅ Yes' : '❌ No'}\n`;
        response += `Uptime: ${status.uptime}\n`;
        response += `Monitored Wallets: ${status.monitoredWallets.length}\n`;
        
        if (status.monitoredWallets.length > 0) {
          response += '\nWallets:\n';
          for (const wallet of status.monitoredWallets) {
            response += `  • ${wallet.substring(0, 10)}...${wallet.substring(38)}\n`;
          }
        }
        
        return response;
      }

      case 'add': {
        const [wallet, ...tokens] = args;
        
        if (!wallet || !ethers.isAddress(wallet)) {
          return '❌ Invalid wallet address. Usage: /guarddog add <wallet> <token1> <token2> ...';
        }

        const tokenAddresses = tokens.filter(t => ethers.isAddress(t));
        
        if (tokenAddresses.length === 0) {
          return '❌ Please provide at least one valid token address';
        }

        agent.addWallet(wallet, tokenAddresses);
        
        return `✅ Added wallet ${wallet.substring(0, 10)}...${wallet.substring(38)} with ${tokenAddresses.length} tokens to monitoring`;
      }

      case 'remove': {
        const [wallet] = args;
        
        if (!wallet || !ethers.isAddress(wallet)) {
          return '❌ Invalid wallet address. Usage: /guarddog remove <wallet>';
        }

        agent.removeWallet(wallet);
        
        return `✅ Removed wallet ${wallet.substring(0, 10)}...${wallet.substring(38)} from monitoring`;
      }

      case 'scan': {
        await agent.runScanCycle();
        return '✅ Scan cycle completed. Check logs for details.';
      }

      case 'help':
      default: {
        return `🐕 GuardDog Commands

/guarddog status - Check agent status
/guarddog add <wallet> <token1> <token2> - Add wallet to monitoring  
/guarddog remove <wallet> - Remove wallet from monitoring
/guarddog scan - Run immediate threat scan
/guarddog help - Show this help message

Example:
/guarddog add 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1 0x...token1 0x...token2`;
      }
    }
  } catch (error: any) {
    return `❌ Error: ${error.message}`;
  }
}

// CLI entry point for OpenClaw skill
if (import.meta.url === `file://${process.argv[1]}`) {
  const [command, ...args] = process.argv.slice(2);
  
  await agent.initialize();
  const result = await handleCommand(command || 'help', args);
  console.log(result);
  process.exit(0);
}

export { handleCommand };
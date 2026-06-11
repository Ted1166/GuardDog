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
declare function handleCommand(command: string, args: string[]): Promise<string>;
export { handleCommand };
//# sourceMappingURL=guarddog.d.ts.map
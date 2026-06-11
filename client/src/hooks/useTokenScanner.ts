// src/hooks/useTokenScanner.ts
import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import { getThreatScore, isVerifiedThreat } from '../utils/contracts';
import { isValidAddress } from '../utils/formatters';

// ── Known dangerous / notable function selectors ──────────────────────
// 4-byte keccak256 of function signatures
const FUNCTION_SELECTORS: Record<string, { label: string; risk: 'danger' | 'warning' | 'info' }> = {
  // Ownership & access control
  '0x8da5cb5b': { label: 'owner()',                       risk: 'info'    },
  '0xf2fde38b': { label: 'transferOwnership(address)',     risk: 'warning' },
  '0x715018a6': { label: 'renounceOwnership()',            risk: 'info'    },
  // Mint / supply manipulation
  '0x40c10f19': { label: 'mint(address,uint256)',          risk: 'warning' },
  '0xa0712d68': { label: 'mint(uint256)',                  risk: 'warning' },
  '0x1249c58b': { label: 'mint()',                         risk: 'warning' },
  '0x4e6ec247': { label: '_mint(address,uint256)',         risk: 'warning' },
  // Blacklist / pause
  '0x8456cb59': { label: 'pause()',                        risk: 'warning' },
  '0x3f4ba83a': { label: 'unpause()',                      risk: 'info'    },
  '0x5c975abb': { label: 'paused()',                       risk: 'info'    },
  '0xf9f92be4': { label: 'blacklist(address)',             risk: 'danger'  },
  '0x44337ea1': { label: 'blacklistAddress(address)',      risk: 'danger'  },
  '0x10d5de26': { label: 'isBlacklisted(address)',        risk: 'warning' },
  // Fee manipulation
  '0x27a14fc2': { label: 'setMaxTxAmount(uint256)',        risk: 'warning' },
  '0xa9059cbb': { label: 'transfer(address,uint256)',      risk: 'info'    },
  '0x23b872dd': { label: 'transferFrom(address,address,uint256)', risk: 'info' },
  '0x095ea7b3': { label: 'approve(address,uint256)',       risk: 'info'    },
  // Self-destruct patterns
  '0x83197ef0': { label: 'destroy()',                      risk: 'danger'  },
  '0x9f727160': { label: 'selfdestruct()',                 risk: 'danger'  },
  // Proxy / upgrade patterns
  '0x3659cfe6': { label: 'upgradeTo(address)',             risk: 'warning' },
  '0x4f1ef286': { label: 'upgradeToAndCall(address,bytes)', risk: 'warning' },
  '0x52d1902d': { label: 'proxiableUUID()',                risk: 'info'    },
  '0xcf7a1d77': { label: 'initialize(address,address,uint256)', risk: 'info' },
  // Withdraw / sweep
  '0x853828b6': { label: 'withdrawAll()',                  risk: 'warning' },
  '0x51cff8d9': { label: 'withdraw(address)',              risk: 'warning' },
  '0x2e1a7d4d': { label: 'withdraw(uint256)',              risk: 'info'    },
  // Tax / fee setters
  '0x4ada218b': { label: 'tradingEnabled()',               risk: 'info'    },
  '0xa6334231': { label: 'setTaxFee(uint256)',             risk: 'warning' },
  '0x2b14ca56': { label: 'setMaxWalletSize(uint256)',      risk: 'warning' },
  // Hidden admin
  '0x1816467f': { label: 'setFeeAddress(address)',         risk: 'danger'  },
  '0xc9567bf9': { label: 'openTrading()',                  risk: 'info'    },
};

// ── Detected function type ─────────────────────────────────────────────
export interface DetectedFunction {
  selector: string;
  label: string;
  risk: 'danger' | 'warning' | 'info';
}

export interface BytecodeAnalysis {
  contractSize: number;           // bytes
  hasSelfDestruct: boolean;
  hasDelegateCall: boolean;
  hasProxyPattern: boolean;
  hasMintFunction: boolean;
  hasBlacklist: boolean;
  hasPauseFunction: boolean;
  hasOwnershipTransfer: boolean;
  hasTaxSetter: boolean;
  hasHiddenAdmin: boolean;
  detectedFunctions: DetectedFunction[];
  riskScore: number;              // 0-100 additive from bytecode alone
  summary: string[];              // human-readable findings
}

function analyzeBytecode(bytecode: string): BytecodeAnalysis {
  const code = bytecode.toLowerCase().replace('0x', '');
  const summary: string[] = [];
  const detectedFunctions: DetectedFunction[] = [];

  // ── Detect known function selectors ──────────────────────────────────
  for (const [selector, meta] of Object.entries(FUNCTION_SELECTORS)) {
    const bare = selector.replace('0x', '');
    if (code.includes(bare)) {
      detectedFunctions.push({ selector, label: meta.label, risk: meta.risk });
    }
  }

  // ── Derive flags from detected functions ──────────────────────────────
  const hasSelfDestruct = code.includes('ff') &&
    (detectedFunctions.some(f => f.label.includes('destroy')) || code.split('ff').length > 3);

  const hasDelegateCall = code.includes('f4');

  const hasProxyPattern = detectedFunctions.some(f =>
    f.label.includes('upgradeTo') || f.label.includes('proxiable') || f.label.includes('initialize')
  );

  const hasMintFunction = detectedFunctions.some(f =>
    f.label.toLowerCase().includes('mint')
  );

  const hasBlacklist = detectedFunctions.some(f =>
    f.label.toLowerCase().includes('blacklist')
  );

  const hasPauseFunction = detectedFunctions.some(f =>
    f.label.includes('pause()')
  );

  const hasOwnershipTransfer = detectedFunctions.some(f =>
    f.label.includes('transferOwnership')
  );

  const hasTaxSetter = detectedFunctions.some(f =>
    f.label.toLowerCase().includes('tax') ||
    f.label.toLowerCase().includes('fee') ||
    f.label.toLowerCase().includes('maxwallet') ||
    f.label.toLowerCase().includes('maxtx')
  );

  const hasHiddenAdmin = detectedFunctions.some(f =>
    f.label.toLowerCase().includes('setfeeaddress') ||
    f.label.toLowerCase().includes('blacklist') && f.risk === 'danger'
  );

  // ── Build human-readable summary ──────────────────────────────────────
  if (hasSelfDestruct) {
    summary.push('⚠️ SELFDESTRUCT opcode found — contract can be destroyed, wiping all token balances.');
  }
  if (hasDelegateCall && !hasProxyPattern) {
    summary.push('⚠️ DELEGATECALL detected — code execution may be delegated to an unknown contract.');
  }
  if (hasProxyPattern) {
    summary.push('ℹ️ Upgradeable proxy pattern — contract logic can be swapped by owner.');
  }
  if (hasMintFunction) {
    summary.push('⚠️ Mint function detected — owner can create new tokens, potentially diluting supply.');
  }
  if (hasBlacklist) {
    summary.push('🚨 Blacklist function detected — owner can block specific addresses from transferring.');
  }
  if (hasPauseFunction) {
    summary.push('⚠️ Pause function detected — owner can halt all transfers at any time.');
  }
  if (hasTaxSetter) {
    summary.push('⚠️ Adjustable tax/fee function — owner can change transaction fees after deployment.');
  }
  if (hasHiddenAdmin) {
    summary.push('🚨 Hidden admin function detected — owner has privileged control beyond standard ERC-20.');
  }
  if (!hasMintFunction && !hasBlacklist && !hasSelfDestruct && !hasHiddenAdmin) {
    summary.push('✅ No obvious high-risk admin functions detected in bytecode.');
  }

  // ── Risk score from bytecode alone ────────────────────────────────────
  let riskScore = 0;
  if (hasSelfDestruct)     riskScore += 25;
  if (hasBlacklist)        riskScore += 20;
  if (hasHiddenAdmin)      riskScore += 20;
  if (hasMintFunction)     riskScore += 15;
  if (hasDelegateCall && !hasProxyPattern) riskScore += 15;
  if (hasProxyPattern)     riskScore += 10;
  if (hasPauseFunction)    riskScore += 10;
  if (hasTaxSetter)        riskScore += 10;
  if (hasOwnershipTransfer) riskScore += 5;

  const contractSize = Math.floor(code.length / 2);

  return {
    contractSize,
    hasSelfDestruct,
    hasDelegateCall,
    hasProxyPattern,
    hasMintFunction,
    hasBlacklist,
    hasPauseFunction,
    hasOwnershipTransfer,
    hasTaxSetter,
    hasHiddenAdmin,
    detectedFunctions,
    riskScore: Math.min(100, riskScore),
    summary,
  };
}

// ── Extended scan result ──────────────────────────────────────────────
export interface TokenScanResult {
  address: string;
  isScam: boolean;
  threatLevel: number;
  threats: string[];
  warnings: string[];
  safeChecks: string[];
  communityReports: number;
  verified: boolean;
  // NEW
  bytecodeAnalysis: BytecodeAnalysis | null;
  tokenName: string | null;
  tokenSymbol: string | null;
  combinedRiskScore: number;
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useTokenScanner() {
  const { provider } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<TokenScanResult | null>(null);
  const [error, setError] = useState<string>('');

  const scanToken = useCallback(
    async (tokenAddress: string) => {
      if (!isValidAddress(tokenAddress)) {
        setError('Invalid contract address');
        return;
      }
      if (!provider) {
        setError('Please connect your wallet first');
        return;
      }

      setScanning(true);
      setError('');
      setResult(null);

      try {
        const [threatLevel, verified, code] = await Promise.all([
          getThreatScore(tokenAddress, provider).catch(() => 0),
          isVerifiedThreat(tokenAddress, provider).catch(() => false),
          provider.getCode(tokenAddress),
        ]);

        const threats: string[] = [];
        const warnings: string[] = [];
        const safeChecks: string[] = [];

        // ── Contract existence ────────────────────────────────────────
        if (code === '0x' || code === '') {
          threats.push('Not a valid contract — may be an EOA or undeployed address');
        } else {
          safeChecks.push('Contract exists on-chain');
        }

        // ── Community registry ────────────────────────────────────────
        if (threatLevel > 75) {
          threats.push(`High community threat score: ${threatLevel}/100`);
        } else if (threatLevel > 50) {
          warnings.push(`Medium community threat score: ${threatLevel}/100`);
        } else if (threatLevel > 0) {
          warnings.push(`Low community threat score: ${threatLevel}/100`);
        } else {
          safeChecks.push('No community threat reports');
        }

        if (verified) {
          threats.push('Verified as malicious by community');
        }

        // ── Bytecode analysis ─────────────────────────────────────────
        let bytecodeAnalysis: BytecodeAnalysis | null = null;
        if (code && code !== '0x') {
          bytecodeAnalysis = analyzeBytecode(code);

          // Promote bytecode findings to threats/warnings
          if (bytecodeAnalysis.hasSelfDestruct) {
            threats.push('Bytecode: SELFDESTRUCT opcode present');
          }
          if (bytecodeAnalysis.hasBlacklist) {
            threats.push('Bytecode: Blacklist function — owner can freeze wallets');
          }
          if (bytecodeAnalysis.hasHiddenAdmin) {
            threats.push('Bytecode: Hidden admin privilege detected');
          }
          if (bytecodeAnalysis.hasMintFunction) {
            warnings.push('Bytecode: Mint function — owner can inflate supply');
          }
          if (bytecodeAnalysis.hasPauseFunction) {
            warnings.push('Bytecode: Pause function — owner can halt all transfers');
          }
          if (bytecodeAnalysis.hasTaxSetter) {
            warnings.push('Bytecode: Adjustable fee/tax detected');
          }
          if (bytecodeAnalysis.hasDelegateCall && !bytecodeAnalysis.hasProxyPattern) {
            warnings.push('Bytecode: DELEGATECALL to unknown address');
          }
          if (bytecodeAnalysis.hasProxyPattern) {
            warnings.push('Bytecode: Upgradeable proxy — logic can be replaced by owner');
          }

          if (
            !bytecodeAnalysis.hasSelfDestruct &&
            !bytecodeAnalysis.hasBlacklist &&
            !bytecodeAnalysis.hasHiddenAdmin &&
            !bytecodeAnalysis.hasMintFunction
          ) {
            safeChecks.push('Bytecode: No high-risk admin functions detected');
          }
        }

        // ── Token metadata ────────────────────────────────────────────
        let tokenName: string | null = null;
        let tokenSymbol: string | null = null;
        try {
          const { Contract } = await import('ethers');
          const tokenContract = new Contract(
            tokenAddress,
            ['function name() view returns (string)', 'function symbol() view returns (string)'],
            provider
          );
          [tokenName, tokenSymbol] = await Promise.all([
            tokenContract.name().catch(() => null),
            tokenContract.symbol().catch(() => null),
          ]);
          if (tokenName && tokenSymbol) {
            safeChecks.push(`Token: ${tokenName} (${tokenSymbol})`);
          }
        } catch {
          warnings.push('Unable to read token metadata');
        }

        // ── Combined risk score ───────────────────────────────────────
        const bytecodeRisk = bytecodeAnalysis?.riskScore ?? 0;
        const combinedRiskScore = Math.min(
          100,
          Math.round(threatLevel * 0.6 + bytecodeRisk * 0.4)
        ) || Math.max(threatLevel, bytecodeRisk);

        const scanResult: TokenScanResult = {
          address: tokenAddress,
          isScam: combinedRiskScore > 65 || verified,
          threatLevel,
          threats,
          warnings,
          safeChecks,
          communityReports: threatLevel > 0 ? 1 : 0,
          verified,
          bytecodeAnalysis,
          tokenName,
          tokenSymbol,
          combinedRiskScore,
        };

        setResult(scanResult);
      } catch (err: any) {
        console.error('Token scan error:', err);
        setError(err.message || 'Failed to scan token');
      } finally {
        setScanning(false);
      }
    },
    [provider]
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError('');
  }, []);

  return { scanning, result, error, scanToken, clearResult };
}
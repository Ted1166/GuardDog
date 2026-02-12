import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import { getThreatScore, isVerifiedThreat } from '../utils/contracts';
import { isValidAddress } from '../utils/formatters';

export interface TokenScanResult {
  address: string;
  isScam: boolean;
  threatLevel: number;
  threats: string[];
  warnings: string[];
  safeChecks: string[];
  communityReports: number;
  verified: boolean;
}

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
        const [threatLevel, verified] = await Promise.all([
          getThreatScore(tokenAddress, provider).catch(() => 0),
          isVerifiedThreat(tokenAddress, provider).catch(() => false),
        ]);

        const code = await provider.getCode(tokenAddress);
        
        const threats: string[] = [];
        const warnings: string[] = [];
        const safeChecks: string[] = [];

        if (code === '0x') {
          threats.push('Not a valid contract - may be an EOA or undeployed address');
        } else {
          safeChecks.push('Contract exists on-chain');
        }

        if (code.includes('selfdestruct')) {
          warnings.push('Contains selfdestruct - contract can be destroyed');
        }

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

        try {
          const tokenContract = new (await import('ethers')).Contract(
            tokenAddress,
            ['function name() view returns (string)', 'function symbol() view returns (string)'],
            provider
          );

          const [name, symbol] = await Promise.all([
            tokenContract.name().catch(() => null),
            tokenContract.symbol().catch(() => null),
          ]);

          if (name && symbol) {
            safeChecks.push(`Token: ${name} (${symbol})`);
          }
        } catch {
          warnings.push('Unable to read token metadata');
        }

        const scanResult: TokenScanResult = {
          address: tokenAddress,
          isScam: threatLevel > 75 || verified,
          threatLevel,
          threats,
          warnings,
          safeChecks,
          communityReports: threatLevel > 0 ? 1 : 0, 
          verified,
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

  return {
    scanning,
    result,
    error,
    scanToken,
    clearResult,
  };
}
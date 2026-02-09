import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import {
  checkProtectionStatus,
  getProtectionDuration,
  enableProtection as enableProtectionContract,
  disableProtection as disableProtectionContract,
} from '../utils/contracts';
import { parseContractError } from '../utils/contracts';

export function useProtection(walletAddress?: string) {
  const { provider, signer } = useWallet();
  const [isProtected, setIsProtected] = useState(false);
  const [protectionStartTime, setProtectionStartTime] = useState<bigint | null>(null);
  const [duration, setDuration] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchProtectionStatus = useCallback(async () => {
    if (!provider || !walletAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const isProtectedStatus = await checkProtectionStatus(walletAddress, provider);
      setIsProtected(isProtectedStatus);

      if (isProtectedStatus) {
        const durationSec = await getProtectionDuration(walletAddress, provider);
        setDuration(durationSec);

        const now = BigInt(Math.floor(Date.now() / 1000));
        const startTime = now - durationSec;
        setProtectionStartTime(startTime);
      } else {
        setProtectionStartTime(null);
        setDuration(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch protection status:', err);
      setError(parseContractError(err));
    } finally {
      setLoading(false);
    }
    }, [provider, walletAddress]);

    useEffect(() => {
        fetchProtectionStatus();
    }, [fetchProtectionStatus]);

    useEffect(() => {
        if (!walletAddress || !provider) return;

        const interval = setInterval(() => {
        fetchProtectionStatus();
        }, 30000);

        return () => clearInterval(interval);
    }, [walletAddress, provider, fetchProtectionStatus]);

  const enable = useCallback(async () => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      setLoading(true);
      setError('');

      await enableProtectionContract(signer);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await fetchProtectionStatus();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [signer, fetchProtectionStatus]);

  const disable = useCallback(async () => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      setLoading(true);
      setError('');

      await disableProtectionContract(signer);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await fetchProtectionStatus();
    } catch (err: any) {
      const errorMsg = parseContractError(err);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [signer, fetchProtectionStatus]);

  const refresh = useCallback(() => {
    fetchProtectionStatus();
  }, [fetchProtectionStatus]);

  return {
    isProtected,
    protectionStartTime,
    duration,
    loading,
    error,
    enable,
    disable,
    refresh,
  };
}
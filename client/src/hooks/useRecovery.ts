import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import {
  getRecoveryInfo,
  setRecoveryAddress as setRecoveryAddressContract,
  finalizeRecoveryChange as finalizeRecoveryChangeContract,
  cancelRecoveryChange as cancelRecoveryChangeContract,
  parseContractError,
} from '../utils/contracts';

export function useRecovery(walletAddress?: string) {
  const { signer, currentNetwork } = useWallet();
  const [recovery, setRecovery] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [eta, setEta] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchInfo = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const info = await getRecoveryInfo(walletAddress, currentNetwork);
      setRecovery(info.recovery === ethers.ZeroAddress ? null : info.recovery);
      setPending(info.pending === ethers.ZeroAddress ? null : info.pending);
      setEta(info.eta);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, currentNetwork]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const runTx = useCallback(
    async (tx: () => Promise<unknown>) => {
      if (!signer) {
        throw new Error('No signer available');
      }

      try {
        setSubmitting(true);
        setError('');
        await tx();
        await fetchInfo();
      } catch (err: any) {
        const errorMsg = parseContractError(err);
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSubmitting(false);
      }
    },
    [signer, fetchInfo]
  );

  const set = useCallback(
    (newRecovery: string) =>
      runTx(() => setRecoveryAddressContract(signer!, newRecovery, currentNetwork)),
    [runTx, signer, currentNetwork]
  );

  const finalize = useCallback(
    () => runTx(() => finalizeRecoveryChangeContract(signer!, walletAddress!, currentNetwork)),
    [runTx, signer, walletAddress, currentNetwork]
  );

  const cancel = useCallback(
    () => runTx(() => cancelRecoveryChangeContract(signer!, walletAddress!, currentNetwork)),
    [runTx, signer, walletAddress, currentNetwork]
  );

  return {
    recovery,
    pending,
    eta,
    loading,
    submitting,
    error,
    set,
    finalize,
    cancel,
    refresh: fetchInfo,
  };
}

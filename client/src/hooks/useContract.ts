import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { parseContractError } from '../utils/contracts';

interface ContractCallOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const read = useCallback(
    async <T,>(
      contract: ethers.Contract,
      method: string,
      args: any[] = [],
      options?: ContractCallOptions
    ): Promise<T | null> => {
      try {
        setLoading(true);
        setError('');

        const result = await contract[method](...args);
        
        options?.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const errorMsg = parseContractError(err);
        setError(errorMsg);
        options?.onError?.(errorMsg);
        console.error(`Contract read error (${method}):`, err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const write = useCallback(
    async (
      contract: ethers.Contract,
      method: string,
      args: any[] = [],
      options?: ContractCallOptions
    ): Promise<ethers.ContractTransactionResponse | null> => {
      try {
        setLoading(true);
        setError('');

        const tx = await contract[method](...args);
        const receipt = await tx.wait();
        
        options?.onSuccess?.(receipt);
        return receipt;
      } catch (err: any) {
        const errorMsg = parseContractError(err);
        setError(errorMsg);
        options?.onError?.(errorMsg);
        console.error(`Contract write error (${method}):`, err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const listen = useCallback(
    (
      contract: ethers.Contract,
      eventName: string,
      callback: (...args: any[]) => void
    ) => {
      contract.on(eventName, callback);

      return () => {
        contract.off(eventName, callback);
      };
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    loading,
    error,
    read,
    write,
    listen,
    clearError,
  };
}

export function useGuardianVault() {
  const contract = useContract();
  return contract;
}

export function useThreatRegistry() {
  const contract = useContract();
  return contract;
}
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import {
  approveToken,
  getAllowance,
  getRegisteredTokens,
  getTokenBalance,
  getTokenMetadata,
  parseContractError,
  registerToken,
  unregisterToken,
  MAX_UINT256,
  type TokenMetadata,
} from '../utils/contracts';
import { isValidAddress } from '../utils/formatters';

export interface RegisteredToken {
  meta: TokenMetadata;
  balance: bigint;
  allowance: bigint;
}

export function useRegisteredTokens(walletAddress?: string) {
  const { provider, currentNetwork } = useWallet();
  const [tokens, setTokens] = useState<RegisteredToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchTokens = useCallback(async () => {
    if (!provider || !walletAddress) return;

    try {
      setLoading(true);
      setError('');

      const addresses = await getRegisteredTokens(walletAddress, provider, currentNetwork);

      const enriched = await Promise.all(
        addresses.map(async (addr) => {
          const [meta, balance, allowance] = await Promise.all([
            getTokenMetadata(addr, provider),
            getTokenBalance(addr, walletAddress, provider).catch(() => 0n),
            getAllowance(addr, walletAddress, provider, currentNetwork).catch(() => 0n),
          ]);
          return { meta, balance, allowance };
        })
      );

      setTokens(enriched);
    } catch (err: any) {
      console.error('Failed to fetch registered tokens:', err);
      setError(parseContractError(err));
    } finally {
      setLoading(false);
    }
  }, [provider, walletAddress, currentNetwork]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading, error, refresh: fetchTokens };
}

export function useApprove() {
  const { signer, provider, currentNetwork } = useWallet();
  const [pendingToken, setPendingToken] = useState<string>('');
  const [error, setError] = useState<string>('');

  const isBusy = (tokenAddress: string) =>
    pendingToken.toLowerCase() === tokenAddress.toLowerCase();

  const wrap = async <T,>(token: string, fn: () => Promise<T>): Promise<T> => {
    setPendingToken(token);
    setError('');
    try {
      return await fn();
    } catch (err: any) {
      const msg = parseContractError(err);
      setError(msg);
      throw new Error(msg);
    } finally {
      setPendingToken('');
    }
  };

  const approve = useCallback(
    async (tokenAddress: string, amount: bigint = MAX_UINT256) => {
      if (!signer) throw new Error('No signer available');
      if (!isValidAddress(tokenAddress)) throw new Error('Invalid token address');
      return wrap(tokenAddress, () =>
        approveToken(signer, tokenAddress, amount, currentNetwork)
      );
    },
    [signer, currentNetwork]
  );

  const revoke = useCallback(
    async (tokenAddress: string) => {
      if (!signer) throw new Error('No signer available');
      return wrap(tokenAddress, () =>
        approveToken(signer, tokenAddress, 0n, currentNetwork)
      );
    },
    [signer, currentNetwork]
  );

  const register = useCallback(
    async (tokenAddress: string) => {
      if (!signer) throw new Error('No signer available');
      if (!isValidAddress(tokenAddress)) throw new Error('Invalid token address');
      if (!provider) throw new Error('No provider');

      // Validate it's actually an ERC20 before paying gas on register.
      const code = await provider.getCode(tokenAddress);
      if (code === '0x') throw new Error('Address is not a contract');

      return wrap(tokenAddress, () =>
        registerToken(signer, tokenAddress, currentNetwork)
      );
    },
    [signer, provider, currentNetwork]
  );

  const unregister = useCallback(
    async (tokenAddress: string) => {
      if (!signer) throw new Error('No signer available');
      return wrap(tokenAddress, () =>
        unregisterToken(signer, tokenAddress, currentNetwork)
      );
    },
    [signer, currentNetwork]
  );

  return { approve, revoke, register, unregister, isBusy, error };
}

export function formatTokenAmount(amount: bigint, decimals: number, maxFrac = 4): string {
  const str = ethers.formatUnits(amount, decimals);
  const [whole, frac = ''] = str.split('.');
  if (!frac) return whole;
  const trimmed = frac.slice(0, maxFrac).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function allowanceStatus(allowance: bigint, balance: bigint): {
  label: string;
  tone: 'none' | 'partial' | 'unlimited';
} {
  if (allowance === 0n) return { label: 'Not approved', tone: 'none' };
  if (allowance >= MAX_UINT256 / 2n) return { label: 'Unlimited', tone: 'unlimited' };
  if (allowance >= balance) return { label: 'Approved', tone: 'unlimited' };
  return { label: 'Partial', tone: 'partial' };
}

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import { getThreatReports, getThreatStats } from '../utils/contracts';

export interface ThreatReport {
  reporter: string;
  timestamp: bigint;
  threatLevel: number;
  threatType: string;
  evidence: string;
  verified: boolean;
  upvotes: bigint;
}

export function useThreats(contractAddress?: string) {
  const { provider, currentNetwork } = useWallet();
  const [threats, setThreats] = useState<ThreatReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchThreats = useCallback(async () => {
    if (!provider || !contractAddress) {
      setThreats([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const reports = await getThreatReports(contractAddress, provider, currentNetwork);
      setThreats(reports);
    } catch (err: any) {
      console.error('Failed to fetch threats:', err);
      setError(err.message || 'Failed to fetch threats');
      setThreats([]);
    } finally {
      setLoading(false);
    }
  }, [provider, contractAddress, currentNetwork]);

  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  const refresh = useCallback(() => {
    fetchThreats();
  }, [fetchThreats]);

  return {
    threats,
    loading,
    error,
    refresh,
  };
}

export function useThreatStats(contractAddress?: string) {
  const { provider, currentNetwork } = useWallet();
  const [stats, setStats] = useState({
    totalReports: 0n,
    verifiedReports: 0n,
    avgThreatLevel: 0,
    totalUpvotes: 0n,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || !contractAddress) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getThreatStats(contractAddress, provider, currentNetwork);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch threat stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [provider, contractAddress, currentNetwork]);

  return { stats, loading };
}

export function useRecentThreats(contractAddresses: string[] = []) {
  const { provider, currentNetwork } = useWallet();
  const [recentThreats, setRecentThreats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider || contractAddresses.length === 0) {
      setRecentThreats([]);
      return;
    }

    const fetchRecent = async () => {
      try {
        setLoading(true);
        
        // Fetch threats from all provided contracts
        const allThreats = await Promise.all(
          contractAddresses.map(async (address) => {
            try {
              const reports = await getThreatReports(address, provider, currentNetwork);
              return reports.map((report: ThreatReport) => ({
                ...report,
                contractAddress: address,
              }));
            } catch {
              return [];
            }
          })
        );

        // Flatten and sort by timestamp (most recent first)
        const flattened = allThreats.flat();
        const sorted = flattened.sort((a, b) => {
          return Number(b.timestamp) - Number(a.timestamp);
        });

        // Take only the 10 most recent
        setRecentThreats(sorted.slice(0, 10));
      } catch (err) {
        console.error('Failed to fetch recent threats:', err);
        setRecentThreats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [provider, contractAddresses.join(','), currentNetwork]);

  return { recentThreats, loading };
}
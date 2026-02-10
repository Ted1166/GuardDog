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
  const { provider } = useWallet();
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

      const reports = await getThreatReports(contractAddress, provider);
      setThreats(reports);
    } catch (err: any) {
      console.error('Failed to fetch threats:', err);
      setError(err.message || 'Failed to fetch threats');
      setThreats([]);
    } finally {
      setLoading(false);
    }
  }, [provider, contractAddress]);

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

// Hook to get threat statistics for a contract
export function useThreatStats(contractAddress?: string) {
  const { provider } = useWallet();
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
        const data = await getThreatStats(contractAddress, provider);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch threat stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [provider, contractAddress]);

  return { stats, loading };
}

// Hook to fetch recent threats across multiple contracts (for dashboard)
export function useRecentThreats(contractAddresses: string[] = []) {
  const { provider } = useWallet();
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
              const reports = await getThreatReports(address, provider);
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
  }, [provider, contractAddresses.join(',')]);

  return { recentThreats, loading };
}
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';
import { CONTRACT_ADDRESSES, NETWORKS, SUPPORTED_NETWORKS, type NetworkKey } from '../config/contracts';

const REGISTRY_ABI = [
  'event ThreatReported(address indexed contractAddress, address indexed reporter, uint8 threatLevel, string threatType)',
  'event ReportUpvoted(address indexed contractAddress, uint256 reportIndex, address indexed voter)',
  'function getAllReports(address contractAddress) view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes)[])',
];

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  description: string;
  minPoints: number;
  color: string;
}

export const BADGES: Badge[] = [
  {
    id: 'rookie',
    label: 'Rookie Reporter',
    emoji: '🔍',
    description: 'Submitted your first threat report',
    minPoints: 1,
    color: '#9CA3AF',
  },
  {
    id: 'hunter',
    label: 'Threat Hunter',
    emoji: '🎯',
    description: 'Earned 100+ bounty points',
    minPoints: 100,
    color: '#3B82F6',
  },
  {
    id: 'guardian',
    label: 'Community Guardian',
    emoji: '🛡️',
    description: 'Earned 300+ bounty points',
    minPoints: 300,
    color: '#10B981',
  },
  {
    id: 'elite',
    label: 'Elite Sentinel',
    emoji: '⚡',
    description: 'Earned 750+ bounty points — top tier protector',
    minPoints: 750,
    color: '#F59E0B',
  },
  {
    id: 'legend',
    label: 'GuardDog Legend',
    emoji: '👑',
    description: 'Earned 2000+ bounty points',
    minPoints: 2000,
    color: '#EF4444',
  },
];

const POINTS = {
  UNVERIFIED_REPORT: 10,
  VERIFIED_REPORT:   50,
  UPVOTE_RECEIVED:    5,
  HIGH_THREAT_BONUS: 15,
};

export interface BountyReport {
  contractAddress: string;
  threatLevel: number;
  threatType: string;
  verified: boolean;
  upvotes: number;
  timestamp: number;
  points: number;
  network: NetworkKey;
}

export interface BountyProfile {
  totalPoints: number;
  reportCount: number;
  verifiedCount: number;
  totalUpvotesReceived: number;
  currentBadge: Badge | null;
  nextBadge: Badge | null;
  pointsToNext: number;
  progressPercent: number;
  reports: BountyReport[];
  loading: boolean;
  error: string;
}

async function fetchReportsForNetwork(
  network: NetworkKey,
  reporterAddress: string
): Promise<BountyReport[]> {
  const rpcUrl = NETWORKS[network].rpcUrls[0];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const registryAddress = CONTRACT_ADDRESSES[network]?.ThreatRegistry;
  if (!registryAddress) return [];

  const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);

  try {
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 50000);

    const filter = contract.filters.ThreatReported(null, reporterAddress);
    const events: ethers.Log[] = [];

    const chunkSize = 3000;
    for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, latestBlock);
      try {
        const chunk = await contract.queryFilter(filter, start, end);
        events.push(...(chunk as ethers.Log[]));
      } catch {
        // skip bad chunk
      }
    }

    const reports: BountyReport[] = [];

    for (const ev of events) {
      const parsed = contract.interface.parseLog({
        topics: ev.topics as string[],
        data: ev.data,
      });
      if (!parsed) continue;

      const contractAddress: string = parsed.args.contractAddress;
      const threatLevel = Number(parsed.args.threatLevel);
      const threatType: string = parsed.args.threatType;

      let verified = false;
      let upvotes = 0;
      let timestamp = Date.now() / 1000;

      try {
        const allReports = await contract.getAllReports(contractAddress);
        for (const r of allReports) {
          if (r.reporter.toLowerCase() === reporterAddress.toLowerCase()) {
            verified = r.verified;
            upvotes = Number(r.upvotes);
            timestamp = Number(r.timestamp);
            break;
          }
        }
      } catch {
        // Use defaults if fetch fails
      }

      let pts = verified ? POINTS.VERIFIED_REPORT : POINTS.UNVERIFIED_REPORT;
      if (threatLevel >= 75) pts += POINTS.HIGH_THREAT_BONUS;
      pts += upvotes * POINTS.UPVOTE_RECEIVED;

      reports.push({
        contractAddress,
        threatLevel,
        threatType,
        verified,
        upvotes,
        timestamp,
        points: pts,
        network,
      });
    }

    return reports;
  } catch {
    return [];
  }
}

function computeProfile(reports: BountyReport[]): Omit<BountyProfile, 'loading' | 'error' | 'reports'> {
  const totalPoints = reports.reduce((sum, r) => sum + r.points, 0);
  const reportCount = reports.length;
  const verifiedCount = reports.filter(r => r.verified).length;
  const totalUpvotesReceived = reports.reduce((sum, r) => sum + r.upvotes, 0);

  const unlockedBadges = BADGES.filter(b => totalPoints >= b.minPoints);
  const currentBadge = unlockedBadges.length > 0
    ? unlockedBadges[unlockedBadges.length - 1]
    : null;

  const lockedBadges = BADGES.filter(b => totalPoints < b.minPoints);
  const nextBadge = lockedBadges.length > 0 ? lockedBadges[0] : null;

  const pointsToNext = nextBadge ? nextBadge.minPoints - totalPoints : 0;

  const progressPercent = nextBadge
    ? Math.min(100, Math.round(
        ((totalPoints - (currentBadge?.minPoints ?? 0)) /
         (nextBadge.minPoints - (currentBadge?.minPoints ?? 0))) * 100
      ))
    : 100;

  return {
    totalPoints,
    reportCount,
    verifiedCount,
    totalUpvotesReceived,
    currentBadge,
    nextBadge,
    pointsToNext,
    progressPercent,
  };
}

export function useBounties(): BountyProfile {
  const { address } = useWallet();
  const [reports, setReports] = useState<BountyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError('');

    try {
      const allResults = await Promise.all(
        SUPPORTED_NETWORKS.map(n => fetchReportsForNetwork(n, address))
      );
      const flat = allResults.flat().sort((a, b) => b.timestamp - a.timestamp);
      setReports(flat);
    } catch (err: any) {
      setError(err.message || 'Failed to load bounty data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetch(); }, [fetch]);

  const profile = computeProfile(reports);

  return { ...profile, reports, loading, error };
}

export interface LeaderboardEntry {
  address: string;
  reportCount: number;
  points: number;
  badge: Badge | null;
}

export function useLeaderboard(network: NetworkKey = 'bscTestnet') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const rpcUrl = NETWORKS[network].rpcUrls[0];
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const registryAddress = CONTRACT_ADDRESSES[network]?.ThreatRegistry;
        if (!registryAddress) return;

        const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 50000);

        const filter = contract.filters.ThreatReported();
        const allEvents: ethers.Log[] = [];
        const chunkSize = 3000;
        for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
          const end = Math.min(start + chunkSize - 1, latestBlock);
          try {
            const chunk = await contract.queryFilter(filter, start, end);
            allEvents.push(...(chunk as ethers.Log[]));
          } catch { /* skip */ }
        }

        const reporters = new Map<string, { reportCount: number; points: number }>();
        for (const ev of allEvents) {
          const parsed = contract.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
          if (!parsed) continue;
          const reporter: string = parsed.args.reporter.toLowerCase();
          const threatLevel = Number(parsed.args.threatLevel);
          const pts = (threatLevel >= 75 ? POINTS.HIGH_THREAT_BONUS : 0) + POINTS.UNVERIFIED_REPORT;
          const existing = reporters.get(reporter) ?? { reportCount: 0, points: 0 };
          reporters.set(reporter, { reportCount: existing.reportCount + 1, points: existing.points + pts });
        }

        const sorted: LeaderboardEntry[] = Array.from(reporters.entries())
          .map(([address, data]) => {
            const unlockedBadges = BADGES.filter(b => data.points >= b.minPoints);
            const badge = unlockedBadges.length > 0 ? unlockedBadges[unlockedBadges.length - 1] : null;
            return { address, ...data, badge };
          })
          .sort((a, b) => b.points - a.points)
          .slice(0, 10);

        setEntries(sorted);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [network]);

  return { entries, loading };
}
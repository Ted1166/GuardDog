import { useEffect, useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
// import { getGuardianVaultContract } from '../../utils/contracts';
import Card from '../ui/Card';
import { formatBalance, formatCompact, formatUSD } from '../../utils/formatters';

interface WalletStatsProps {
  address?: string;
}

export default function WalletStats({ address }: WalletStatsProps) {
  const { balance, provider } = useWallet();
  const [stats, setStats] = useState({
    protectedTokens: 0,
    protectedValue: 0,
    threatsBlocked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider || !address) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // TODO: Implement when we add events/subgraph
        // For now, set to 0 - these will be populated as the system is used
        setStats({
          protectedTokens: 0,
          protectedValue: 0,
          threatsBlocked: 0,
        });
      } catch (error) {
        console.error('Failed to fetch wallet stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [address, provider]);

  if (loading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="hover:border-gray-700 transition-colors">
            <div className="animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="h-8 w-8 bg-gray-700 rounded"></div>
                <div className="h-6 w-12 bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 bg-gray-700 rounded"></div>
                <div className="h-8 w-32 bg-gray-700 rounded"></div>
                <div className="h-3 w-20 bg-gray-700 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </>
    );
  }

  const statCards = [
    {
      label: 'Wallet Balance',
      value: `${formatBalance(balance)} BNB`,
      subtext: '≈ $0.00',
      icon: '💰',
      color: 'blue',
    },
    {
      label: 'Protected Tokens',
      value: stats.protectedTokens.toString(),
      subtext: formatUSD(stats.protectedValue),
      icon: '🔒',
      color: 'green',
    },
    {
      label: 'Threats Blocked',
      value: formatCompact(stats.threatsBlocked),
      subtext: 'All time',
      icon: '🛡️',
      color: 'red',
    },
  ];

  return (
    <>
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:border-gray-700 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="text-3xl">{stat.icon}</div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                stat.color === 'blue'
                  ? 'bg-blue-500/20 text-blue-400'
                  : stat.color === 'green'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              Live
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
            <div className="text-2xl font-bold text-white mb-1">
              {stat.value}
            </div>
            <div className="text-xs text-gray-500">{stat.subtext}</div>
          </div>

          {/* Progress Bar (optional) */}
          {stat.label === 'Protected Tokens' && (
            <div className="mt-4">
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
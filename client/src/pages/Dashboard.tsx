import { useWallet } from '../hooks/useWallet';
import { useProtection } from '../hooks/useProtection';
import { useRecentThreats } from '../hooks/useThreats';
import { useBounties } from '../hooks/useBounties';
import ProtectionStatus from '../components/dashboard/ProtectionStatus';
import WalletStats from '../components/dashboard/WalletStats';
import WalletRiskScore from '../components/dashboard/WalletRiskScore';
import ThreatAlerts from '../components/dashboard/ThreatAlerts';
import TokenScanner from '../components/features/TokenScanner';
import SurgeWatch from '../components/features/SurgeWatch';
import ConnectWallet from '../components/wallet/ConnectWallet';

function BountyMini() {
  const { totalPoints, currentBadge, reportCount, loading } = useBounties();
  if (loading) return null;
  return (
    <a
      href="/settings"
      className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all group"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl border shrink-0"
        style={{
          borderColor: currentBadge?.color ?? '#374151',
          backgroundColor: currentBadge ? `${currentBadge.color}20` : '#1F2937',
        }}
      >
        {currentBadge?.emoji ?? '🔍'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">
          {currentBadge?.label ?? 'Start Earning'}
        </p>
        <p className="text-xs text-gray-400">
          {totalPoints > 0
            ? `${totalPoints} pts · ${reportCount} report${reportCount !== 1 ? 's' : ''}`
            : 'Report threats to earn bounty points'}
        </p>
      </div>
      <span className="text-gray-500 group-hover:text-gray-300 text-xs transition-colors">View →</span>
    </a>
  );
}

export default function Dashboard() {
  const { address, isConnected } = useWallet();
  const { isProtected, loading } = useProtection(address);
  const { recentThreats } = useRecentThreats([]);

  const telegramConnected = !!localStorage.getItem('guarddog_telegram_token');
  const maxThreatLevel = recentThreats.reduce((max: number, t: any) => Math.max(max, t.threatLevel ?? 0), 0);
  const verifiedThreats = recentThreats.filter((t: any) => t.verified).length;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-8">
          <img 
            src="/logo.png" 
            alt="GuardDog"
            className="w-48 h-48 md:w-64 md:h-64 mx-auto drop-shadow-[0_0_60px_rgba(59,130,246,0.5)] animate-pulse-glow"
          />
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white font-display">
              GuardDog
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
              AI-powered autonomous wallet security for BNB Chain.<br />
              Protect your assets 24/7.
            </p>
          </div>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Monitor your wallet protection and threat alerts</p>
          {telegramConnected && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-400 mt-2">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              📱 Telegram alerts active
            </span>
          )}
        </div>

        <ProtectionStatus isProtected={isProtected} loading={loading} address={address} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WalletRiskScore
              address={address}
              threatCount={recentThreats.length}
              maxThreatLevel={maxThreatLevel}
              verifiedThreats={verifiedThreats}
            />
          </div>
          <div className="lg:col-span-1">
            <WalletStats address={address} />
          </div>
        </div>

        <ThreatAlerts threats={recentThreats} />

        {/* Surge Watch */}
        <SurgeWatch />

        <TokenScanner />

        {/* Quick Actions + Bounty + Surge chip */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-left">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-white font-medium mb-1">Scan Token</div>
                <div className="text-sm text-gray-400">Check if a token is safe</div>
              </button>
              <button onClick={() => window.location.href = '/threats'}
                className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-left">
                <div className="text-2xl mb-2">🚨</div>
                <div className="text-white font-medium mb-1">Report Threat</div>
                <div className="text-sm text-gray-400">Flag malicious contract</div>
              </button>
              <button onClick={() => window.location.href = '/protection'}
                className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors text-left">
                <div className="text-2xl mb-2">💰</div>
                <div className="text-white font-medium mb-1">Withdraw Protected</div>
                <div className="text-sm text-gray-400">Access safe custody tokens</div>
              </button>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <BountyMini />
            <a href="https://surge.xyz" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 hover:border-purple-500/40 rounded-xl p-4 transition-all">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-white font-semibold text-sm">Powered by Surge</p>
                <p className="text-xs text-gray-400">Tokenizing startups · surge.xyz</p>
              </div>
            </a>
          </div>
        </div>

        {!isProtected && !loading && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">ℹ️</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Enable Protection</h3>
                <p className="text-gray-300 mb-4">
                  GuardDog monitors your wallet 24/7 and automatically transfers tokens to
                  safe custody when threats are detected. No manual intervention needed.
                </p>
                <a href="/protection" className="text-blue-400 hover:text-blue-300 font-medium">
                  Enable now →
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
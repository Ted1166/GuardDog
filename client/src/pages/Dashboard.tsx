import { useWallet } from '../hooks/useWallet';
import { useProtection } from '../hooks/useProtection';
import { useRecentThreats } from '../hooks/useThreats';
import ProtectionStatus from '../components/dashboard/ProtectionStatus';
import WalletStats from '../components/dashboard/WalletStats';
import ThreatAlerts from '../components/dashboard/ThreatAlerts';
import TokenScanner from '../components/features/TokenScanner';
import ConnectWallet from '../components/wallet/ConnectWallet';

export default function Dashboard() {
  const { address, isConnected } = useWallet();
  const { isProtected, loading } = useProtection(address);
  
  const { recentThreats } = useRecentThreats([]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🐕‍🦺</div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome to GuardDog
          </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            AI-powered autonomous wallet security for BNB Chain.
            Protect your assets 24/7.
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Monitor your wallet protection and threat alerts
          </p>
        </div>

        {/* Protection Status Card */}
        <ProtectionStatus
          isProtected={isProtected}
          loading={loading}
          address={address}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WalletStats address={address} />
        </div>

        {/* Threat Alerts */}
        <ThreatAlerts threats={recentThreats} />

        {/* Token Scanner */}
        <TokenScanner />

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-white font-medium mb-1">Scan Token</div>
              <div className="text-sm text-gray-400">
                Check if a token is safe
              </div>
            </button>

            <button className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">🚨</div>
              <div className="text-white font-medium mb-1">Report Threat</div>
              <div className="text-sm text-gray-400">
                Flag malicious contract
              </div>
            </button>

            <button className="p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-white font-medium mb-1">
                Withdraw Protected
              </div>
              <div className="text-sm text-gray-400">
                Access safe custody tokens
              </div>
            </button>
          </div>
        </div>

        {/* Info Banner */}
        {!isProtected && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">ℹ️</div>
              <div>
                <h3 className="text-white font-semibold mb-2">
                  Enable Protection
                </h3>
                <p className="text-gray-300 mb-4">
                  GuardDog monitors your wallet 24/7 and automatically transfers
                  tokens to safe custody when threats are detected. No manual
                  intervention needed.
                </p>
                <a
                  href="/protection"
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Learn more →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
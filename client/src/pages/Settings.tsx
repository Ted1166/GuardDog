import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import ConnectWallet from '../components/wallet/ConnectWallet';
import WalletInfo from '../components/wallet/WalletInfo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getExplorerUrl } from '../config/contracts';

export default function Settings() {
  const { isConnected, disconnect } = useWallet();
  const [notifications, setNotifications] = useState({
    threatDetected: true,
    tokensProtected: true,
    newReports: false,
  });

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to continue</p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your GuardDog preferences</p>
        </div>

        {/* Wallet Info */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Connected Wallet
          </h2>
          <WalletInfo />
          <Button
            onClick={disconnect}
            variant="danger"
            className="w-full mt-4"
          >
            Disconnect Wallet
          </Button>
        </Card>

        {/* Notifications */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Notifications
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Configure when you want to be notified
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Threat Detected</h3>
                <p className="text-sm text-gray-400">
                  When AI detects a threat to your wallet
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle('threatDetected')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications.threatDetected ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.threatDetected ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">Tokens Protected</h3>
                <p className="text-sm text-gray-400">
                  When tokens are moved to safe custody
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle('tokensProtected')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications.tokensProtected ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.tokensProtected ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
              <div>
                <h3 className="text-white font-medium">New Reports</h3>
                <p className="text-sm text-gray-400">
                  When new threats are reported by community
                </p>
              </div>
              <button
                onClick={() => handleNotificationToggle('newReports')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications.newReports ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    notifications.newReports ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Network */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Network</h2>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Current Network:</span>
              <span className="text-white font-medium">BSC Testnet</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Chain ID:</span>
              <span className="text-white font-medium">97</span>
            </div>
          </div>
        </Card>

        {/* Contract Addresses */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Contract Addresses
          </h2>
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">GuardianVault</div>
              <div className="flex items-center justify-between">
                <code className="text-white text-sm">
                  0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9
                </code>
                <a
                  href={getExplorerUrl(
                    'bscTestnet',
                    'address',
                    '0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View →
                </a>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">ThreatRegistry</div>
              <div className="flex items-center justify-between">
                <code className="text-white text-sm">
                  0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9
                </code>
                <a
                  href={getExplorerUrl(
                    'bscTestnet',
                    'address',
                    '0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View →
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            About GuardDog
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Built for:</span>
              <span className="text-white">Good Vibes Only: OpenClaw Edition</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">License:</span>
              <span className="text-white">MIT</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex gap-4 text-sm">
              <a
                href="https://github.com/yourusername/guarddog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                GitHub →
              </a>
              <a
                href="https://docs.guarddog.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Documentation →
              </a>
              <a
                href="https://discord.gg/guarddog"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Discord →
              </a>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/30">
          <h2 className="text-xl font-semibold text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="bg-red-500/10 rounded-lg p-4">
            <p className="text-gray-300 text-sm mb-4">
              Clear all local data and reset GuardDog settings. This action
              cannot be undone.
            </p>
            <Button variant="danger">Clear All Data</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
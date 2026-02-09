import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useProtection } from '../hooks/useProtection';
import ConnectWallet from '../components/wallet/ConnectWallet';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { formatDuration, formatDateTime } from '../utils/formatters';

export default function Protection() {
  const { address, isConnected } = useWallet();
  const {
    isProtected,
    protectionStartTime,
    duration,
    loading,
    enable,
    disable,
  } = useProtection(address);

  const [isEnabling, setIsEnabling] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      await enable();
    } catch (error) {
      console.error('Failed to enable protection:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable protection?')) return;
    
    setIsDisabling(true);
    try {
      await disable();
    } catch (error) {
      console.error('Failed to disable protection:', error);
    } finally {
      setIsDisabling(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Wallet Protection</h1>
          <p className="text-gray-400 mb-6">
            Connect your wallet to manage protection
          </p>
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
          <h1 className="text-3xl font-bold text-white mb-2">
            Wallet Protection
          </h1>
          <p className="text-gray-400">
            Enable autonomous AI protection for your wallet
          </p>
        </div>

        {/* Protection Status */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Protection Status
              </h2>
              <p className="text-gray-400">
                {isProtected
                  ? 'Your wallet is actively protected'
                  : 'Protection is currently disabled'}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-full font-medium ${
                isProtected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              {isProtected ? '🛡️ Protected' : '⚠️ Unprotected'}
            </div>
          </div>

          {isProtected && protectionStartTime && (
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Protection started:</span>
                <span className="text-white font-medium">
                  {formatDateTime(protectionStartTime)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white font-medium">
                  {formatDuration(duration || 0)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-6">
            {!isProtected ? (
              <Button
                onClick={handleEnable}
                loading={isEnabling || loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                🛡️ Enable Protection
              </Button>
            ) : (
              <Button
                onClick={handleDisable}
                loading={isDisabling || loading}
                variant="danger"
                className="w-full"
              >
                Disable Protection
              </Button>
            )}
          </div>
        </Card>

        {/* How It Works */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            How It Works
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                1
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  Enable Protection
                </h3>
                <p className="text-gray-400 text-sm">
                  Activate GuardDog monitoring for your wallet with one click
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                2
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  Approve Tokens
                </h3>
                <p className="text-gray-400 text-sm">
                  Grant GuardDog permission to protect your tokens (one-time per
                  token)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                3
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">24/7 Monitoring</h3>
                <p className="text-gray-400 text-sm">
                  AI agent monitors your wallet and connected dApps for threats
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                4
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  Automatic Protection
                </h3>
                <p className="text-gray-400 text-sm">
                  When threats detected, tokens are automatically moved to safe
                  custody
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">
            Protection Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="text-white font-medium mb-1">AI Detection</h3>
              <p className="text-gray-400 text-sm">
                Machine learning models identify honeypots, rug pulls, and scams
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="text-white font-medium mb-1">
                Instant Response
              </h3>
              <p className="text-gray-400 text-sm">
                Threats are neutralized automatically within seconds
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="text-white font-medium mb-1">Safe Custody</h3>
              <p className="text-gray-400 text-sm">
                Protected tokens stored securely in GuardianVault contract
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-2xl mb-2">💼</div>
              <h3 className="text-white font-medium mb-1">
                Full Control
              </h3>
              <p className="text-gray-400 text-sm">
                Withdraw protected tokens anytime or disable protection
              </p>
            </div>
          </div>
        </Card>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="text-white font-semibold mb-2">Important</h3>
              <ul className="text-gray-300 space-y-1 text-sm">
                <li>
                  • You must approve GuardDog for each token you want protected
                </li>
                <li>
                  • Protected tokens are transferred to the GuardianVault contract
                </li>
                <li>• You can withdraw protected tokens at any time</li>
                <li>• Disabling protection does not affect already protected tokens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
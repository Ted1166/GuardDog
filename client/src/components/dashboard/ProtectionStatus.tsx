import { useProtection } from '../../hooks/useProtection';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatDuration, formatDateTime } from '../../utils/formatters';
import { useState } from 'react';

interface ProtectionStatusProps {
  isProtected: boolean;
  loading: boolean;
  address?: string;
}

export default function ProtectionStatus({
  isProtected,
  loading,
  address,
}: ProtectionStatusProps) {
  const { enable, disable, protectionStartTime, duration } = useProtection(address);
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggle = async () => {
    setActionLoading(true);
    try {
      if (isProtected) {
        await disable();
      } else {
        await enable();
      }
    } catch (error) {
      console.error('Failed to toggle protection:', error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 opacity-5 ${
          isProtected
            ? 'bg-gradient-to-br from-green-500 to-blue-500'
            : 'bg-gradient-to-br from-gray-500 to-gray-700'
        }`}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Protection Status
            </h2>
            <p className="text-gray-400">
              {isProtected
                ? 'Your wallet is actively monitored and protected'
                : 'Enable GuardDog protection for your wallet'}
            </p>
          </div>

          {/* Status Badge */}
          <div
            className={`px-4 py-2 rounded-full font-semibold text-lg ${
              isProtected
                ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                : 'bg-gray-700/50 text-gray-400 border-2 border-gray-600'
            }`}
          >
            {isProtected ? '🛡️ Active' : '⚠️ Inactive'}
          </div>
        </div>

        {/* Protection Details */}
        {isProtected && protectionStartTime && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Protected Since</div>
              <div className="text-white font-semibold">
                {formatDateTime(protectionStartTime)}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Protection Duration</div>
              <div className="text-white font-semibold">
                {formatDuration(duration || 0)}
              </div>
            </div>
          </div>
        )}

        {/* Features List */}
        {isProtected && (
          <div className="bg-gray-800/30 rounded-lg p-4 mb-6">
            <h3 className="text-white font-medium mb-3">Active Features</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">24/7 AI Threat Monitoring</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">Automatic Token Protection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">Safe Custody Storage</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">Real-time Threat Alerts</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleToggle}
          loading={loading || actionLoading}
          variant={isProtected ? 'danger' : 'success'}
          className="w-full"
        >
          {isProtected ? 'Disable Protection' : '🛡️ Enable Protection'}
        </Button>

        {!isProtected && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            Enable protection to start monitoring your wallet for threats
          </p>
        )}
      </div>
    </Card>
  );
}
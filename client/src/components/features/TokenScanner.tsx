import { useState } from 'react';
import { useTokenScanner } from '../../hooks/useTokenScanner';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatAddress } from '../../utils/formatters';

export default function TokenScanner() {
  const [address, setAddress] = useState('');
  const { scanning, result, error, scanToken, clearResult } = useTokenScanner();

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    scanToken(address);
  };

  const handleClear = () => {
    clearResult();
    setAddress('');
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Token Scanner</h2>
          <p className="text-gray-400 text-sm">
            Analyze any token contract for security threats
          </p>
        </div>
        <span className="text-4xl">🔍</span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleScan} className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Contract Address
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <Button type="submit" loading={scanning}>
            {scanning ? 'Scanning...' : 'Scan'}
          </Button>
          {result && (
            <Button type="button" variant="secondary" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </form>

      {/* Scan Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Overall Status */}
          <div
            className={`p-4 rounded-lg border-2 ${
              result.isScam
                ? 'bg-red-500/10 border-red-500/50'
                : result.warnings.length > 0
                ? 'bg-yellow-500/10 border-yellow-500/50'
                : 'bg-green-500/10 border-green-500/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">
                {result.isScam
                  ? '🚨 High Risk Detected'
                  : result.warnings.length > 0
                  ? '⚠️ Proceed with Caution'
                  : '✅ No Immediate Threats'}
              </h3>
              <Badge
                variant={
                  result.isScam
                    ? 'danger'
                    : result.warnings.length > 0
                    ? 'warning'
                    : 'success'
                }
              >
                Risk: {result.threatLevel}/100
              </Badge>
            </div>
            <p className="text-sm text-gray-300">
              Contract: <code className="font-mono">{formatAddress(result.address, 8)}</code>
            </p>
          </div>

          {/* Threats */}
          {result.threats.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <span>⛔</span> Threats Found ({result.threats.length})
              </h4>
              <ul className="space-y-1">
                {result.threats.map((threat, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400 mt-1">•</span>
                    <span>{threat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                <span>⚠️</span> Warnings ({result.warnings.length})
              </h4>
              <ul className="space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Safe Checks */}
          {result.safeChecks.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                <span>✅</span> Passed Checks ({result.safeChecks.length})
              </h4>
              <ul className="space-y-1">
                {result.safeChecks.map((check, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400 mt-1">•</span>
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Community Info */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Community Reports</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Reports:</span>
              <span className="text-white font-medium">{result.communityReports}</span>
            </div>
            {result.verified && (
              <div className="mt-2 text-sm text-blue-400">
                ✓ Verified as malicious by community
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400">
              ⚠️ <strong>Disclaimer:</strong> This scan provides basic analysis. Always DYOR (Do Your Own Research) before interacting with any token. GuardDog is not responsible for any losses.
            </p>
          </div>
        </div>
      )}

      {/* Info when no scan */}
      {!result && !scanning && (
        <div className="bg-gray-800/30 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-white font-medium mb-2">Enter a Token Address</h3>
          <p className="text-gray-400 text-sm">
            We'll analyze the contract for common scam patterns, community reports, and security risks.
          </p>
        </div>
      )}
    </Card>
  );
}
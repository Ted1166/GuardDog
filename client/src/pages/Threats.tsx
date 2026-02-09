import { useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import ConnectWallet from '../components/wallet/ConnectWallet';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  formatAddress,
  formatRelativeTime,
  getThreatBadge,
  isValidAddress,
} from '../utils/formatters';
import { getThreatReports, reportThreat, upvoteThreat } from '../utils/contracts';
// import { ethers } from 'ethers';

interface ThreatReport {
  reporter: string;
  timestamp: bigint;
  threatLevel: number;
  threatType: string;
  evidence: string;
  verified: boolean;
  upvotes: bigint;
}

export default function Threats() {
  const { isConnected, provider, signer } = useWallet();
  const [threats, setThreats] = useState<ThreatReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  const [reportAddress, setReportAddress] = useState('');
  const [threatLevel, setThreatLevel] = useState(75);
  const [threatType, setThreatType] = useState('honeypot');
  const [evidence, setEvidence] = useState('');
  const [reporting, setReporting] = useState(false);

  const loadThreats = async (contractAddress: string) => {
    if (!provider || !isValidAddress(contractAddress)) return;

    setLoading(true);
    try {
      const reports = await getThreatReports(contractAddress, provider);
      setThreats(reports);
    } catch (error) {
      console.error('Failed to load threats:', error);
      setThreats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress) {
      loadThreats(searchAddress);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !isValidAddress(reportAddress)) return;

    setReporting(true);
    try {
      await reportThreat(signer, reportAddress, threatLevel, threatType, evidence);
      setShowReportModal(false);
      setReportAddress('');
      setEvidence('');

      if (searchAddress === reportAddress) {
        loadThreats(reportAddress);
      }
    } catch (error) {
      console.error('Failed to report threat:', error);
    } finally {
      setReporting(false);
    }
  };

  const handleUpvote = async (reportIndex: number) => {
    if (!signer || !searchAddress) return;

    try {
      await upvoteThreat(signer, searchAddress, reportIndex);
      loadThreats(searchAddress);
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Threat Database</h1>
          <p className="text-gray-400 mb-6">
            Connect your wallet to access threat reports
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Threat Database
            </h1>
            <p className="text-gray-400">
              Community-reported malicious contracts and scams
            </p>
          </div>
          <Button onClick={() => setShowReportModal(true)}>
            🚨 Report Threat
          </Button>
        </div>

        {/* Search */}
        <Card>
          <form onSubmit={handleSearch}>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search Contract Address
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <Button type="submit" loading={loading}>
                Search
              </Button>
            </div>
          </form>
        </Card>

        {/* Results */}
        {threats.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">
              Reports for {formatAddress(searchAddress)}
            </h2>
            <div className="space-y-4">
              {threats.map((threat, index) => {
                const badge = getThreatBadge(threat.threatLevel);
                return (
                  <div
                    key={index}
                    className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={badge.className}>
                          {badge.label} ({threat.threatLevel})
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {threat.threatType}
                        </span>
                        {threat.verified && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(threat.timestamp)}
                      </span>
                    </div>

                    <p className="text-gray-300 mb-3">{threat.evidence}</p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        Reported by {formatAddress(threat.reporter)}
                      </span>
                      <button
                        onClick={() => handleUpvote(index)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                      >
                        👍 {threat.upvotes.toString()}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {searchAddress && threats.length === 0 && !loading && (
          <Card>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-white font-medium mb-2">No Reports Found</h3>
              <p className="text-gray-400">
                This contract has no community reports
              </p>
            </div>
          </Card>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <Card className="max-w-lg w-full">
              <h2 className="text-2xl font-bold text-white mb-4">
                Report Threat
              </h2>
              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    value={reportAddress}
                    onChange={(e) => setReportAddress(e.target.value)}
                    placeholder="0x..."
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Threat Type
                  </label>
                  <select
                    value={threatType}
                    onChange={(e) => setThreatType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="honeypot">Honeypot</option>
                    <option value="rugpull">Rug Pull</option>
                    <option value="drainer">Token Drainer</option>
                    <option value="phishing">Phishing</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Threat Level: {threatLevel}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={threatLevel}
                    onChange={(e) => setThreatLevel(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Safe</span>
                    <span>Critical</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Evidence / Description
                  </label>
                  <textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Describe the threat or provide evidence..."
                    required
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={reporting} className="flex-1">
                    Submit Report
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
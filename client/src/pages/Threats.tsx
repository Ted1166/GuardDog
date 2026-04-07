import { useState, useEffect } from 'react';
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
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESSES,
  NETWORKS,
  BLOCK_EXPLORER,
  SUPPORTED_NETWORKS,
  type NetworkKey,
  getNetworkFromChainId,
} from '../config/contracts';

const THREAT_REGISTRY_ABI = [
  'event ThreatReported(address indexed contractAddress, address indexed reporter, uint8 threatLevel, string threatType)',
  'function getAggregateThreatScore(address contractAddress) view returns (uint8)',
  'function getAllReports(address contractAddress) view returns (tuple(address reporter, uint256 timestamp, uint8 threatLevel, string threatType, string evidence, bool verified, uint256 upvotes)[])',
];

function getNetworkForChain(chainId: string): NetworkKey {
  const detected = getNetworkFromChainId(chainId);
  return SUPPORTED_NETWORKS.includes(detected) ? detected : 'bscTestnet';
}

function getReadProvider(network: NetworkKey): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORKS[network].rpcUrls[0]);
}

interface ThreatReport {
  reporter: string;
  timestamp: bigint;
  threatLevel: number;
  threatType: string;
  evidence: string;
  verified: boolean;
  upvotes: bigint;
}

interface RecentThreat {
  contractAddress: string;
  latestReport: ThreatReport;
  reportCount: number;
  aggregateScore: number;
}

const THREAT_TYPE_LABELS: Record<string, string> = {
  honeypot: 'Honeypot', Honeypot: 'Honeypot',
  rugpull: 'Rug Pull', 'Rug Pull': 'Rug Pull',
  drainer: 'Token Drainer', 'Token Drainer': 'Token Drainer',
  phishing: 'Phishing', Phishing: 'Phishing',
  other: 'Other', Other: 'Other',
};

async function fetchLogsChunked(
  contract: ethers.Contract,
  filter: ethers.DeferredTopicFilter,
  fromBlock: number,
  toBlock: number,
  chunkSize = 3000
): Promise<ethers.Log[]> {
  const all: ethers.Log[] = [];
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, toBlock);
    try {
      const chunk = await contract.queryFilter(filter, start, end);
      all.push(...(chunk as ethers.Log[]));
    } catch {
      // skip bad chunks, keep going
    }
  }
  return all;
}

export default function Threats() {
  const { isConnected, signer, chainId } = useWallet();
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [searchAddress, setSearchAddress] = useState('');
  const [searchResults, setSearchResults] = useState<ThreatReport[]>([]);
  const [searching, setSearching] = useState(false);

  const [recentThreats, setRecentThreats] = useState<RecentThreat[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAddress, setReportAddress] = useState('');
  const [threatLevel, setThreatLevel] = useState(75);
  const [threatType, setThreatType] = useState('honeypot');
  const [evidence, setEvidence] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const currentNetwork = getNetworkForChain(chainId);

  useEffect(() => { loadRecentThreats(); }, [chainId]);

  useEffect(() => {
    if (signer) signer.getAddress().then(setWalletAddress);
  }, [signer]);

  const loadRecentThreats = async () => {
    setLoadingRecent(true);
    try {
      const network = getNetworkForChain(chainId);
      const readProvider = getReadProvider(network);
      const threatRegistryAddress = CONTRACT_ADDRESSES[network].ThreatRegistry;
      const contract = new ethers.Contract(threatRegistryAddress, THREAT_REGISTRY_ABI, readProvider);

      const latestBlock = await readProvider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 30000); // ~24h on BSC testnet

      const filter = contract.filters.ThreatReported();
      const events = await fetchLogsChunked(contract, filter, fromBlock, latestBlock);

      const seen = new Set<string>();
      const uniqueAddresses: string[] = [];
      for (const ev of [...events].reverse()) {
        const parsed = contract.interface.parseLog({ topics: ev.topics as string[], data: ev.data });
        const addr: string = parsed?.args?.contractAddress;
        if (addr && !seen.has(addr.toLowerCase())) {
          seen.add(addr.toLowerCase());
          uniqueAddresses.push(addr);
        }
      }

      const recent: RecentThreat[] = [];
      for (const contractAddress of uniqueAddresses.slice(0, 15)) {
        try {
          const reports: ThreatReport[] = await contract.getAllReports(contractAddress);
          if (!reports || reports.length === 0) continue;
          let aggregateScore = 0;
          try {
            aggregateScore = Number(await contract.getAggregateThreatScore(contractAddress));
          } catch { /* ignore */ }
          recent.push({ contractAddress, latestReport: reports[reports.length - 1], reportCount: reports.length, aggregateScore });
        } catch { /* skip */ }
      }
      setRecentThreats(recent);
    } catch (error) {
      console.error('Failed to load recent threats:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAddress(searchAddress)) return;
    setSearching(true);
    try {
      const network = getNetworkForChain(chainId);
      const reports = await getThreatReports(searchAddress, getReadProvider(network), network);
      setSearchResults(reports as ThreatReport[]);
    } catch (error) {
      console.error('Failed to load threats:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !isValidAddress(reportAddress)) return;
    setReporting(true);
    try {
      await reportThreat(signer, reportAddress, threatLevel, threatType, evidence, currentNetwork);
      setReportSuccess(true);
      setTimeout(async () => {
        setShowReportModal(false);
        setReportAddress(''); setEvidence(''); setReportSuccess(false);
        await loadRecentThreats();
        if (searchAddress === reportAddress) await handleSearch({ preventDefault: () => {} } as React.FormEvent);
      }, 1500);
    } catch (error) {
      console.error('Failed to report threat:', error);
    } finally {
      setReporting(false);
    }
  };

  const handleUpvote = async (contractAddress: string, reportIndex: number) => {
    if (!signer) return;
    try {
      await upvoteThreat(signer, contractAddress, reportIndex, currentNetwork);
      await loadRecentThreats();
      if (searchAddress) await handleSearch({ preventDefault: () => {} } as React.FormEvent);
    } catch (error) { console.error('Failed to upvote:', error); }
  };

  const explorerBase = BLOCK_EXPLORER[currentNetwork];

  const ThreatCard = ({ contractAddress, report, reportIndex, showContract = true, currentAddress }: {
    contractAddress: string;
    report: ThreatReport;
    reportIndex: number;
    showContract?: boolean;
    currentAddress?: string;
  }) => {
    const badge = getThreatBadge(report.threatLevel);
    const typeLabel = THREAT_TYPE_LABELS[String(report.threatType)] || report.threatType;
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={badge.className}>{badge.label} ({report.threatLevel})</Badge>
            <span className="text-sm text-gray-400">{typeLabel}</span>
            {report.verified && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">✓ Verified</span>
            )}
          </div>
          <span className="text-sm text-gray-500 shrink-0">{formatRelativeTime(report.timestamp)}</span>
        </div>

        {showContract && (
          <div className="mb-2">
            <span className="text-xs text-gray-500">Contract: </span>
            <button
              onClick={() => {
                setSearchAddress(contractAddress);
                setSearching(true);
                getThreatReports(contractAddress, getReadProvider(currentNetwork), currentNetwork)
                  .then((r) => setSearchResults(r as ThreatReport[]))
                  .finally(() => setSearching(false));
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-mono"
            >
              {formatAddress(contractAddress)}
            </button>
            <a href={`${explorerBase}/address/${contractAddress}`} target="_blank"
              rel="noopener noreferrer" className="ml-2 text-xs text-gray-500 hover:text-gray-300">↗</a>
          </div>
        )}

        <p className="text-gray-300 mb-3 text-sm">{report.evidence || 'No evidence provided'}</p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Reported by {formatAddress(report.reporter)}</span>
          <button onClick={() => handleUpvote(contractAddress, reportIndex)}
            disabled={currentAddress?.toLowerCase() === report.reporter.toLowerCase()}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
            👍 {report.upvotes.toString()}
          </button>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Threat Database</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to report threats</p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Threat Database</h1>
            <p className="text-gray-400">Community-reported malicious contracts and scams</p>
          </div>
          <Button onClick={() => setShowReportModal(true)}>🚨 Report Threat</Button>
        </div>

        {/* Search */}
        <Card>
          <form onSubmit={handleSearch}>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search Contract Address</label>
            <div className="flex gap-3">
              <input type="text" value={searchAddress} onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="0x..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <Button type="submit" loading={searching}>Search</Button>
            </div>
          </form>
        </Card>

        {/* Search Results */}
        {searchAddress && isValidAddress(searchAddress) && (
          <Card>
            <h2 className="text-xl font-semibold text-white mb-4">
              Reports for {formatAddress(searchAddress)}
              <a href={`${explorerBase}/address/${searchAddress}`} target="_blank"
                rel="noopener noreferrer" className="ml-3 text-sm text-blue-400 hover:text-blue-300">↗ Explorer</a>
            </h2>
            {searching ? (
              <div className="text-center py-8 text-gray-400">Loading reports...</div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((threat, index) => (
                  <ThreatCard 
                  key={index} 
                  contractAddress={searchAddress} 
                  report={threat} 
                  reportIndex={index} 
                  showContract={false}
                  currentAddress={walletAddress}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-white font-medium mb-2">No Reports Found</h3>
                <p className="text-gray-400">This contract has no community reports</p>
              </div>
            )}
          </Card>
        )}

        {/* Recent Threats Feed */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Community Reports</h2>
            <button onClick={loadRecentThreats} disabled={loadingRecent}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50">
              {loadingRecent ? 'Scanning...' : '↻ Refresh'}
            </button>
          </div>
          {loadingRecent ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-2xl mb-2">🔍</div>
              <p>Scanning {NETWORKS[currentNetwork].chainName} for threat reports...</p>
            </div>
          ) : recentThreats.length > 0 ? (
            <div className="space-y-4">
              {recentThreats.map((item) => (
                <div key={item.contractAddress}>
                  {item.reportCount > 1 && (
                    <p className="text-xs text-gray-500 mb-1 px-1">
                      {item.reportCount} reports · Aggregate score: {item.aggregateScore}/100
                    </p>
                  )}
                  <ThreatCard 
                  contractAddress={item.contractAddress} 
                  report={item.latestReport}
                  reportIndex={item.reportCount - 1} 
                  showContract={true}
                  currentAddress={walletAddress}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🛡️</div>
              <h3 className="text-white font-medium mb-2">No threats reported yet</h3>
              <p className="text-gray-400 text-sm">Be the first to report a malicious contract</p>
            </div>
          )}
        </Card>

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <Card className="max-w-lg w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Report Threat</h2>
              {reportSuccess ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-green-400 font-medium">Report submitted on-chain!</p>
                </div>
              ) : (
                <form onSubmit={handleReport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contract Address</label>
                    <input type="text" value={reportAddress} onChange={(e) => setReportAddress(e.target.value)}
                      placeholder="0x..." required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Threat Type</label>
                    <select value={threatType} onChange={(e) => setThreatType(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                      <option value="honeypot">Honeypot</option>
                      <option value="rugpull">Rug Pull</option>
                      <option value="drainer">Token Drainer</option>
                      <option value="phishing">Phishing</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Threat Level: {threatLevel}</label>
                    <input type="range" min="0" max="100" value={threatLevel}
                      onChange={(e) => setThreatLevel(parseInt(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Safe</span><span>Critical</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Evidence / Description</label>
                    <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)}
                      placeholder="Describe the threat or provide evidence..." required rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="secondary" onClick={() => setShowReportModal(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" loading={reporting} className="flex-1">Submit Report</Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
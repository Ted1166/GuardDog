import Card from '../ui/Card';
import Badge from '../ui/Badge';
import ThreatExplainer from '../features/ThreatExplainer';
import { formatRelativeTime, formatAddress, getThreatBadge } from '../../utils/formatters';

interface ThreatReport {
  reporter: string;
  timestamp: bigint;
  threatLevel: number;
  threatType: string;
  evidence: string;
  verified: boolean;
  upvotes: bigint;
  contractAddress?: string;
}

interface ThreatAlertsProps {
  threats: ThreatReport[];
}

export default function ThreatAlerts({ threats }: ThreatAlertsProps) {
  if (threats.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Threat Alerts</h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-white font-medium mb-2">All Clear!</h3>
          <p className="text-gray-400">No threats detected. Your wallet is safe.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Recent Threat Alerts</h2>
        <Badge variant="info">{threats.length} Reports</Badge>
      </div>

      <div className="space-y-4">
        {threats.map((threat, index) => {
          const threatBadge = getThreatBadge(threat.threatLevel);

          return (
            <div
              key={`${threat.contractAddress || 'unknown'}-${index}`}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={threatBadge.className}>
                    {threatBadge.label} ({threat.threatLevel})
                  </Badge>
                  <span className="text-sm text-gray-400">{threat.threatType}</span>
                  {threat.verified && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {formatRelativeTime(threat.timestamp)}
                </span>
              </div>

              {/* Evidence */}
              {threat.evidence && (
                <p className="text-gray-300 mb-3 text-sm">{threat.evidence}</p>
              )}

              {/* Details */}
              <div className="space-y-2">
                {threat.contractAddress && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Contract:</span>
                    <code className="text-white font-mono">
                      {formatAddress(threat.contractAddress)}
                    </code>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Reported by:</span>
                  <code className="text-white font-mono">{formatAddress(threat.reporter)}</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Community votes:</span>
                  <span className="text-white">👍 {threat.upvotes.toString()}</span>
                </div>
              </div>

              {/* AI Explainer */}
              <ThreatExplainer
                threat={{
                  contractAddress: threat.contractAddress || '',
                  threatType: threat.threatType,
                  threatLevel: threat.threatLevel,
                  evidence: threat.evidence || '',
                  reportCount: 1,
                  verified: threat.verified,
                  upvotes: Number(threat.upvotes),
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <a
          href="/threats"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center gap-2"
        >
          View All Threats <span>→</span>
        </a>
      </div>
    </Card>
  );
}
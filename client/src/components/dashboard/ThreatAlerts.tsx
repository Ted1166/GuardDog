import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { formatRelativeTime, formatAddress, getThreatBadge } from '../../utils/formatters';

interface Threat {
  id: string;
  contractAddress: string;
  threatLevel: number;
  threatType: string;
  timestamp: number;
  action: string;
  status: 'blocked' | 'monitoring' | 'resolved';
}

interface ThreatAlertsProps {
  threats: Threat[];
}

export default function ThreatAlerts({ threats }: ThreatAlertsProps) {
  if (threats.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">
          Recent Threat Alerts
        </h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-white font-medium mb-2">All Clear!</h3>
          <p className="text-gray-400">
            No threats detected. Your wallet is safe.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          Recent Threat Alerts
        </h2>
        <Badge variant="info">{threats.length} Active</Badge>
      </div>

      <div className="space-y-3">
        {threats.map((threat) => {
          const threatBadge = getThreatBadge(threat.threatLevel);
          
          return (
            <div
              key={threat.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Badge className={threatBadge.className}>
                    {threatBadge.label}
                  </Badge>
                  <span className="text-sm text-gray-400">
                    {threat.threatType}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(threat.timestamp)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Contract:</span>
                  <code className="text-white font-mono">
                    {formatAddress(threat.contractAddress)}
                  </code>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Action Taken:</span>
                  <span className="text-white font-medium">{threat.action}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      threat.status === 'blocked'
                        ? 'bg-red-500/20 text-red-400'
                        : threat.status === 'monitoring'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {threat.status.charAt(0).toUpperCase() +
                      threat.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Link */}
      <div className="mt-4 text-center">
        <a
          href="/threats"
          className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center gap-2"
        >
          View All Threats
          <span>→</span>
        </a>
      </div>
    </Card>
  );
}
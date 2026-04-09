import { useState } from 'react';
import { useThreatExplainer, type ThreatData } from '../../hooks/useAIExplainer';

interface ThreatExplainerProps {
  threat: ThreatData;
  compact?: boolean;
}

function VerdictBadge({ text }: { text: string }) {
  const upper = text.toUpperCase();
  if (upper.includes('DANGER')) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400">
        🔴 DANGER
      </span>
    );
  }
  if (upper.includes('CAUTION')) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400">
        🟡 CAUTION
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-400">
      🟢 SAFE
    </span>
  );
}

function renderExplanation(text: string) {
  const lines = text.split('\n').filter(Boolean);
  const verdict = lines.find(l =>
    l.toUpperCase().includes('SAFE') ||
    l.toUpperCase().includes('CAUTION') ||
    l.toUpperCase().includes('DANGER')
  );

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const isVerdict =
          line.toUpperCase().includes('SAFE') ||
          line.toUpperCase().includes('CAUTION') ||
          line.toUpperCase().includes('DANGER');

        if (line.match(/^[-•*]\s/)) {
          return (
            <div key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-blue-400 shrink-0 mt-0.5">›</span>
              <span>{line.replace(/^[-•*]\s/, '')}</span>
            </div>
          );
        }
        if (isVerdict) return null;
        return (
          <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>
        );
      })}
      {verdict && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-700 mt-3">
          <span className="text-xs text-gray-400">Verdict:</span>
          <VerdictBadge text={verdict} />
        </div>
      )}
    </div>
  );
}

export default function ThreatExplainer({ threat }: ThreatExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { explanation, loading, error, explain, reset } = useThreatExplainer();

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      reset();
      return;
    }
    setIsOpen(true);
    if (!explanation) {
      await explain(threat);
    }
  };

  return (
    <div className="mt-3">
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 text-xs font-medium transition-all rounded-lg px-3 py-1.5 border ${
          isOpen
            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-blue-400 hover:border-blue-500/30'
        }`}
      >
        <span>🤖</span>
        <span>{isOpen ? 'Hide' : 'Explain with'} GuardDog AI</span>
        {loading && (
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-1" />
        )}
      </button>

      {/* Explanation panel */}
      {isOpen && (
        <div className="mt-3 bg-gray-900/80 border border-blue-500/20 rounded-xl p-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-xs">🐕</span>
            </div>
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              GuardDog AI Analysis
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-3 bg-gray-800 rounded animate-pulse"
                  style={{ width: `${70 + Math.random() * 30}%` }}
                />
              ))}
              <p className="text-xs text-gray-500 mt-2">Analyzing threat pattern...</p>
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">
              <span>⚠️ {error}</span>
              <button
                onClick={() => explain(threat)}
                className="ml-3 text-xs text-blue-400 hover:text-blue-300"
              >
                Retry
              </button>
            </div>
          ) : explanation ? (
            renderExplanation(explanation)
          ) : null}

          {/* Context chips */}
          {!loading && !error && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800">
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                Score: {threat.threatLevel}/100
              </span>
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full">
                {threat.reportCount} report{threat.reportCount !== 1 ? 's' : ''}
              </span>
              {threat.verified && (
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                  ✓ Verified
                </span>
              )}
              <button
                onClick={() => explain(threat)}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-full bg-gray-800 transition-colors ml-auto"
              >
                ↻ Re-analyze
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
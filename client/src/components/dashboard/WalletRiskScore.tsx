import { useEffect, useState } from 'react';
import { useProtection } from '../../hooks/useProtection';
import { useWallet } from '../../hooks/useWallet';
import {
  computeRiskScore,
  getGradeFromScore,
  useWalletRiskAI,
  type RiskFactor,
} from '../../hooks/useAIExplainer';

interface WalletRiskScoreProps {
  address: string;
  threatCount?: number;
  maxThreatLevel?: number;
  verifiedThreats?: number;
}

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const progress = ((100 - score) / 100) * circ;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background ring */}
      <circle cx="70" cy="70" r={radius} fill="none" stroke="#1F2937" strokeWidth="12" />
      {/* Colored progress ring */}
      <circle
        cx="70" cy="70" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={progress}
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      {/* Score text */}
      <text x="70" y="64" textAnchor="middle" fill="white"
        fontSize="28" fontWeight="bold" fontFamily="monospace">
        {score}
      </text>
      <text x="70" y="82" textAnchor="middle" fill="#9CA3AF" fontSize="11" fontFamily="sans-serif">
        / 100
      </text>
    </svg>
  );
}

function FactorRow({ factor }: { factor: RiskFactor }) {
  const isPositive = factor.impact >= 0;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-2 flex-1">
        <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? '✓' : '✗'}
        </span>
        <div>
          <p className="text-sm text-white font-medium">{factor.label}</p>
          <p className="text-xs text-gray-500">{factor.description}</p>
        </div>
      </div>
      <span className={`text-sm font-mono font-bold shrink-0 ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {isPositive ? '+' : ''}{factor.impact}
      </span>
    </div>
  );
}

export default function WalletRiskScore({
  address,
  threatCount = 0,
  maxThreatLevel = 0,
  verifiedThreats = 0,
}: WalletRiskScoreProps) {
  const { isProtected, duration } = useProtection(address);
  const { isCorrectNetwork } = useWallet();
  const { insight, loading: aiLoading, generateInsight } = useWalletRiskAI();
  const [showFactors, setShowFactors] = useState(false);
  const [hasGeneratedInsight, setHasGeneratedInsight] = useState(false);

  const protectionDays = duration ? Math.floor(Number(duration) / 86400) : 0;

  const { score, factors } = computeRiskScore({
    isProtected,
    threatCount,
    maxThreatLevel,
    verifiedThreats,
    isCorrectNetwork,
    protectionDays,
  });

  const { grade, color, label } = getGradeFromScore(score);

  useEffect(() => {
    if (address && !hasGeneratedInsight && score < 100) {
      setHasGeneratedInsight(true);
      generateInsight(score, factors, address);
    }
  }, [address, score]);

  const riskBg =
    score >= 85 ? 'from-green-500/5 to-transparent border-green-500/20' :
    score >= 70 ? 'from-blue-500/5 to-transparent border-blue-500/20' :
    score >= 55 ? 'from-yellow-500/5 to-transparent border-yellow-500/20' :
    score >= 35 ? 'from-orange-500/5 to-transparent border-orange-500/20' :
                  'from-red-500/5 to-transparent border-red-500/20';

  return (
    <div className={`bg-gradient-to-br ${riskBg} border rounded-xl p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Wallet Risk Score</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-powered security assessment</p>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full border"
          style={{ color, borderColor: color, backgroundColor: `${color}15` }}
        >
          Grade {grade} — {label}
        </span>
      </div>

      {/* Score + factors layout */}
      <div className="flex items-center gap-6">
        {/* Gauge */}
        <div className="shrink-0">
          <ScoreGauge score={score} color={color} />
        </div>

        {/* Right side */}
        <div className="flex-1 min-w-0">
          {/* AI Insight */}
          <div className="bg-gray-900/60 rounded-lg p-3 mb-3">
            {aiLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">GuardDog AI analyzing...</span>
              </div>
            ) : insight ? (
              <p className="text-sm text-gray-300 leading-relaxed">{insight}</p>
            ) : (
              <p className="text-sm text-gray-400">
                {score === 100
                  ? '✅ No risk factors detected. Your wallet looks clean.'
                  : 'Enable protection to get AI security insights.'}
              </p>
            )}
          </div>

          {/* Toggle factors */}
          <button
            onClick={() => setShowFactors(v => !v)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            {showFactors ? '▲ Hide' : '▼ Show'} {factors.length} risk factor{factors.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Factors breakdown */}
      {showFactors && (
        <div className="mt-4 bg-gray-900/40 rounded-lg px-4 py-2">
          {factors.map((f, i) => <FactorRow key={i} factor={f} />)}
        </div>
      )}

      {/* Refresh insight */}
      {!aiLoading && address && (
        <button
          onClick={() => generateInsight(score, factors, address)}
          className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full text-center"
        >
          ↻ Refresh AI insight
        </button>
      )}
    </div>
  );
}
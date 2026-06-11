// src/components/features/TokenScanner.tsx
import { useState, useCallback } from 'react';
import { useTokenScanner, type BytecodeAnalysis, type DetectedFunction } from '../../hooks/useTokenScanner';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatAddress } from '../../utils/formatters';

// ── Reuse Claude proxy from useAIExplainer pattern ────────────────────
const PROXY_URL    = import.meta.env.VITE_ANTHROPIC_PROXY_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function explainBytecodeWithAI(params: {
  address: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  analysis: BytecodeAnalysis;
  communityThreatLevel: number;
  verified: boolean;
}): Promise<string> {
  const { address, tokenName, tokenSymbol, analysis, communityThreatLevel, verified } = params;

  const fnList = analysis.detectedFunctions
    .filter(f => f.risk !== 'info')
    .map(f => `  • ${f.label} [${f.risk.toUpperCase()}]`)
    .join('\n') || '  None detected';

  const prompt = `You are a smart contract security expert. Analyze this EVM token contract and explain what it actually does and whether it is safe.

Contract: ${address}
Token: ${tokenName ? `${tokenName} (${tokenSymbol})` : 'Unknown'}
Contract size: ${analysis.contractSize} bytes
Community threat score: ${communityThreatLevel}/100
Community verified threat: ${verified ? 'YES' : 'No'}
Bytecode risk score: ${analysis.riskScore}/100

Bytecode findings:
${analysis.summary.join('\n')}

Non-standard functions detected in bytecode:
${fnList}

Flags:
- SELFDESTRUCT: ${analysis.hasSelfDestruct}
- DELEGATECALL: ${analysis.hasDelegateCall}
- Proxy/Upgradeable: ${analysis.hasProxyPattern}
- Mint function: ${analysis.hasMintFunction}
- Blacklist: ${analysis.hasBlacklist}
- Pause: ${analysis.hasPauseFunction}
- Tax/fee setter: ${analysis.hasTaxSetter}
- Hidden admin: ${analysis.hasHiddenAdmin}

Write a plain-English analysis covering:
1. What this contract appears to do based on its bytecode
2. The most significant risks for token holders
3. What specific attacks are possible given these functions
4. Whether a user should interact with this contract

Be specific and technical but understandable. Max 250 words.
End with: VERDICT: [SAFE / CAUTION / DANGER]`;

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      system: 'You are a smart contract security auditor. Be precise, technical, and direct. Never use filler phrases.',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
    }),
  });

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = await res.json();
  return data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || '';
}

// ── Risk colour helpers ────────────────────────────────────────────────
function riskColor(risk: 'danger' | 'warning' | 'info') {
  return risk === 'danger' ? '#EF4444' : risk === 'warning' ? '#F59E0B' : '#9CA3AF';
}
function riskBg(risk: 'danger' | 'warning' | 'info') {
  return risk === 'danger'
    ? 'bg-red-500/10 border-red-500/30 text-red-300'
    : risk === 'warning'
    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
    : 'bg-gray-800/50 border-gray-700 text-gray-400';
}

// ── Function chip ─────────────────────────────────────────────────────
function FunctionChip({ fn }: { fn: DetectedFunction }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${riskBg(fn.risk)}`}
    >
      <span style={{ color: riskColor(fn.risk) }}>
        {fn.risk === 'danger' ? '🚨' : fn.risk === 'warning' ? '⚠️' : 'ℹ️'}
      </span>
      {fn.label}
    </div>
  );
}

// ── Bytecode panel ────────────────────────────────────────────────────
function BytecodePanel({ analysis }: { analysis: BytecodeAnalysis }) {
  const [showFunctions, setShowFunctions] = useState(false);

  const dangerFns = analysis.detectedFunctions.filter(f => f.risk === 'danger');
  const warnFns   = analysis.detectedFunctions.filter(f => f.risk === 'warning');
  const infoFns   = analysis.detectedFunctions.filter(f => f.risk === 'info');

  const scoreColor =
    analysis.riskScore >= 65 ? '#EF4444' :
    analysis.riskScore >= 35 ? '#F59E0B' : '#10B981';

  return (
    <div className="bg-gray-900/80 border border-blue-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-blue-500/5 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          <span className="text-base">⛓️</span>
          <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">
            Bytecode Analysis
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {analysis.contractSize.toLocaleString()} bytes
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Bytecode risk:</span>
            <span className="text-sm font-bold" style={{ color: scoreColor }}>
              {analysis.riskScore}/100
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Flag grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'SELFDESTRUCT', active: analysis.hasSelfDestruct, risk: 'danger' as const },
            { label: 'Blacklist',    active: analysis.hasBlacklist,    risk: 'danger' as const },
            { label: 'Hidden Admin', active: analysis.hasHiddenAdmin,  risk: 'danger' as const },
            { label: 'Mint',         active: analysis.hasMintFunction, risk: 'warning' as const },
            { label: 'Pause',        active: analysis.hasPauseFunction,risk: 'warning' as const },
            { label: 'Tax Setter',   active: analysis.hasTaxSetter,    risk: 'warning' as const },
            { label: 'Proxy',        active: analysis.hasProxyPattern, risk: 'warning' as const },
            { label: 'DELEGATECALL', active: analysis.hasDelegateCall, risk: 'warning' as const },
          ].map(({ label, active, risk }) => (
            <div
              key={label}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                active
                  ? risk === 'danger'
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300'
                  : 'bg-gray-800/30 border-gray-800 text-gray-600'
              }`}
            >
              <span>{active ? (risk === 'danger' ? '🔴' : '🟡') : '⚪'}</span>
              {label}
            </div>
          ))}
        </div>

        {/* Summary findings */}
        {analysis.summary.length > 0 && (
          <div className="space-y-1.5">
            {analysis.summary.map((s, i) => (
              <p key={i} className="text-sm text-gray-300">{s}</p>
            ))}
          </div>
        )}

        {/* Detected functions toggle */}
        {analysis.detectedFunctions.length > 0 && (
          <div>
            <button
              onClick={() => setShowFunctions(v => !v)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              {showFunctions ? '▲ Hide' : '▼ Show'} detected function signatures
              {dangerFns.length > 0 && (
                <span className="ml-1 bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                  {dangerFns.length} danger
                </span>
              )}
              {warnFns.length > 0 && (
                <span className="ml-1 bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                  {warnFns.length} warning
                </span>
              )}
            </button>

            {showFunctions && (
              <div className="mt-3 space-y-3">
                {dangerFns.length > 0 && (
                  <div>
                    <p className="text-xs text-red-400 font-semibold mb-2 uppercase tracking-wider">Danger</p>
                    <div className="flex flex-wrap gap-2">
                      {dangerFns.map(f => <FunctionChip key={f.selector} fn={f} />)}
                    </div>
                  </div>
                )}
                {warnFns.length > 0 && (
                  <div>
                    <p className="text-xs text-yellow-400 font-semibold mb-2 uppercase tracking-wider">Warning</p>
                    <div className="flex flex-wrap gap-2">
                      {warnFns.map(f => <FunctionChip key={f.selector} fn={f} />)}
                    </div>
                  </div>
                )}
                {infoFns.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Standard</p>
                    <div className="flex flex-wrap gap-2">
                      {infoFns.map(f => <FunctionChip key={f.selector} fn={f} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Contract Explanation ────────────────────────────────────────────
function AIContractExplainer({
  result,
}: {
  result: NonNullable<ReturnType<typeof useTokenScanner>['result']>;
}) {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleExplain = useCallback(async () => {
    if (!result.bytecodeAnalysis) return;
    setIsOpen(true);
    if (explanation) return; // already fetched

    setLoading(true);
    setError('');
    try {
      const text = await explainBytecodeWithAI({
        address: result.address,
        tokenName: result.tokenName,
        tokenSymbol: result.tokenSymbol,
        analysis: result.bytecodeAnalysis,
        communityThreatLevel: result.threatLevel,
        verified: result.verified,
      });
      setExplanation(text);
    } catch (err: any) {
      setError(err.message || 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  }, [result, explanation]);

  const verdict = explanation.match(/VERDICT:\s*(SAFE|CAUTION|DANGER)/i)?.[1]?.toUpperCase();
  const bodyText = explanation.replace(/VERDICT:\s*(SAFE|CAUTION|DANGER)/i, '').trim();

  return (
    <div className="mt-4">
      <button
        onClick={isOpen ? () => setIsOpen(false) : handleExplain}
        className={`flex items-center gap-2 text-sm font-medium transition-all rounded-xl px-4 py-2.5 border ${
          isOpen
            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-blue-400 hover:border-blue-500/30'
        }`}
      >
        <span>🤖</span>
        <span>{isOpen ? 'Hide' : 'Explain Contract with'} GuardDog AI</span>
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 bg-gray-900/80 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-xs">🐕</span>
            </div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              GuardDog AI — Contract Analysis
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-800 rounded animate-pulse"
                  style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
              <p className="text-xs text-gray-500 mt-2">Reading bytecode patterns...</p>
            </div>
          ) : error ? (
            <div className="text-sm text-red-400">
              ⚠️ {error}
              <button onClick={handleExplain}
                className="ml-3 text-xs text-blue-400 hover:text-blue-300">Retry</button>
            </div>
          ) : explanation ? (
            <div className="space-y-3">
              {/* Body */}
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {bodyText}
              </div>

              {/* Verdict */}
              {verdict && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-800">
                  <span className="text-xs text-gray-400">AI Verdict:</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      verdict === 'DANGER'
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : verdict === 'CAUTION'
                        ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                        : 'bg-green-500/20 border-green-500/40 text-green-400'
                    }`}
                  >
                    {verdict === 'DANGER' ? '🔴' : verdict === 'CAUTION' ? '🟡' : '🟢'} {verdict}
                  </span>
                  <button onClick={() => { setExplanation(''); handleExplain(); }}
                    className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    ↻ Re-analyze
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── Combined risk score bar ────────────────────────────────────────────
function CombinedRiskBar({ score }: { score: number }) {
  const color =
    score >= 65 ? '#EF4444' :
    score >= 35 ? '#F59E0B' : '#10B981';
  const label =
    score >= 65 ? 'HIGH RISK' :
    score >= 35 ? 'MODERATE' : 'LOW RISK';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold shrink-0" style={{ color }}>
        {score}/100 — {label}
      </span>
    </div>
  );
}

// ── Main TokenScanner ─────────────────────────────────────────────────
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
            Deep bytecode analysis + AI contract explanation + community threat data
          </p>
        </div>
        <span className="text-4xl">🔍</span>
      </div>

      {/* Input */}
      <form onSubmit={handleScan} className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Token Contract Address
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="0x..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <Button type="submit" loading={scanning}>
            {scanning ? 'Scanning...' : 'Scan'}
          </Button>
          {result && (
            <Button type="button" variant="secondary" onClick={handleClear}>Clear</Button>
          )}
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </form>

      {/* Loading state */}
      {scanning && (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium mb-1">Analyzing contract...</p>
          <p className="text-gray-400 text-sm">Reading bytecode, checking threat registry</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">

          {/* Overall status */}
          <div className={`p-4 rounded-xl border-2 ${
            result.isScam
              ? 'bg-red-500/10 border-red-500/50'
              : result.warnings.length > 0
              ? 'bg-yellow-500/10 border-yellow-500/50'
              : 'bg-green-500/10 border-green-500/50'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">
                {result.isScam
                  ? '🚨 High Risk Detected'
                  : result.warnings.length > 0
                  ? '⚠️ Proceed with Caution'
                  : '✅ No Immediate Threats'}
              </h3>
              <Badge variant={result.isScam ? 'danger' : result.warnings.length > 0 ? 'warning' : 'success'}>
                {result.tokenSymbol ?? 'Unknown'}
              </Badge>
            </div>
            <p className="text-sm text-gray-300 mb-3">
              <code className="font-mono">{formatAddress(result.address, 8)}</code>
              {result.tokenName && (
                <span className="ml-2 text-gray-400">— {result.tokenName}</span>
              )}
            </p>
            <CombinedRiskBar score={result.combinedRiskScore} />
            <p className="text-xs text-gray-500 mt-2">
              Combined score: {Math.round(result.threatLevel * 0.6)}pts community + {Math.round((result.bytecodeAnalysis?.riskScore ?? 0) * 0.4)}pts bytecode
            </p>
          </div>

          {/* ── Bytecode Analysis Panel ── */}
          {result.bytecodeAnalysis && (
            <BytecodePanel analysis={result.bytecodeAnalysis} />
          )}

          {/* ── AI Explanation ── */}
          {result.bytecodeAnalysis && (
            <AIContractExplainer result={result} />
          )}

          {/* Threats */}
          {result.threats.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                ⛔ Threats Found ({result.threats.length})
              </h4>
              <ul className="space-y-1.5">
                {result.threats.map((t, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5 shrink-0">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                ⚠️ Warnings ({result.warnings.length})
              </h4>
              <ul className="space-y-1.5">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Safe checks */}
          {result.safeChecks.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                ✅ Passed Checks ({result.safeChecks.length})
              </h4>
              <ul className="space-y-1.5">
                {result.safeChecks.map((c, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5 shrink-0">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Community */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-2">Community Reports</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Threat Score:</span>
              <span className="text-white font-medium">{result.threatLevel}/100</span>
            </div>
            {result.verified && (
              <div className="mt-2 text-sm text-blue-400">✓ Verified as malicious by community</div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-3">
            <p className="text-xs text-gray-400">
              ⚠️ <strong>Disclaimer:</strong> Bytecode analysis detects common patterns but is not a full audit.
              Always DYOR before interacting with any token. GuardDog is not responsible for any losses.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !scanning && (
        <div className="bg-gray-800/30 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">⛓️</div>
          <h3 className="text-white font-medium mb-2">Deep Contract Analysis</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Enter any EVM token address. GuardDog will analyze the raw bytecode for dangerous function
            signatures, proxy patterns, hidden admin functions, and get an AI explanation of what the contract does.
          </p>
        </div>
      )}
    </Card>
  );
}
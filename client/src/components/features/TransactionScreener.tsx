import { useEffect, useState, useCallback, useRef } from 'react';
import { useTransactionScreener, type TransactionRisk } from '../../hooks/useAIExplainer';
import { useWallet } from '../../hooks/useWallet';
import { CONTRACT_ADDRESSES, SUPPORTED_NETWORKS } from '../../config/contracts';

function riskColor(level: TransactionRisk['level']) {
  return level === 'danger' ? '#EF4444' : level === 'caution' ? '#F59E0B' : '#10B981';
}
function riskBg(level: TransactionRisk['level']) {
  return level === 'danger'
    ? 'from-red-500/10 border-red-500/30'
    : level === 'caution'
    ? 'from-yellow-500/10 border-yellow-500/30'
    : 'from-green-500/10 border-green-500/30';
}
function riskEmoji(level: TransactionRisk['level']) {
  return level === 'danger' ? '🔴' : level === 'caution' ? '🟡' : '🟢';
}

function RiskBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${score}%`, backgroundColor: color }}
      />
    </div>
  );
}

interface ScreenerModalProps {
  tx: Record<string, string>;
  risk: TransactionRisk | null;
  loading: boolean;
  error: string;
  onProceed: () => void;
  onCancel: () => void;
}

function ScreenerModal({ tx, risk, loading, error, onProceed, onCancel }: ScreenerModalProps) {
  const toShort = tx.to ? `${tx.to.slice(0, 8)}...${tx.to.slice(-6)}` : 'Unknown';
  const valueEth = tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(6) : '0';
  const methodSig = tx.data ? tx.data.slice(0, 10) : '0x';

  const KNOWN_METHODS: Record<string, string> = {
    '0x095ea7b3': 'approve()',
    '0x23b872dd': 'transferFrom()',
    '0xa9059cbb': 'transfer()',
    '0x38ed1739': 'swapExactTokensForTokens()',
    '0x7ff36ab5': 'swapExactETHForTokens()',
    '0x18cbafe5': 'swapExactTokensForETH()',
    '0x':         'Native Transfer',
  };
  const methodName = KNOWN_METHODS[methodSig] || `${methodSig}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Top bar */}
        <div className="bg-gray-950 px-6 py-4 border-b border-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <span>🐕</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">GuardDog Transaction Screen</h3>
            <p className="text-xs text-gray-400">AI security check before you sign</p>
          </div>
        </div>

        {/* Tx summary */}
        <div className="px-6 py-4 bg-gray-800/30 border-b border-gray-800">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">To Contract</p>
              <p className="font-mono text-white">{toShort}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Value</p>
              <p className="text-white">{valueEth} ETH/BNB</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Method</p>
              <p className="text-blue-400 font-mono text-xs">{methodName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Data Size</p>
              <p className="text-white">{tx.data ? Math.floor(tx.data.length / 2) : 0} bytes</p>
            </div>
          </div>
        </div>

        {/* AI Result */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="text-center py-6">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white font-medium text-sm mb-1">Analyzing transaction...</p>
              <p className="text-gray-500 text-xs">GuardDog AI is screening for risks</p>
            </div>
          ) : error ? (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Could not screen transaction</p>
              <p className="text-gray-400 text-xs">{error}</p>
              <p className="text-gray-500 text-xs mt-2">Proceed with caution and verify the contract manually.</p>
            </div>
          ) : risk ? (
            <div className={`bg-gradient-to-br ${riskBg(risk.level)} border rounded-xl p-4 space-y-3`}>
              {/* Level + score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{riskEmoji(risk.level)}</span>
                  <span
                    className="font-bold text-sm uppercase tracking-wide"
                    style={{ color: riskColor(risk.level) }}
                  >
                    {risk.level} — Risk Score {risk.score}/100
                  </span>
                </div>
              </div>
              <RiskBar score={risk.score} color={riskColor(risk.level)} />

              {/* Summary */}
              <p className="text-white text-sm font-medium">{risk.summary}</p>

              {/* Details */}
              <p className="text-gray-300 text-xs leading-relaxed">{risk.details}</p>

              {/* Recommendation */}
              <div className="bg-gray-900/60 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-400 mb-0.5">Recommendation</p>
                <p className="text-white text-xs font-medium">{risk.recommendation}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            disabled={loading}
            className={`flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-40 ${
              risk?.level === 'danger'
                ? 'bg-red-600 hover:bg-red-500 border border-red-500'
                : risk?.level === 'caution'
                ? 'bg-yellow-600 hover:bg-yellow-500 border border-yellow-500'
                : 'bg-green-600 hover:bg-green-500 border border-green-500'
            }`}
          >
            {risk?.level === 'danger' ? '⚠️ Proceed Anyway' : '✓ Proceed'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 pb-3">
          Powered by Claude · GuardDog Security
        </p>
      </div>
    </div>
  );
}

export function useTransactionInterceptor() {
  const { chainId } = useWallet();
  const { risk, loading, error, screenTransaction, reset } = useTransactionScreener();
  const [pendingTx, setPendingTx] = useState<Record<string, string> | null>(null);
  const resolveRef = useRef<((proceed: boolean) => void) | null>(null);
  const originalRequestRef = useRef<Function | null>(null);

  const showModal = useCallback((tx: Record<string, string>): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setPendingTx(tx);

      screenTransaction({
        to: tx.to || '',
        data: tx.data,
        value: tx.value,
        from: tx.from,
        threatScore: undefined,
        isVerifiedThreat: false,
        reportCount: 0,
      });
    });
  }, [screenTransaction]);

  const handleProceed = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setPendingTx(null);
    reset();
  }, [reset]);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setPendingTx(null);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!window.ethereum) return;

    if (originalRequestRef.current) return;
    originalRequestRef.current = window.ethereum.request.bind(window.ethereum);

    window.ethereum.request = async (args: { method: string; params?: any[] }) => {
      if (
        args.method === 'eth_sendTransaction' &&
        Array.isArray(args.params) &&
        args.params[0]
      ) {
        const tx = args.params[0] as Record<string, string>;

        const guardDogAddresses = SUPPORTED_NETWORKS.flatMap(n => [
          CONTRACT_ADDRESSES[n].GuardianVault?.toLowerCase(),
          CONTRACT_ADDRESSES[n].ThreatRegistry?.toLowerCase(),
        ]).filter(Boolean);

        const isGuardDogTx = tx.to && guardDogAddresses.includes(tx.to.toLowerCase());
        if (isGuardDogTx) {
          return originalRequestRef.current!(args);
        }

        const proceed = await showModal(tx);

        if (!proceed) {
          throw { code: 4001, message: 'User rejected transaction via GuardDog screen.' };
        }
      }

      return originalRequestRef.current!(args);
    };

    return () => {
      if (originalRequestRef.current && window.ethereum) {
        window.ethereum.request = originalRequestRef.current as any;
        originalRequestRef.current = null;
      }
    };
  }, [chainId, showModal]);

  return { pendingTx, risk, loading, error, handleProceed, handleCancel };
}

export default function TransactionScreener() {
  const { pendingTx, risk, loading, error, handleProceed, handleCancel } =
    useTransactionInterceptor();

  if (!pendingTx) return null;

  return (
    <ScreenerModal
      tx={pendingTx}
      risk={risk}
      loading={loading}
      error={error}
      onProceed={handleProceed}
      onCancel={handleCancel}
    />
  );
}
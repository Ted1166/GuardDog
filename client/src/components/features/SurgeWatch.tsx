import { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { isValidAddress } from '../../utils/formatters';
import { useAgentHealth, useTriggerScan } from '../../utils/useAgentAPI';

const LS_SURGE_TOKENS = 'guarddog_surge_tokens';

interface SurgeToken {
  address: string;
  name: string;
  chain: string;
  addedAt: number;
  status: 'watching' | 'flagged' | 'clear';
}

function loadTokens(): SurgeToken[] {
  try {
    const raw = localStorage.getItem(LS_SURGE_TOKENS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTokens(tokens: SurgeToken[]) {
  localStorage.setItem(LS_SURGE_TOKENS, JSON.stringify(tokens));
}

const CHAIN_META: Record<string, { emoji: string; label: string }> = {
  BSC:    { emoji: '🟡', label: 'BSC' },
  Base:   { emoji: '🔵', label: 'Base' },
  Solana: { emoji: '🟣', label: 'Solana' },
};

function StatusBadge({ status }: { status: SurgeToken['status'] }) {
  if (status === 'flagged') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-medium">
        🚨 Flagged
      </span>
    );
  }
  if (status === 'clear') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-medium">
        ✅ Clear
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium animate-pulse">
      👁 Watching
    </span>
  );
}

export default function SurgeWatch() {
  const { isConnected } = useWallet();
  const { online: agentOnline } = useAgentHealth(60_000);
  const { triggerScan, scanning } = useTriggerScan();

  const [tokens, setTokens] = useState<SurgeToken[]>(loadTokens);
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [chain, setChain] = useState('BSC');
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address.trim() || !name.trim()) {
      setError('Token address and name are required.');
      return;
    }

    const isSolana = chain === 'Solana';
    if (!isSolana && !isValidAddress(address)) {
      setError('Invalid EVM address format.');
      return;
    }

    if (tokens.some(t => t.address.toLowerCase() === address.toLowerCase())) {
      setError('This token is already being watched.');
      return;
    }

    setAdding(true);

    const newToken: SurgeToken = {
      address: address.trim(),
      name: name.trim(),
      chain,
      addedAt: Date.now(),
      status: 'watching',
    };

    const updated = [newToken, ...tokens];
    setTokens(updated);
    saveTokens(updated);

    if (agentOnline) {
      await triggerScan();
    }

    setAddress('');
    setName('');
    setAddedMsg(`✅ ${name} added to Surge Watch — GuardDog is now monitoring it`);
    setTimeout(() => setAddedMsg(''), 4000);
    setAdding(false);
  };

  const handleRemove = (addr: string) => {
    const updated = tokens.filter(t => t.address !== addr);
    setTokens(updated);
    saveTokens(updated);
  };

  const handleMarkFlagged = (addr: string) => {
    const updated = tokens.map(t =>
      t.address === addr ? { ...t, status: 'flagged' as const } : t
    );
    setTokens(updated);
    saveTokens(updated);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-lg">
              ⚡
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Surge Watch</h2>
              <p className="text-xs text-gray-400">
                GuardDog security layer for Surge token launches
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://surge.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              surge.xyz ↗
            </a>
            <div className="flex items-center gap-1.5 bg-gray-800 px-2.5 py-1 rounded-full">
              <div className={`w-1.5 h-1.5 rounded-full ${agentOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">{agentOnline ? 'Agent live' : 'Agent offline'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">

        {/* What is this */}
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            <span className="text-purple-400 font-semibold">Surge</span> is launching new tokens daily on BSC, Base, and Solana.
            Submit a new launch address below - GuardDog will automatically monitor it for honeypot patterns,
            rug pull indicators, and malicious approvals. Be the first to protect the community. 🐕
          </p>
        </div>

        {/* Add form */}
        {isConnected ? (
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Token name (e.g. SURGE)"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Contract address (0x...)"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors sm:col-span-1"
              />
              <div className="flex gap-2">
                <select
                  value={chain}
                  onChange={e => setChain(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="BSC">🟡 BSC</option>
                  <option value="Base">🔵 Base</option>
                  <option value="Solana">🟣 Solana</option>
                </select>
                <button
                  type="submit"
                  disabled={adding || scanning}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {adding ? '...' : '+ Watch'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            {addedMsg && (
              <p className="text-xs text-green-400">{addedMsg}</p>
            )}
          </form>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">
            Connect your wallet to add tokens to Surge Watch
          </p>
        )}

        {/* Token list */}
        {tokens.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Watched Launches ({tokens.length})
              </p>
              {agentOnline && (
                <button
                  onClick={triggerScan}
                  disabled={scanning}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-40"
                >
                  {scanning ? '⏳ Scanning...' : '↻ Scan Now'}
                </button>
              )}
            </div>

            {tokens.map(token => {
              const chainMeta = CHAIN_META[token.chain] ?? { emoji: '🌐', label: token.chain };
              const short = token.address.length > 20
                ? `${token.address.slice(0, 8)}...${token.address.slice(-6)}`
                : token.address;
              const date = new Date(token.addedAt).toLocaleDateString();

              return (
                <div
                  key={token.address}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    token.status === 'flagged'
                      ? 'border-red-500/30 bg-red-500/5'
                      : token.status === 'clear'
                      ? 'border-green-500/20 bg-green-500/5'
                      : 'border-gray-700 bg-gray-800/40'
                  }`}
                >
                  <span className="text-lg shrink-0">{chainMeta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white">{token.name}</p>
                      <StatusBadge status={token.status} />
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{short} · {chainMeta.label} · {date}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {token.status === 'watching' && (
                      <button
                        onClick={() => handleMarkFlagged(token.address)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 transition-colors"
                        title="Mark as suspicious"
                      >
                        🚨
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(token.address)}
                      className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 transition-colors"
                      title="Remove from watch"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-gray-700 rounded-xl">
            <p className="text-3xl mb-2">⚡</p>
            <p className="text-white text-sm font-medium mb-1">No Surge launches being watched</p>
            <p className="text-gray-400 text-xs">
              Add a new Surge token address above to start monitoring
            </p>
          </div>
        )}

        {/* Surge partnership note */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            🤝 GuardDog is building security infrastructure for the Surge ecosystem.
            Every watched launch strengthens community protection.
          </span>
        </div>
      </div>
    </div>
  );
}
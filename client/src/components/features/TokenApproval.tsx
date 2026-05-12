import { useState } from 'react';
import { ethers } from 'ethers';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
  useApprove,
  useRegisteredTokens,
  formatTokenAmount,
  allowanceStatus,
  type RegisteredToken,
} from '../../hooks/useApprove';
import { formatAddress, isValidAddress } from '../../utils/formatters';

interface TokenApprovalProps {
  walletAddress: string;
}

export default function TokenApproval({ walletAddress }: TokenApprovalProps) {
  const { tokens, loading, error: fetchError, refresh } = useRegisteredTokens(walletAddress);
  const { approve, revoke, register, unregister, isBusy, error: actionError } = useApprove();

  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [localError, setLocalError] = useState('');

  const error = localError || actionError || fetchError;

  const handleAdd = async () => {
    setLocalError('');
    if (!isValidAddress(input)) {
      setLocalError('Invalid token address');
      return;
    }
    if (tokens.some(t => t.meta.address.toLowerCase() === input.toLowerCase())) {
      setLocalError('Token already registered');
      return;
    }

    setAdding(true);
    try {
      await register(input);
      setInput('');
      await refresh();
    } catch {
      // error surfaced via actionError
    } finally {
      setAdding(false);
    }
  };

  const handleApprove = async (token: RegisteredToken) => {
    try {
      await approve(token.meta.address);
      await refresh();
    } catch {}
  };

  const handleRevoke = async (token: RegisteredToken) => {
    try {
      await revoke(token.meta.address);
      await refresh();
    } catch {}
  };

  const handleRemove = async (token: RegisteredToken) => {
    if (!confirm(`Remove ${token.meta.symbol} from monitoring?`)) return;
    try {
      await unregister(token.meta.address);
      await refresh();
    } catch {}
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Token Approvals</h2>
          <p className="text-gray-400 text-sm mt-1">
            Register tokens for monitoring and grant GuardianVault permission to move them
            if a threat is detected.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setLocalError('');
          }}
          placeholder="0x… token contract address"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={adding}
        />
        <Button onClick={handleAdd} loading={adding} disabled={!input}>
          Add Token
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && tokens.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading registered tokens…</div>
      ) : tokens.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center border border-dashed border-gray-800 rounded-lg">
          No tokens registered yet. Add a token address above to start monitoring it.
        </div>
      ) : (
        <ul className="space-y-3">
          {tokens.map((token) => {
            const status = allowanceStatus(token.allowance, token.balance);
            const busy = isBusy(token.meta.address);
            const needsApproval =
              status.tone === 'none' ||
              (status.tone === 'partial' && token.allowance < token.balance);

            return (
              <li
                key={token.meta.address}
                className="bg-gray-800/50 border border-gray-800 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{token.meta.symbol}</span>
                      <span className="text-gray-500 text-xs">{token.meta.name}</span>
                      <span
                        className={
                          'text-xs px-2 py-0.5 rounded ' +
                          (status.tone === 'unlimited'
                            ? 'bg-green-500/20 text-green-300'
                            : status.tone === 'partial'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300')
                        }
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1 font-mono">
                      {formatAddress(token.meta.address, 6)}
                    </div>
                    <div className="text-gray-400 text-sm mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      <span>
                        Balance:{' '}
                        <span className="text-white">
                          {formatTokenAmount(token.balance, token.meta.decimals)}
                        </span>
                      </span>
                      <span>
                        Allowance:{' '}
                        <span className="text-white">
                          {token.allowance >= ethers.MaxUint256 / 2n
                            ? '∞'
                            : formatTokenAmount(token.allowance, token.meta.decimals)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {needsApproval ? (
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(token)}
                        loading={busy}
                      >
                        Approve
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => handleRevoke(token)}
                        loading={busy}
                      >
                        Revoke
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => handleRemove(token)}
                      disabled={busy}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

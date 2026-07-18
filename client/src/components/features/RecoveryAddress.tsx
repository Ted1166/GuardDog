import { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useRecovery } from '../../hooks/useRecovery';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { isValidAddress, formatAddress, formatDateTime } from '../../utils/formatters';

export default function RecoveryAddress() {
  const { address } = useWallet();
  const {
    recovery,
    pending,
    eta,
    loading,
    submitting,
    error,
    set,
    finalize,
    cancel,
  } = useRecovery(address);

  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');

  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const timelockPassed = pending !== null && nowSec >= eta;

  const handleSet = async () => {
    const trimmed = input.trim();
    if (!isValidAddress(trimmed)) {
      setInputError('Enter a valid address');
      return;
    }
    if (address && trimmed.toLowerCase() === address.toLowerCase()) {
      setInputError('Recovery address cannot be this wallet itself');
      return;
    }

    setInputError('');
    try {
      await set(trimmed);
      setInput('');
    } catch {
      // error is surfaced via the hook's error state
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-white">Recovery Address</h2>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            recovery
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
          }`}
        >
          {loading ? '…' : recovery ? '✓ Set' : 'Not set'}
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4">
        If this wallet's key is ever compromised, the recovery address can pull your
        rescued tokens straight out of the vault — they never return to the
        compromised wallet. Set it now, while your key is still safe.
      </p>

      {recovery && (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Current recovery address:</span>
            <span className="text-white font-mono" title={recovery}>
              {formatAddress(recovery, 6)}
            </span>
          </div>
        </div>
      )}

      {pending && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pending change to:</span>
            <span className="text-white font-mono" title={pending}>
              {formatAddress(pending, 6)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {timelockPassed ? 'Timelock passed — ready to finalize' : 'Effective after:'}
            </span>
            {!timelockPassed && (
              <span className="text-white font-medium">{formatDateTime(eta)}</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => finalize().catch(() => {})}
              loading={submitting}
              disabled={!timelockPassed}
              className="flex-1"
            >
              Finalize Change
            </Button>
            <Button
              onClick={() => cancel().catch(() => {})}
              loading={submitting}
              variant="danger"
              className="flex-1"
            >
              Cancel Change
            </Button>
          </div>
          <p className="text-gray-500 text-xs">
            The current recovery address can also cancel this change — that's the
            safeguard against a stolen key redirecting your funds.
          </p>
        </div>
      )}

      {!pending && (
        <div className="space-y-3">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInputError('');
            }}
            placeholder="0x… address of a backup wallet you control"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {inputError && <p className="text-red-400 text-sm">{inputError}</p>}
          <Button
            onClick={handleSet}
            loading={submitting}
            disabled={!input.trim()}
            className="w-full"
          >
            {recovery ? 'Request Recovery Change (48h timelock)' : '🔑 Set Recovery Address'}
          </Button>
          {recovery && (
            <p className="text-gray-500 text-xs">
              Changing an existing recovery address takes effect after a 48-hour
              timelock. The first set is instant.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mt-3">{error}</p>
      )}
    </Card>
  );
}

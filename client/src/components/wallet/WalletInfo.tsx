import { useWallet } from '../../hooks/useWallet';
import { formatAddress, formatBalance, copyToClipboard } from '../../utils/formatters';
import { useState } from 'react';

export default function WalletInfo() {
  const { address, balance, chainId } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!address) return null;

  return (
    <div className="space-y-4">
      {/* Address */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-2">Wallet Address</div>
        <div className="flex items-center justify-between">
          <code className="text-white font-mono text-sm">
            {formatAddress(address, 8)}
          </code>
          <button
            onClick={handleCopy}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      {/* Balance */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="text-sm text-gray-400 mb-2">Balance</div>
        <div className="flex items-center justify-between">
          <div className="text-white font-semibold text-lg">
            {formatBalance(balance)} BNB
          </div>
          <div className="text-gray-400 text-sm">
            Chain ID: {chainId}
          </div>
        </div>
      </div>

      {/* Network Badge */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-400">Connected to BSC Testnet</span>
      </div>
    </div>
  );
}
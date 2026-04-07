import { useWallet } from '../../hooks/useWallet';
import Button from '../ui/Button';
import { SUPPORTED_NETWORKS, NETWORKS, type NetworkKey } from '../../config/contracts';

export default function ConnectWallet() {
  const { isConnected, loading, connect, isCorrectNetwork, switchNetwork } = useWallet();

  if (isConnected && !isCorrectNetwork) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
          <p className="text-yellow-400 font-medium mb-2">⚠️ Wrong Network</p>
          <p className="text-gray-300 text-sm">
            Please switch to a supported network to continue
          </p>
        </div>
        <div className="space-y-2">
          {SUPPORTED_NETWORKS.map((key) => (
            <Button key={key} onClick={() => switchNetwork(key as NetworkKey)} className="w-full">
              Switch to {NETWORKS[key].chainName}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (isConnected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={connect}
        loading={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        {loading ? 'Connecting...' : '🔗 Connect Wallet'}
      </Button>

      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">Supported wallets:</p>
        <div className="flex justify-center gap-4 text-2xl">
          <span title="MetaMask">🦊</span>
          <span title="Trust Wallet">💙</span>
          <span title="WalletConnect">🔗</span>
        </div>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <p className="text-gray-400 text-xs">
          💡 By connecting your wallet, you agree to GuardDog's terms of service.
          Your wallet will be used to enable protection features.
        </p>
      </div>
    </div>
  );
}
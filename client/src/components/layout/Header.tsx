import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';
import { formatAddress } from '../../utils/formatters';
import { NETWORKS, SUPPORTED_NETWORKS, type NetworkKey } from '../../config/contracts';

const NETWORK_META: Record<string, { emoji: string; short: string }> = {
  bscTestnet:  { emoji: '🟡', short: 'BSC Testnet'  },
  baseSepolia: { emoji: '🔵', short: 'Base Sepolia' },
  sepolia:     { emoji: '⚪', short: 'ETH Sepolia'  },
};

function NetworkModal({
  onSwitch,
  onClose,
  currentNetwork,
}: {
  onSwitch: (key: NetworkKey) => void;
  onClose: () => void;
  currentNetwork: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-1">Select Network</h3>
        <p className="text-gray-400 text-sm mb-5">
          GuardDog is deployed on these chains. Pick one to continue.
        </p>

        <div className="space-y-2">
          {SUPPORTED_NETWORKS.map((key) => {
            const meta = NETWORK_META[key] ?? { emoji: '🌐', short: key };
            const isActive = key === currentNetwork;
            return (
              <button
                key={key}
                onClick={() => onSwitch(key as NetworkKey)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  isActive
                    ? 'bg-blue-600/20 border-blue-500/50 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                }`}
              >
                <span className="text-xl">{meta.emoji}</span>
                <div>
                  <p className="font-medium text-sm">{NETWORKS[key].chainName}</p>
                  <p className="text-xs text-gray-500">
                    Chain ID: {parseInt(NETWORKS[key].chainId, 16)}
                  </p>
                </div>
                {isActive && (
                  <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function WalletDropdown({
  address,
  currentNetwork,
  onDisconnect,
  onSwitchNetwork,
  onClose,
}: {
  address: string;
  currentNetwork: string;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const meta = NETWORK_META[currentNetwork] ?? { emoji: '🌐', short: currentNetwork };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50"
    >
      {/* Wallet info */}
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-xs text-gray-500 mb-1">Connected as</p>
        <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
      </div>

      {/* Network row */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          <span className="text-sm text-gray-300">{meta.short}</span>
        </div>
        <button
          onClick={() => { onSwitchNetwork(); onClose(); }}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Switch
        </button>
      </div>

      {/* Actions */}
      <div className="p-2">
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span>⚙️</span> Settings
        </Link>
        <button
          onClick={() => { onDisconnect(); onClose(); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <span>🔌</span> Disconnect
        </button>
      </div>
    </div>
  );
}

export default function Header() {
  const location = useLocation();
  const {
    address,
    isConnected,
    connect,
    disconnect,
    switchNetwork,
    currentNetwork,
    isCorrectNetwork,
    showNetworkModal,
    setShowNetworkModal,
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/',           label: 'Dashboard',  icon: '📊' },
    { path: '/protection', label: 'Protection', icon: '🛡️' },
    { path: '/threats',    label: 'Threats',    icon: '🚨' },
    { path: '/settings',   label: 'Settings',   icon: '⚙️' },
  ];

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-lg bg-gray-900/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="GuardDog"
                className="w-12 h-12 md:w-14 md:h-14 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]"
              />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white font-display">GuardDog</h1>
                <p className="text-xs text-gray-400">AI Security</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive(link.path)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Wallet Area */}
            <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="relative flex items-center gap-2">

                  {/* Wrong network warning */}
                  {!isCorrectNetwork && (
                    <button
                      onClick={() => setShowNetworkModal(true)}
                      className="hidden sm:flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors"
                    >
                      ⚠️ Wrong Network
                    </button>
                  )}

                  {/* Network badge (correct network) */}
                  {isCorrectNetwork && (
                    <button
                      onClick={() => setShowNetworkModal(true)}
                      className="hidden sm:flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-gray-300">
                        {NETWORK_META[currentNetwork]?.short ?? NETWORKS[currentNetwork].chainName}
                      </span>
                    </button>
                  )}

                  {/* Address button → opens dropdown */}
                  <button
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="text-white font-mono text-sm">{formatAddress(address)}</span>
                    <svg
                      className={`w-3 h-3 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {dropdownOpen && (
                    <WalletDropdown
                      address={address}
                      currentNetwork={currentNetwork}
                      onDisconnect={disconnect}
                      onSwitchNetwork={() => setShowNetworkModal(true)}
                      onClose={() => setDropdownOpen(false)}
                    />
                  )}
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg hover:shadow-blue-500/20"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-800 py-2">
            <nav className="flex justify-around">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    isActive(link.path) ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="text-xs font-medium">{link.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Network Switcher Modal */}
      {showNetworkModal && (
        <NetworkModal
          currentNetwork={currentNetwork}
          onSwitch={(key) => switchNetwork(key)}
          onClose={() => setShowNetworkModal(false)}
        />
      )}
    </>
  );
}
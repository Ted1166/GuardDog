import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';
import { formatAddress } from '../../utils/formatters';

export default function Header() {
  const location = useLocation();
  const { address, isConnected, connect } = useWallet();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/protection', label: 'Protection', icon: '🛡️' },
    { path: '/threats', label: 'Threats', icon: '🚨' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 backdrop-blur-lg bg-gray-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="text-3xl group-hover:scale-110 transition-transform">
              🐕‍🦺
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GuardDog</h1>
              <p className="text-xs text-gray-400">AI Security</p>
            </div>
          </Link>

          {/* Navigation */}
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

          {/* Wallet Connection */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-3">
                {/* Network Indicator */}
                <div className="hidden sm:flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-300">BSC Testnet</span>
                </div>

                {/* Address */}
                <Link
                  to="/settings"
                  className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  <span className="text-white font-mono text-sm">
                    {formatAddress(address)}
                  </span>
                </Link>
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
                  isActive(link.path)
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-white'
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
  );
}
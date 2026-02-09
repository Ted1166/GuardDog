import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', icon: '📊', label: 'Dashboard' },
    { path: '/protection', icon: '🛡️', label: 'Protection' },
    { path: '/threats', icon: '🚨', label: 'Threats' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-gray-900 border-r border-gray-800 z-50 lg:z-0 overflow-y-auto">
        <div className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Stats Section */}
        <div className="p-4 mt-6 border-t border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Protected Value</div>
              <div className="text-lg font-bold text-white">$0.00</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Threats Blocked</div>
              <div className="text-lg font-bold text-green-400">0</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Protection Time</div>
              <div className="text-lg font-bold text-blue-400">0d</div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="p-4 mt-6 border-t border-gray-800">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="text-white font-semibold mb-1">Need Help?</h3>
            <p className="text-sm text-gray-400 mb-3">
              Check out our docs or join Discord
            </p>
            <a
              href="https://docs.guarddog.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              View Docs →
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
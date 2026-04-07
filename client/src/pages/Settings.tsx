import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import ConnectWallet from '../components/wallet/ConnectWallet';
import WalletInfo from '../components/wallet/WalletInfo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getExplorerUrl, CONTRACT_ADDRESSES, NETWORKS, SUPPORTED_NETWORKS, type NetworkKey } from '../config/contracts';

// localStorage keys
const LS_NOTIFICATIONS = 'guarddog_notifications';
const LS_TG_TOKEN      = 'guarddog_telegram_token';
const LS_TG_CHAT       = 'guarddog_telegram_chat_id';

const DEFAULT_NOTIFICATIONS = {
  threatDetected: true,
  tokensProtected: true,
  newReports: false,
};

function loadNotifications() {
  try {
    const raw = localStorage.getItem(LS_NOTIFICATIONS);
    return raw ? { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(raw) } : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export default function Settings() {
  const { isConnected, disconnect, currentNetwork, chainId, switchNetwork } = useWallet();

  // Initialise from localStorage so toggles survive refresh
  const [notifications, setNotifications] = useState(loadNotifications);

  // Load saved Telegram credentials on mount
  const [telegram, setTelegram] = useState({
    botToken: '',
    chatId: '',
    saved: false,
    testing: false,
    testResult: null as 'success' | 'error' | null,
  });

  const [telegramConnected, setTelegramConnected] = useState(false);

  useEffect(() => {
    const token  = localStorage.getItem(LS_TG_TOKEN) || '';
    const chatId = localStorage.getItem(LS_TG_CHAT)  || '';
    if (token && chatId) {
      setTelegram((prev) => ({ ...prev, botToken: token, chatId }));
      setTelegramConnected(true);
    }
  }, []);

  // Persist notification toggles whenever they change
  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev: typeof DEFAULT_NOTIFICATIONS) => {
      const next = { ...prev, [key]: !prev[key as keyof typeof prev] };
      localStorage.setItem(LS_NOTIFICATIONS, JSON.stringify(next));
      return next;
    });
  };

  const handleTelegramSave = () => {
    if (!telegram.botToken || !telegram.chatId) return;
    localStorage.setItem(LS_TG_TOKEN, telegram.botToken);
    localStorage.setItem(LS_TG_CHAT,  telegram.chatId);
    setTelegramConnected(true);
    setTelegram((prev) => ({ ...prev, saved: true }));
    setTimeout(() => setTelegram((prev) => ({ ...prev, saved: false })), 2000);
  };

  const handleTelegramTest = async () => {
    if (!telegram.botToken || !telegram.chatId) return;
    setTelegram((prev) => ({ ...prev, testing: true, testResult: null }));
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${telegram.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegram.chatId,
            text: '🐕 GuardDog alert test successful! You will now receive wallet security alerts here.',
            parse_mode: 'Markdown',
          }),
        }
      );
      const data = await res.json();
      setTelegram((prev) => ({
        ...prev,
        testing: false,
        testResult: data.ok ? 'success' : 'error',
      }));
    } catch {
      setTelegram((prev) => ({ ...prev, testing: false, testResult: 'error' }));
    }
  };

  const handleClearAll = () => {
    localStorage.removeItem(LS_TG_TOKEN);
    localStorage.removeItem(LS_TG_CHAT);
    localStorage.removeItem(LS_NOTIFICATIONS);
    setTelegram({ botToken: '', chatId: '', saved: false, testing: false, testResult: null });
    setTelegramConnected(false);
    setNotifications(DEFAULT_NOTIFICATIONS);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mb-6">Connect your wallet to continue</p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your GuardDog preferences</p>
        </div>

        {/* Wallet Info */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Connected Wallet</h2>
          <WalletInfo />
          <Button onClick={disconnect} variant="danger" className="w-full mt-4">
            Disconnect Wallet
          </Button>
        </Card>

        {/* Notifications */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Notifications</h2>
          <p className="text-gray-400 text-sm mb-4">Configure when you want to be notified</p>
          <div className="space-y-4">
            {[
              { key: 'threatDetected', label: 'Threat Detected',  desc: 'When AI detects a threat to your wallet' },
              { key: 'tokensProtected', label: 'Tokens Protected', desc: 'When tokens are moved to safe custody' },
              { key: 'newReports',      label: 'New Reports',      desc: 'When new threats are reported by the community' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">{label}</h3>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
                <button
                  onClick={() => handleNotificationToggle(key as keyof typeof notifications)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications[key as keyof typeof notifications] ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications[key as keyof typeof notifications] ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Telegram Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold text-white">Telegram Alerts</h2>
            {/* ✅ Connected indicator */}
            {telegramConnected && (
              <span className="flex items-center gap-1.5 text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                Connected
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Receive real-time threat alerts directly in Telegram. You'll need a bot token from{' '}
            <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300">@BotFather</a> and your chat ID from{' '}
            <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300">@userinfobot</a>.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bot Token</label>
              <input
                type="password"
                value={telegram.botToken}
                onChange={(e) => setTelegram((prev) => ({ ...prev, botToken: e.target.value }))}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Chat ID</label>
              <input
                type="text"
                value={telegram.chatId}
                onChange={(e) => setTelegram((prev) => ({ ...prev, chatId: e.target.value }))}
                placeholder="e.g. 5751932746"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-gray-300">
              <p className="font-medium text-blue-400 mb-2">📋 Quick Setup</p>
              <ol className="space-y-1 list-decimal list-inside text-gray-400">
                <li>Open Telegram and search for <span className="text-white">@BotFather</span></li>
                <li>Send <code className="text-green-400">/newbot</code> and follow the prompts</li>
                <li>Copy your bot token and paste it above</li>
                <li>Search for <span className="text-white">@userinfobot</span> and send any message</li>
                <li>Copy your Chat ID and paste it above</li>
                <li>Click <span className="text-white">Send Test Alert</span> to verify</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleTelegramTest}
                variant="secondary"
                className="flex-1"
                disabled={!telegram.botToken || !telegram.chatId || telegram.testing}
              >
                {telegram.testing ? 'Sending...' : '📱 Send Test Alert'}
              </Button>
              <Button
                onClick={handleTelegramSave}
                className="flex-1"
                disabled={!telegram.botToken || !telegram.chatId}
              >
                {telegram.saved ? '✅ Saved!' : 'Save'}
              </Button>
            </div>

            {telegram.testResult === 'success' && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
                ✅ Test message sent! Check your Telegram.
              </div>
            )}
            {telegram.testResult === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                ❌ Failed to send. Check your bot token and chat ID are correct.
              </div>
            )}
          </div>
        </Card>

        {/* Network */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Network</h2>
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Current Network:</span>
              <span className="text-white font-medium">{NETWORKS[currentNetwork].chainName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Chain ID:</span>
              <span className="text-white font-medium">{chainId || parseInt(NETWORKS[currentNetwork].chainId).toString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400 mb-2">Switch Network</p>
            {SUPPORTED_NETWORKS.map((key) => (
              <button
                key={key}
                onClick={() => switchNetwork(key as NetworkKey)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                  currentNetwork === key
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
                }`}
              >
                <span>{NETWORKS[key].chainName}</span>
                {currentNetwork === key && <span className="text-xs">✓ Active</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Contract Addresses */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Contract Addresses</h2>
          <div className="space-y-3">
            {(Object.entries(CONTRACT_ADDRESSES[currentNetwork]) as [string, string][]).map(([label, address]) => (
              <div key={label} className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">{label}</div>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-white text-sm break-all">{address || 'Not deployed'}</code>
                  {address && (
                    <a
                      href={getExplorerUrl(currentNetwork, 'address', address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm shrink-0"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* About */}
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">About GuardDog</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Version:</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-white">{NETWORKS[currentNetwork].chainName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">License:</span>
              <span className="text-white">MIT</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700 flex gap-4 text-sm">
            <a href="https://github.com/Ted1166/GuardDog" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300">GitHub →</a>
            <a href="https://guard-dog.vercel.app" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300">Live App →</a>
            <a href="https://x.com/guarddog_ai" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300">Twitter →</a>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-500/30">
          <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
          <div className="bg-red-500/10 rounded-lg p-4">
            <p className="text-gray-300 text-sm mb-4">
              Clear all local data and reset GuardDog settings. This action cannot be undone.
            </p>
            <Button variant="danger" onClick={handleClearAll}>
              Clear All Data
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
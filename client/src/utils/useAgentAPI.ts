import { useState, useEffect, useCallback } from 'react';

const AGENT_URL = import.meta.env.VITE_AGENT_URL || '';


export interface AgentStatus {
  isRunning: boolean;
  uptime: string;
  monitoredWallets: string[];
  network: string;
  monitorInterval: number;
  threatThreshold: number;
}

export interface AgentHealth {
  online: boolean;
  status: AgentStatus | null;
  lastChecked: number | null;
  error: string | null;
}


async function agentFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (!AGENT_URL) {
    return { success: false, error: 'VITE_AGENT_URL not configured' };
  }

  try {
    const res = await fetch(`${AGENT_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error || `HTTP ${res.status}` };
    }

    return { success: true, data: json.data ?? json };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}


export function useAgentHealth(pollInterval = 30_000): AgentHealth {
  const [health, setHealth] = useState<AgentHealth>({
    online: false,
    status: null,
    lastChecked: null,
    error: null,
  });

  const check = useCallback(async () => {
    const ping = await agentFetch<{ status: string }>('/health');

    if (!ping.success) {
      setHealth(prev => ({ ...prev, online: false, error: ping.error ?? null, lastChecked: Date.now() }));
      return;
    }

    const statusRes = await agentFetch<AgentStatus>('/api/status');

    setHealth({
      online: true,
      status: statusRes.data ?? null,
      lastChecked: Date.now(),
      error: statusRes.error ?? null,
    });
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, pollInterval);
    return () => clearInterval(id);
  }, [check, pollInterval]);

  return health;
}


export function useAgentWallets() {
  const [wallets, setWallets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    const res = await agentFetch<{ wallets: string[] }>('/api/wallets');
    if (res.success && res.data) {
      setWallets(res.data.wallets);
    } else {
      setError(res.error ?? 'Failed to fetch wallets');
    }
    setLoading(false);
  }, []);

  const addWallet = useCallback(async (address: string, tokens: string[] = []) => {
    setLoading(true);
    const res = await agentFetch('/api/wallets', {
      method: 'POST',
      body: JSON.stringify({ address, tokens }),
    });
    if (res.success) {
      await fetchWallets();
    } else {
      setError(res.error ?? 'Failed to add wallet');
    }
    setLoading(false);
    return res.success;
  }, [fetchWallets]);

  const removeWallet = useCallback(async (address: string) => {
    setLoading(true);
    const res = await agentFetch(`/api/wallets/${address}`, { method: 'DELETE' });
    if (res.success) {
      setWallets(prev => prev.filter(w => w !== address.toLowerCase()));
    } else {
      setError(res.error ?? 'Failed to remove wallet');
    }
    setLoading(false);
    return res.success;
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return { wallets, loading, error, addWallet, removeWallet, refetch: fetchWallets };
}


export function useTriggerScan() {
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    const res = await agentFetch('/api/scan', { method: 'POST' });
    if (res.success) {
      setLastScanned(Date.now());
    } else {
      setError(res.error ?? 'Scan failed');
    }
    setScanning(false);
    return res.success;
  }, []);

  return { triggerScan, scanning, lastScanned, error };
}


export const isAgentConfigured = (): boolean => Boolean(AGENT_URL);
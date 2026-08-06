import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect as useAppKitDisconnect,
} from '@reown/appkit/react';
import {
  getNetworkConfig,
  getNetworkFromChainId,
  DEFAULT_NETWORK,
  SUPPORTED_NETWORKS,
  type NetworkKey,
} from '../config/contracts';

interface InjectedEthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

function getInjectedProvider(): InjectedEthereumProvider | undefined {
  return (window as unknown as { ethereum?: InjectedEthereumProvider }).ethereum;
}

const CONNECTED_KEY = 'guarddog_wallet_connected';

export function useWallet() {
  const { open: openWalletConnectModal } = useAppKit();
  const { address: wcAddress, isConnected: wcIsConnected } = useAppKitAccount();
  const { walletProvider: wcProvider } = useAppKitProvider<ethers.Eip1193Provider>('eip155');
  const { disconnect: disconnectWalletConnect } = useAppKitDisconnect();
  const [connectionSource, setConnectionSource] = useState<'injected' | 'walletconnect' | null>(null);

  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<string>('');
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  const disconnectCleanup = useCallback(() => {
    localStorage.removeItem(CONNECTED_KEY);
    setAddress('');
    setIsConnected(false);
    setSigner(null);
    setProvider(null);
    setChainId('');
    setBalance(0n);
    setShowNetworkModal(false);
    setConnectionSource(null);
  }, []);

  useEffect(() => {
    const init = async () => {
      const wasConnected = localStorage.getItem(CONNECTED_KEY) === 'true';
      const ethereum = getInjectedProvider();

      if (!wasConnected || !ethereum) {
        setLoading(false);
        return;
      }

      try {
        const web3Provider = new ethers.BrowserProvider(ethereum);
        const accounts = await ethereum.request({ method: 'eth_accounts' });

        if (accounts.length > 0) {
          const s = await web3Provider.getSigner();
          const addr = await s.getAddress();
          const network = await web3Provider.getNetwork();
          const bal = await web3Provider.getBalance(addr);

          setProvider(web3Provider);
          setSigner(s);
          setAddress(addr);
          setChainId(network.chainId.toString());
          setBalance(bal);
          setIsConnected(true);
          setConnectionSource('injected');
        } else {
          localStorage.removeItem(CONNECTED_KEY);
        }
      } catch (error) {
        console.error('Failed to restore wallet session:', error);
        localStorage.removeItem(CONNECTED_KEY);
      }

      setLoading(false);
    };

    init();
  }, []);

  // WalletConnect path: fires when AppKit reports a connected session, either
  // right after the user approves in their wallet app, or automatically on
  // page load if AppKit restored a previous session. Skipped entirely if an
  // injected-wallet session is already driving state.
  useEffect(() => {
    if (connectionSource === 'injected') return;

    if (!wcIsConnected || !wcProvider || !wcAddress) {
      if (connectionSource === 'walletconnect') {
        // AppKit reports disconnected — clear our mirrored state too.
        disconnectCleanup();
      }
      return;
    }

    const syncFromWalletConnect = async () => {
      try {
        setLoading(true);
        const web3Provider = new ethers.BrowserProvider(wcProvider);
        const s = await web3Provider.getSigner();
        const addr = await s.getAddress();
        const network = await web3Provider.getNetwork();
        const bal = await web3Provider.getBalance(addr);

        setProvider(web3Provider);
        setSigner(s);
        setAddress(addr);
        setChainId(network.chainId.toString());
        setBalance(bal);
        setIsConnected(true);
        setConnectionSource('walletconnect');
        localStorage.setItem(CONNECTED_KEY, 'true');

        const detectedNetwork = getNetworkFromChainId(network.chainId.toString());
        if (!SUPPORTED_NETWORKS.includes(detectedNetwork)) {
          setShowNetworkModal(true);
        }
      } catch (error) {
        console.error('Failed to sync WalletConnect session:', error);
      } finally {
        setLoading(false);
      }
    };

    syncFromWalletConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wcIsConnected, wcProvider, wcAddress, connectionSource]);

  useEffect(() => {
    const ethereum = getInjectedProvider();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected from MetaMask side
        disconnectCleanup();
      } else {
        setAddress(accounts[0]);
        window.location.reload();
      }
    };

    const handleChainChanged = () => window.location.reload();

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!provider || !address) return;

    const updateBalance = async () => {
      try {
        const bal = await provider.getBalance(address);
        setBalance(bal);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };

    updateBalance();
    const interval = setInterval(updateBalance, 10000);
    return () => clearInterval(interval);
  }, [provider, address]);

  const connect = useCallback(async () => {
    const ethereum = getInjectedProvider();

    if (!ethereum) {
      // No injected wallet (typical for mobile Safari/Chrome) — open the
      // WalletConnect modal instead. The useEffect above picks up the
      // resulting session and populates wallet state once approved.
      try {
        await openWalletConnectModal();
      } catch (error) {
        console.error('Failed to open WalletConnect modal:', error);
      }
      return;
    }

    try {
      setLoading(true);

      await ethereum.request({ method: 'eth_requestAccounts' });

      const web3Provider = new ethers.BrowserProvider(ethereum);
      const s = await web3Provider.getSigner();
      const addr = await s.getAddress();
      const network = await web3Provider.getNetwork();
      const bal = await web3Provider.getBalance(addr);

      setProvider(web3Provider);
      setSigner(s);
      setAddress(addr);
      setChainId(network.chainId.toString());
      setBalance(bal);
      setIsConnected(true);
      setConnectionSource('injected');

      localStorage.setItem(CONNECTED_KEY, 'true');

      const detectedNetwork = getNetworkFromChainId(network.chainId.toString());
      if (!SUPPORTED_NETWORKS.includes(detectedNetwork)) {
        setShowNetworkModal(true);
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        alert('Connection cancelled. Please connect your wallet to continue.');
      }
    } finally {
      setLoading(false);
    }
  }, [openWalletConnectModal]);

  const disconnect = useCallback(() => {
    if (connectionSource === 'walletconnect') {
      disconnectWalletConnect().catch((error) =>
        console.error('Failed to disconnect WalletConnect session:', error)
      );
    }
    disconnectCleanup();
  }, [connectionSource, disconnectWalletConnect, disconnectCleanup]);

  const switchNetwork = useCallback(async (targetKey: NetworkKey = DEFAULT_NETWORK) => {
    const ethereum = getInjectedProvider();
    if (!ethereum) return;

    const targetNetwork = getNetworkConfig(targetKey);

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetwork.chainId }],
      });
      setShowNetworkModal(false);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetNetwork.chainId,
              chainName: targetNetwork.chainName,
              nativeCurrency: targetNetwork.nativeCurrency,
              rpcUrls: targetNetwork.rpcUrls,
              blockExplorerUrls: targetNetwork.blockExplorerUrls,
            }],
          });
          setShowNetworkModal(false);
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      } else {
        console.error('Failed to switch network:', error);
      }
    }
  }, []);

  const isCorrectNetwork = useCallback(() => {
    if (!chainId) return false;
    return SUPPORTED_NETWORKS.includes(getNetworkFromChainId(chainId));
  }, [chainId]);

  const currentNetwork = chainId ? getNetworkFromChainId(chainId) : DEFAULT_NETWORK;

  return {
    address,
    isConnected,
    provider,
    signer,
    chainId,
    balance,
    loading,
    connect,
    disconnect,
    switchNetwork,
    isCorrectNetwork: isCorrectNetwork(),
    currentNetwork,
    showNetworkModal,
    setShowNetworkModal,
  };
}
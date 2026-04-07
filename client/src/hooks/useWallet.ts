import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  getNetworkConfig,
  getNetworkFromChainId,
  DEFAULT_NETWORK,
  SUPPORTED_NETWORKS,
  type NetworkKey,
} from '../config/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONNECTED_KEY = 'guarddog_wallet_connected';

export function useWallet() {
  const [address, setAddress]       = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider]     = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner]         = useState<ethers.Signer | null>(null);
  const [chainId, setChainId]       = useState<string>('');
  const [balance, setBalance]       = useState<bigint>(0n);
  const [loading, setLoading]       = useState(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const wasConnected = localStorage.getItem(CONNECTED_KEY) === 'true';

      if (!wasConnected || typeof window.ethereum === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });

        if (accounts.length > 0) {
          const s       = await web3Provider.getSigner();
          const addr    = await s.getAddress();
          const network = await web3Provider.getNetwork();
          const bal     = await web3Provider.getBalance(addr);

          setProvider(web3Provider);
          setSigner(s);
          setAddress(addr);
          setChainId(network.chainId.toString());
          setBalance(bal);
          setIsConnected(true);
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

  useEffect(() => {
    if (!window.ethereum) return;

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

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
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

  const disconnectCleanup = useCallback(() => {
    localStorage.removeItem(CONNECTED_KEY);
    setAddress('');
    setIsConnected(false);
    setSigner(null);
    setProvider(null);
    setChainId('');
    setBalance(0n);
    setShowNetworkModal(false);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      setLoading(true);

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const s       = await web3Provider.getSigner();
      const addr    = await s.getAddress();
      const network = await web3Provider.getNetwork();
      const bal     = await web3Provider.getBalance(addr);

      setProvider(web3Provider);
      setSigner(s);
      setAddress(addr);
      setChainId(network.chainId.toString());
      setBalance(bal);
      setIsConnected(true);

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
  }, []);

  const disconnect = useCallback(() => {
    disconnectCleanup();

  }, [disconnectCleanup]);

  const switchNetwork = useCallback(async (targetKey: NetworkKey = DEFAULT_NETWORK) => {
    if (!window.ethereum) return;

    const targetNetwork = getNetworkConfig(targetKey);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetwork.chainId }],
      });
      setShowNetworkModal(false);
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId:         targetNetwork.chainId,
              chainName:       targetNetwork.chainName,
              nativeCurrency:  targetNetwork.nativeCurrency,
              rpcUrls:         targetNetwork.rpcUrls,
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
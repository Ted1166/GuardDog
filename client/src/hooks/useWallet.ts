import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<string>('');
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);

        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            const signer = await web3Provider.getSigner();
            const address = await signer.getAddress();
            const network = await web3Provider.getNetwork();
            const balance = await web3Provider.getBalance(address);

            setAddress(address);
            setSigner(signer);
            setChainId(network.chainId.toString());
            setBalance(balance);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Failed to initialize wallet:', error);
        }
      }
      setLoading(false);
    };

    init();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);

        window.location.reload();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

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

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      setLoading(true);

       await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await web3Provider.getSigner();
      const address = await signer.getAddress();
      const network = await web3Provider.getNetwork();
      const balance = await web3Provider.getBalance(address);

      setProvider(web3Provider);
      setSigner(signer);
      setAddress(address);
      setChainId(network.chainId.toString());
      setBalance(balance);
      setIsConnected(true);

      const targetNetwork = getNetworkConfig(DEFAULT_NETWORK);
      if (network.chainId.toString() !== parseInt(targetNetwork.chainId).toString()) {
        await switchNetwork();
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        alert('Please connect your wallet to continue');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress('');
    setIsConnected(false);
    setSigner(null);
    setChainId('');
    setBalance(0n);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;

    const targetNetwork = getNetworkConfig(DEFAULT_NETWORK);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetwork.chainId }],
      });
    } catch (error: any) {

        if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetNetwork.chainId,
                chainName: targetNetwork.chainName,
                nativeCurrency: targetNetwork.nativeCurrency,
                rpcUrls: targetNetwork.rpcUrls,
                blockExplorerUrls: targetNetwork.blockExplorerUrls,
              },
            ],
          });
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
    const targetNetwork = getNetworkConfig(DEFAULT_NETWORK);
    return chainId === parseInt(targetNetwork.chainId).toString();
  }, [chainId]);

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
  };
}
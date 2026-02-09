import { ethers } from 'ethers';

export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (!ethers.isAddress(address)) return address;
  
  return `${address.substring(0, chars + 2)}...${address.substring(
    address.length - chars
  )}`;
}

export function formatBalance(
  balance: bigint | string,
  decimals = 18,
  displayDecimals = 4
): string {
  try {
    const formatted = ethers.formatUnits(balance, decimals);
    const num = parseFloat(formatted);
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayDecimals,
    });
  } catch {
    return '0';
  }
}

export function formatUSD(value: number, decimals = 2): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '< $0.01';
  
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompact(value: number): string {
  if (value < 1000) return value.toString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}K`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return `${(value / 1_000_000_000).toFixed(1)}B`;
}

export function formatRelativeTime(timestamp: number | bigint): string {
  const now = Date.now();
  const time = typeof timestamp === 'bigint' ? Number(timestamp) * 1000 : timestamp * 1000;
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export function formatDate(timestamp: number | bigint): string {
  const time = typeof timestamp === 'bigint' ? Number(timestamp) * 1000 : timestamp * 1000;
  return new Date(time).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp: number | bigint): string {
  const time = typeof timestamp === 'bigint' ? Number(timestamp) * 1000 : timestamp * 1000;
  return new Date(time).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number | bigint): string {
  const s = typeof seconds === 'bigint' ? Number(seconds) : seconds;
  
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '< 1m';
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function getThreatColor(level: number): string {
  if (level >= 90) return 'red';
  if (level >= 75) return 'orange';
  if (level >= 50) return 'yellow';
  if (level >= 25) return 'blue';
  return 'green';
}

export function getThreatBadge(level: number): {
  color: string;
  label: string;
  className: string;
} {
  if (level >= 90)
    return {
      color: 'red',
      label: 'Critical',
      className: 'bg-red-500/20 text-red-400 border-red-500/50',
    };
  if (level >= 75)
    return {
      color: 'orange',
      label: 'High',
      className: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    };
  if (level >= 50)
    return {
      color: 'yellow',
      label: 'Medium',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    };
  if (level >= 25)
    return {
      color: 'blue',
      label: 'Low',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    };
  return {
    color: 'green',
    label: 'Safe',
    className: 'bg-green-500/20 text-green-400 border-green-500/50',
  };
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  
  if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
    return 'Transaction was rejected';
  }
  
  if (error?.code === -32000 || error?.message?.includes('insufficient funds')) {
    return 'Insufficient BNB for gas fees';
  }
  
  if (error?.code === 'NETWORK_ERROR') {
    return 'Network connection error. Please try again';
  }
  
  if (error?.reason) {
    return error.reason;
  }
  
  return 'An error occurred. Please try again';
}
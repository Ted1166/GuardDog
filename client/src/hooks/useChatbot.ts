import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import { useProtection } from './useProtection';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useChatbot() {
  const { address, isConnected: walletConnected } = useWallet();
  const { isProtected } = useProtection(address);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm GuardDog AI, your security assistant. I can help you:\n\n• Scan tokens for threats\n• Explain security concepts\n• Check contract safety\n• Answer protection questions\n\nHow can I help you today?",
      timestamp: Date.now(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const context = {
          walletConnected,
          isProtected,
          address: address || 'Not connected',
        };

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1024,
            system: `You are GuardDog AI, a helpful security assistant for Web3 wallet protection. 
            
Current user context:
- Wallet Connected: ${context.walletConnected}
- Protection Enabled: ${context.isProtected}
- Address: ${context.address}

Your role:
- Help users understand Web3 security threats
- Explain how GuardDog protection works
- Scan token addresses for potential scams (when user provides 0x... addresses)
- Provide clear, concise security advice
- Be friendly and approachable

Keep responses under 150 words. Use emojis sparingly.`,
            messages: [
              {
                role: 'user',
                content,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const data = await response.json();
        const aiResponse = data.content[0].text;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Chatbot error:', error);
        
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment, or check out our documentation at docs.guarddog.ai for help! 🐕",
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, fallbackMessage]);
      } finally {
        setLoading(false);
      }
    },
    [walletConnected, isProtected, address]
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: "👋 Hi! I'm GuardDog AI, your security assistant. How can I help you today?",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
  };
}
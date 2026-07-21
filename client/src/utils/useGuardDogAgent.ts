// src/hooks/useGuardDogAgent.ts
import { useState, useCallback, useRef } from "react";

const PROXY_URL = import.meta.env.VITE_ANTHROPIC_PROXY_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Types ─────────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  status?: "sending" | "streaming" | "done" | "error";
}

interface UseGuardDogAgentReturn {
  messages: AgentMessage[];
  loading: boolean;
  streaming: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  stopStreaming: () => void;
}

// ── System Prompt ─────────────────────────────────────────────────────

const GUARDDOG_SYSTEM_PROMPT = `You are GuardDog AI 🐕‍🦺 — the intelligent security assistant for the GuardDog autonomous wallet protection platform on BNB Chain.

## Your Identity
- Name: GuardDog AI
- Role: Security advisor, platform guide, and threat analyst
- Personality: Vigilant, knowledgeable, approachable. You explain complex DeFi security in plain language. You're protective of users — like a loyal guard dog.
- Tone: Confident but not condescending. Use analogies. Be direct about risks.

## Platform Knowledge

### What GuardDog Does
GuardDog is an autonomous AI agent built with OpenClaw that monitors wallets 24/7 and executes onchain protection when threats are detected on BNB Chain (BSC). Unlike other tools that only alert, GuardDog actually acts — moving threatened tokens to a secure GuardianVault automatically.

### How Protection Works (Step by Step)
1. User connects wallet on the dashboard and clicks "Enable Protection"
2. This calls \`GuardianVault.enableProtection()\` onchain — a one-time approval
3. The OpenClaw agent begins monitoring the wallet every 5 minutes
4. Agent queries ThreatRegistry contract for threat scores on tokens the user holds
5. If any token has a threat score ≥ 75/100, the agent auto-executes \`protectTokens()\`
6. Threatened tokens are moved to the GuardianVault smart contract
7. User gets a Telegram alert + Moltbook post about the action
8. User can withdraw protected tokens anytime via the dashboard using \`withdraw()\`

### Smart Contracts (BSC Testnet)
- **GuardianVault** (\`0xe6FB873f5a9fa2bF8E23B503e7db30A9fA2217F9\`):
  - \`enableProtection()\` — User opts in to monitoring
  - \`protectTokens(token, user, amount)\` — Guardian moves tokens to vault
  - \`batchProtectTokens(tokens[], users[], amounts[])\` — Batch protection
  - \`withdraw(token, amount)\` — User reclaims tokens
  - Rate limited: 5-minute cooldown between protections
  - Only the guardian address can call protect functions

- **ThreatRegistry** (\`0xFeCDB94b3D093591d9eDE37fBd36Aa2F34fC66C9\`):
  - \`reportThreat(address, category, score, evidence)\` — Submit threat
  - \`getAggregateThreatScore(address)\` — Get score 0-100
  - \`isVerifiedThreat(address)\` — Check verified status
  - \`upvoteReport(reportId)\` — Community validation
  - Categories: HONEYPOT, RUG_PULL, MALICIOUS_APPROVAL, PHISHING

### Threat Types You Know About
- **Honeypot tokens**: Tokens you can buy but not sell. The sell function is disabled or has extreme taxes (90%+). Signs: no sell transactions, locked liquidity manipulation.
- **Rug pulls**: Developers drain the liquidity pool, making the token worthless. Signs: unlocked liquidity, anonymous team, sudden large withdrawals.
- **Unlimited approvals**: dApps requesting unlimited token spend. If the dApp is compromised, attackers drain everything. Users should approve exact amounts only.
- **Malicious contracts**: Contracts that look legitimate but have hidden functions like \`transferOwnership\`, hidden mint functions, or proxy patterns that can be upgraded maliciously.

### Architecture
- **Frontend**: React + Vite + Tailwind, deployed on Vercel
- **Agent**: TypeScript on OpenClaw, runs autonomously 24/7
- **Contracts**: Solidity on BNB Chain testnet (Hardhat)
- **Notifications**: Telegram bot + Moltbook activity feed
- **AI**: Powered by Claude (Anthropic) via Supabase edge function proxy

### Common User Questions You Should Handle
- "Is my wallet safe?" → Explain they need to enable protection first, then the agent monitors automatically
- "What happens to my tokens?" → They go to GuardianVault, fully withdrawable anytime
- "Can I lose my tokens?" → No, the vault is user-controlled. Only the user can withdraw.
- "How fast is detection?" → Agent scans every 5 minutes. Detection to protection is typically under 1 minute.
- "Is this free?" → Currently free on testnet. Mainnet will have gas costs.
- "What chains?" → BSC testnet now. opBNB, Base planned for Phase 2.
- Token address questions → You can explain how ThreatRegistry scoring works but note you can't query live contract data in this chat.

## Response Guidelines
- Keep answers concise but thorough. Use bullet points for lists.
- For technical questions, include contract function names and addresses when relevant.
- If someone asks about something outside GuardDog/DeFi security, politely redirect.
- Always recommend enabling protection if the user hasn't.
- When discussing threats, be specific about the mechanics — education prevents losses.
- If asked to scan a specific address, explain that live scanning happens through the agent/dashboard, but describe what the ThreatRegistry checks.
- Use 🐕‍🦺 🛡️ 🚨 ✅ emojis sparingly for key points.
- Never fabricate threat data or contract states. If you don't know, say so.`;

// ── Hook ──────────────────────────────────────────────────────────────

export function useGuardDogAgent(): UseGuardDogAgentReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm GuardDog AI 🐕‍🦺 — your security assistant.\n\nI can help you understand how wallet protection works, explain DeFi threats, or guide you through enabling protection.\n\nWhat's on your mind?",
      timestamp: Date.now(),
      status: "done",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      const userMsg: AgentMessage = {
        id: uid(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
        status: "done",
      };

      const assistantId = uid();
      const assistantMsg: AgentMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        status: "streaming",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);
      setStreaming(true);

      // Build conversation history (skip welcome, cap at last 20 messages)
      const history = [...messages.filter((m) => m.id !== "welcome"), userMsg]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(PROXY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            system: GUARDDOG_SYSTEM_PROMPT,
            messages: history,
            max_tokens: 1024,
            stream: true,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") break;

            try {
              const event = JSON.parse(raw);
              if (
                event.type === "content_block_delta" &&
                event.delta?.type === "text_delta"
              ) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.delta.text }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed
            }
          }
        }

        // Mark done
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, status: "done" } : m
          )
        );
      } catch (err: any) {
        if (err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, status: "done" } : m
            )
          );
        } else {
          // Fallback to non-streaming
          try {
            const res = await fetch(PROXY_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                system: GUARDDOG_SYSTEM_PROMPT,
                messages: history,
                max_tokens: 1024,
              }),
            });

            const data = await res.json();
            const text =
              data.content
                ?.filter((b: any) => b.type === "text")
                .map((b: any) => b.text)
                .join("\n") || "Sorry, I couldn't process that. Try again.";

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: text, status: "done" }
                  : m
              )
            );
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        "I'm having trouble reaching GuardDog AI right now 🐕‍🦺 Please try again in a moment — or head to the dashboard to check your protection status directly.",
                      status: "error",
                    }
                  : m
              )
            );
          }
        }
      } finally {
        abortRef.current = null;
        setLoading(false);
        setStreaming(false);
      }
    },
    [messages, loading]
  );

  const clearMessages = useCallback(() => {
    stopStreaming();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Chat cleared 🐕‍🦺\n\nReady when you are — ask me anything about wallet security.",
        timestamp: Date.now(),
        status: "done",
      },
    ]);
  }, [stopStreaming]);

  return { messages, loading, streaming, sendMessage, clearMessages, stopStreaming };
}
import { useState, useRef, useEffect, useCallback } from "react";
import type { JSX } from "react/jsx-runtime";
import { useGuardDogAgent, type AgentMessage } from "../../utils/useGuardDogAgent";



function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: JSX.Element[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre
          key={key++}
          className="bg-black/40 border border-emerald-500/10 rounded-lg px-4 py-3 my-2 overflow-x-auto text-xs font-mono text-emerald-300"
        >
          {lang && (
            <span className="text-[10px] uppercase text-gray-500 block mb-1">
              {lang}
            </span>
          )}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.match(/^[-•*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-•*]\s/)) {
        items.push(lines[i].replace(/^[-•*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-1.5 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm">
              <span className="text-emerald-400 mt-0.5 shrink-0">›</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-1.5 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-sm">
              <span className="text-emerald-400 font-mono text-xs mt-0.5 shrink-0 w-4 text-right">
                {idx + 1}.
              </span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    elements.push(
      <p key={key++} className="text-sm my-1">
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function inlineFormat(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return part;
  });
}


function MessageBubble({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mr-2 mt-1 shrink-0">
          <span className="text-sm">🐕</span>
        </div>
      )}

      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-emerald-600/90 text-white rounded-br-md"
            : "bg-white/[0.04] border border-white/[0.06] text-gray-200 rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <div className="leading-relaxed">
            {renderMarkdown(message.content)}
            {message.status === "streaming" && (
              <span className="inline-block w-1.5 h-4 bg-emerald-400 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mr-2 shrink-0">
        <span className="text-sm animate-bounce">🐕</span>
      </div>
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_0ms]" />
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_150ms]" />
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_300ms]" />
          <span className="text-[11px] text-gray-500 ml-2">sniffing out an answer...</span>
        </div>
      </div>
    </div>
  );
}


const QUICK_ACTIONS = [
  { label: "How does protection work?", icon: "🛡️" },
  { label: "What is a honeypot token?", icon: "🍯" },
  { label: "How to enable protection?", icon: "⚡" },
  { label: "Is my wallet safe?", icon: "🔒" },
  { label: "What threats do you detect?", icon: "🚨" },
  { label: "How fast is detection?", icon: "⏱️" },
];

function QuickActions({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="px-4 pb-3">
      <p className="text-[11px] text-gray-500 mb-2 uppercase tracking-wider">
        Quick questions
      </p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => onSelect(action.label)}
            className="text-xs bg-white/[0.04] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/20 text-gray-400 hover:text-emerald-300 px-3 py-1.5 rounded-full transition-all duration-200"
          >
            <span className="mr-1">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}


export default function GuardDogChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, streaming, sendMessage, clearMessages, stopStreaming } =
    useGuardDogAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
  };

  const handleQuickAction = (text: string) => {
    sendMessage(text);
  };

  const showQuickActions = messages.length <= 1;

  return (
    <>
      {/* Floating trigger */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
        >
          <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 flex items-center justify-center">
            <span className="text-2xl group-hover:scale-110 transition-transform">
              🐕‍🦺
            </span>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950 animate-pulse" />
          </div>
          <span className="absolute -top-8 right-0 bg-gray-900 border border-gray-800 text-gray-300 text-[11px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask GuardDog AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[400px] h-[620px] flex flex-col rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/50"
          style={{
            background:
              "linear-gradient(170deg, rgba(16,20,18,0.98) 0%, rgba(10,12,11,0.99) 100%)",
            backdropFilter: "blur(20px)",
            animation: "slideUp 0.25s ease-out",
          }}
        >
          {/* Header */}
          <div className="relative px-4 py-3 border-b border-white/[0.06] bg-emerald-500/[0.03]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-lg">🐕‍🦺</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm tracking-tight">
                    GuardDog AI
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    <span className="text-[11px] text-emerald-400/80">
                      {streaming ? "Responding..." : "Online"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearMessages}
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                  title="Clear chat"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {loading && !streaming && <ThinkingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          {showQuickActions && <QuickActions onSelect={handleQuickAction} />}

          {/* Input */}
          <div className="border-t border-white/[0.06] p-3 bg-black/20">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about wallet security..."
                disabled={loading}
                className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500/30 focus:bg-white/[0.06] transition-all disabled:opacity-50"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="px-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-30 disabled:hover:bg-emerald-600 flex items-center justify-center"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </form>
            <p className="text-[10px] text-gray-600 mt-1.5 text-center">
              Powered by Claude · GuardDog Security
            </p>
          </div>
        </div>
      )}

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
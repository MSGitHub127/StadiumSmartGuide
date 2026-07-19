'use client';

import { useRef, useState, useEffect } from 'react';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  'Nearest restroom?',
  'Food wait times',
  'Wheelchair access',
  'Lost & found',
];

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatConcierge(): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleFocus() {
      const el = document.getElementById('chat-input');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    window.addEventListener('focus-chat-input', handleFocus);
    return () => window.removeEventListener('focus-chat-input', handleFocus);
  }, []);

  async function handleSend(text?: string): Promise<void> {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed, time: timeNow() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed, detectedLanguage: 'auto' }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Assistant request failed.');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.response_text ?? 'No response available.',
        time: timeNow(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }

  return (
    <section
      aria-label="Stadium assistant chat"
      className="glass-premium rounded-2xl p-5 flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 mt-0.5">
        <Sparkles className="h-5 w-5 text-amber-400" aria-hidden="true" />
        <div>
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-widest">AI Concierge</h2>
          <p className="text-xs text-slate-300">Your smart stadium assistant</p>
        </div>
      </div>

      {/* Message log */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation history"
        className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-4 pr-1"
      >
        {messages.length === 0 && !loading && (
          <div className="flex flex-col gap-3 py-4">
            {/* Welcome message */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
              </div>
              <div>
                <div className="rounded-xl rounded-tl-sm px-3 py-2 text-[13px] leading-relaxed bg-gradient-to-br from-slate-800/80 to-slate-900/60 text-slate-100 border border-slate-700/40">
                  👋 Hello! How can I help you today?
                </div>
                <p className="text-[10px] text-slate-350 mt-1 ml-1">Just now</p>
              </div>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5 ml-9">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void handleSend(prompt)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-700/60 text-slate-200 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${
              m.role === 'user'
                ? 'bg-cyan-500/15 border border-cyan-500/30'
                : 'bg-indigo-500/15 border border-indigo-500/30'
            }`}>
              {m.role === 'user'
                ? <User className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                : <Bot className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
              }
            </div>
            <div>
              <div
                className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed max-w-[200px] ${
                  m.role === 'user'
                    ? 'rounded-tr-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white border border-indigo-500/25 shadow-lg shadow-indigo-500/10'
                    : 'rounded-tl-sm bg-gradient-to-br from-slate-800/80 to-slate-900/60 text-slate-200 border border-slate-700/40'
                }`}
              >
                {m.text}
              </div>
              <p className={`text-[10px] text-slate-350 mt-1 ${m.role === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                {m.time} {m.role === 'user' && '✓'}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
            </div>
            <div className="rounded-xl rounded-tl-sm px-4 py-3 bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/40 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-bounce [animation-delay:0ms]"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-bounce [animation-delay:150ms]"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-bounce [animation-delay:300ms]"></span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-400 mb-2 px-1">
          {error}
        </p>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex gap-2"
      >
        <label htmlFor="chat-input" className="sr-only">
          Type your question
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:border-indigo-500/50 focus-visible:ring-1 focus-visible:ring-indigo-500/20 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-3.5 py-2.5 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </form>
    </section>
  );
}

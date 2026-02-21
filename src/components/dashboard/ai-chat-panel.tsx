"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Désolé, une erreur s'est produite. Réessayez dans un instant." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Panneau */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col border-l border-gold-400/10 bg-atlantic-900/98 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold-400/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-sans font-semibold text-white">Assistant IA</p>
              <p className="text-[10px] font-sans text-atlantic-200/40">FacturePro AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-atlantic-200/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gold-400/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-gold-400/60" />
              </div>
              <div>
                <p className="text-sm font-sans font-medium text-white mb-1">
                  Comment puis-je vous aider ?
                </p>
                <p className="text-xs font-sans text-atlantic-200/40 max-w-[260px]">
                  Posez vos questions sur la facturation, la TVA, les relances ou votre activité.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full mt-2">
                {[
                  "Comment calculer la TVA sur mes factures ?",
                  "Quelle est la mention légale obligatoire ?",
                  "Comment relancer un client efficacement ?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left px-3 py-2 rounded-lg text-xs font-sans text-atlantic-200/60 hover:text-gold-400 hover:bg-gold-400/5 border border-gold-400/5 hover:border-gold-400/20 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <Sparkles className="w-3 h-3 text-gold-400" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm font-sans leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gold-400/15 text-white rounded-tr-sm border border-gold-400/20"
                    : "bg-atlantic-800/60 text-atlantic-100 rounded-tl-sm border border-white/5"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-gold-400" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-atlantic-800/60 border border-white/5">
                <Loader2 className="w-4 h-4 text-gold-400/60 animate-spin" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gold-400/10">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              rows={1}
              className="flex-1 resize-none premium-input text-sm py-3 max-h-32 leading-relaxed"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-3 rounded-xl bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] font-sans text-atlantic-200/30 mt-2 text-center">
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
          </p>
        </div>
      </div>
    </>
  );
}

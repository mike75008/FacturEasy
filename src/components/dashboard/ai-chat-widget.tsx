"use client";

import { useState, useRef, useEffect } from "react";
import { Brain, X, Send, Sparkles, Loader2 } from "lucide-react";
import { getDocuments, getClients, getOrganization } from "@/lib/supabase/data";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
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

  async function buildContext(): Promise<string> {
    try {
      const [org, clients, documents] = await Promise.all([
        getOrganization(),
        getClients(),
        getDocuments(),
      ]);

      const today = new Date();
      const thisMonth = documents.filter((d) => {
        const date = new Date(d.date);
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      });
      const overdue = documents.filter(
        (d) => d.type === "facture" && d.status === "envoye" && d.due_date && new Date(d.due_date) < today
      );
      const pending = documents.filter(
        (d) => d.type === "facture" && (d.status === "envoye" || d.status === "valide")
      );
      const totalCA = documents
        .filter((d) => d.type === "facture" && d.status === "paye")
        .reduce((sum, d) => sum + d.total_ttc, 0);
      const pendingTotal = pending.reduce((sum, d) => sum + d.total_ttc, 0);

      return `
Tu es l'assistant IA intégré à FacturePro, l'application de facturation de ${org?.name || "cette entreprise"}.
Tu as accès aux données réelles de l'utilisateur. Utilise-les pour répondre avec précision.
Réponds toujours en français, de façon concise et utile.

--- DONNÉES DE L'ENTREPRISE ---
Nom : ${org?.name || "Non renseigné"}
SIRET : ${org?.siret || "Non renseigné"}
TVA : ${org?.tva_number || "Non renseigné"}
Email : ${org?.email || "Non renseigné"}

--- ACTIVITÉ ---
Nombre de clients : ${clients.length}
Total documents : ${documents.length}
Factures ce mois-ci : ${thisMonth.filter((d) => d.type === "facture").length}
CA encaissé (factures payées) : ${totalCA.toFixed(2)} €
En attente de paiement : ${pendingTotal.toFixed(2)} € (${pending.length} facture${pending.length > 1 ? "s" : ""})
Factures en retard : ${overdue.length}

--- CLIENTS RÉCENTS ---
${clients
  .slice(0, 10)
  .map((c) => `- ${c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()} (${c.email || "pas d'email"})`)
  .join("\n")}

--- DOCUMENTS RÉCENTS ---
${documents
  .slice(0, 10)
  .map((d) => `- ${d.number} | ${d.type} | ${d.status} | ${d.total_ttc.toFixed(2)} €`)
  .join("\n")}
`.trim();
    } catch {
      return `Tu es l'assistant IA intégré à FacturePro, une application de facturation française.
Tu aides les utilisateurs avec leurs questions sur la facturation, la TVA, les relances, etc.
Réponds toujours en français.`;
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const systemContext = await buildContext();

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          systemContext,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Désolé, une erreur s'est produite. Vérifiez votre connexion et réessayez." },
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Fenêtre de chat */}
      {open && (
        <div className="w-[380px] flex flex-col rounded-2xl border border-gold-400/15 bg-atlantic-900/98 backdrop-blur-xl shadow-2xl overflow-hidden"
          style={{ height: "520px" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gold-400/10 bg-gradient-to-r from-gold-400/[0.06] to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Brain className="w-4 h-4 text-gold-400" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              </div>
              <div>
                <p className="text-xs font-sans font-semibold text-white">Assistant IA</p>
                <p className="text-[9px] font-sans text-atlantic-200/40">FacturePro AI · En ligne</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-atlantic-200/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gold-400/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-gold-400/60" />
                </div>
                <div>
                  <p className="text-xs font-sans font-semibold text-white mb-1">Comment puis-je vous aider ?</p>
                  <p className="text-[10px] font-sans text-atlantic-200/40 max-w-[240px]">
                    Je connais votre activité, vos clients et vos documents. Posez-moi n&apos;importe quelle question.
                  </p>
                </div>
                <div className="w-full space-y-1.5">
                  {[
                    "Qui me doit de l'argent ?",
                    "Quel est mon CA ce mois-ci ?",
                    "Comment rédiger une relance ?",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-sans text-atlantic-200/60 hover:text-gold-400 border border-gold-400/5 hover:border-gold-400/20 hover:bg-gold-400/5 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 rounded-lg bg-gold-400/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                    <Brain className="w-2.5 h-2.5 text-gold-400" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-sans leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gold-400/15 text-white rounded-tr-sm border border-gold-400/20"
                    : "bg-atlantic-800/60 text-atlantic-100 rounded-tl-sm border border-white/5"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="w-5 h-5 rounded-lg bg-gold-400/10 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Brain className="w-2.5 h-2.5 text-gold-400" />
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-atlantic-800/60 border border-white/5">
                  <Loader2 className="w-3 h-3 text-gold-400/60 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gold-400/10">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question..."
                rows={1}
                className="flex-1 resize-none premium-input text-xs py-2.5 max-h-24 leading-relaxed"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 96) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[9px] font-sans text-atlantic-200/20 mt-1.5 text-center">
              Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
            </p>
          </div>
        </div>
      )}

      {/* Bouton flottant — même visuel que le bloc sidebar */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer bg-gradient-to-r from-gold-400/[0.08] to-atlantic-600/20 border border-gold-400/15 hover:border-gold-400/30 backdrop-blur-xl shadow-xl transition-all duration-200"
      >
        <div className="relative flex-shrink-0">
          <Brain className="w-5 h-5 text-gold-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <div className="text-left">
          <p className="text-xs font-sans font-semibold text-gold-400 whitespace-nowrap">Assistant IA</p>
          <p className="text-[10px] font-sans text-atlantic-200/40 whitespace-nowrap">En ligne</p>
        </div>
        <Sparkles className="w-3.5 h-3.5 text-gold-400/50" />
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { PageTransition } from "@/components/premium/page-transition";
import { Brain, Send, Loader2, X, TrendingUp, Zap } from "lucide-react";
import { useAppContext } from "@/lib/context/app-context";
import { computeInsights, markAsSeen } from "@/lib/insights";
import type { Insight } from "@/lib/insights";
import { formatCurrency } from "@/lib/utils";
import { getOrganization } from "@/lib/supabase/data";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InsightThread extends Insight {
  thread: Message[];       // démarre avec le message proactif de l'IA
  replyInput: string;
  replyLoading: boolean;
}

const COLOR_STYLES: Record<string, { border: string; bg: string; title: string; inputBorder: string; sendBtn: string }> = {
  red:    { border: "border-red-400/30",    bg: "bg-red-400/[0.03]",    title: "text-red-300",    inputBorder: "border-red-400/20",    sendBtn: "text-red-300 hover:bg-red-400/20" },
  orange: { border: "border-orange-400/30", bg: "bg-orange-400/[0.03]", title: "text-orange-300", inputBorder: "border-orange-400/20", sendBtn: "text-orange-300 hover:bg-orange-400/20" },
  yellow: { border: "border-yellow-400/30", bg: "bg-yellow-400/[0.03]", title: "text-yellow-300", inputBorder: "border-yellow-400/20", sendBtn: "text-yellow-300 hover:bg-yellow-400/20" },
  blue:   { border: "border-blue-400/30",   bg: "bg-blue-400/[0.03]",   title: "text-blue-300",   inputBorder: "border-blue-400/20",   sendBtn: "text-blue-300 hover:bg-blue-400/20" },
  green:  { border: "border-emerald-400/30",bg: "bg-emerald-400/[0.03]",title: "text-emerald-300",inputBorder: "border-emerald-400/20",sendBtn: "text-emerald-300 hover:bg-emerald-400/20" },
};

export default function AssistantPage() {
  const { documents, clients } = useAppContext();
  const [threads, setThreads] = useState<InsightThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("votre entreprise");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Calcul des insights → threads ────────────────────────────────────────────
  useEffect(() => {
    if (!documents.length && !clients.length) return;
    const all = computeInsights(documents, clients);
    const withThreads: InsightThread[] = all.map((insight) => ({
      ...insight,
      // L'IA ouvre la conversation avec son analyse
      thread: [{ role: "assistant" as const, content: insight.detail }],
      replyInput: "",
      replyLoading: false,
    }));
    setThreads(withThreads);
  }, [documents, clients]);

  useEffect(() => {
    getOrganization().then((org) => {
      if (org?.name) setOrgName(org.name);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Système prompt ────────────────────────────────────────────────────────────
  const buildSystemPrompt = useCallback((): string => {
    const today = new Date();
    const overdue = documents.filter(
      (d) => d.type === "facture" && d.status === "envoye" && d.due_date && new Date(d.due_date) < today
    );
    const pending = documents.filter(
      (d) => d.type === "facture" && (d.status === "envoye" || d.status === "valide")
    );
    const paidCA = documents
      .filter((d) => d.type === "facture" && d.status === "paye")
      .reduce((s, d) => s + d.total_ttc, 0);
    const pendingTotal = pending.reduce((s, d) => s + d.total_ttc, 0);
    const overdueTotal = overdue.reduce((s, d) => s + d.total_ttc, 0);
    const allDevis = documents.filter((d) => d.type === "devis");
    const convertedDevis = allDevis.filter((d) => d.status === "paye");
    const conversionRate = allDevis.length > 0
      ? Math.round((convertedDevis.length / allDevis.length) * 100)
      : 0;

    return `Tu es le conseiller financier personnel de ${orgName}. Ton seul objectif : faire grossir leur ROI et protéger leur trésorerie.

TON CARACTÈRE :
- Direct, sans langue de bois, comme un associé qui a leur intérêt à cœur
- Tu ne dis jamais "je vous suggère peut-être" — tu dis "voilà ce qu'il faut faire"
- Chaque réponse inclut un impact en euros quand c'est possible
- Tu donnes des actions concrètes avec des délais réalistes
- Tu n'as pas peur de dire qu'une situation est dangereuse ou qu'une opportunité est en train de fuir

DONNÉES RÉELLES :
- CA encaissé : ${formatCurrency(paidCA)}
- Encours : ${formatCurrency(pendingTotal)} (${pending.length} factures)
- Retards : ${formatCurrency(overdueTotal)} (${overdue.length} factures)
- Clients : ${clients.length}
- Taux conversion devis : ${conversionRate}%

Factures en retard :
${overdue.slice(0, 5).map((d) => `- ${d.number} : ${formatCurrency(d.total_ttc)} depuis le ${d.due_date}`).join("\n") || "Aucune"}

Réponds en français. Sois précis, chiffré, actionnable.`.trim();
  }, [documents, clients, orgName]);

  // ── Canal droit : conversation libre ─────────────────────────────────────────
  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages, systemContext: buildSystemPrompt() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Erreur de connexion. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // ── Canal gauche : répondre dans un thread ────────────────────────────────────
  async function handleThreadReply(insightId: string) {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== insightId) return t;
        const text = t.replyInput.trim();
        if (!text || t.replyLoading) return t;
        return { ...t, thread: [...t.thread, { role: "user" as const, content: text }], replyInput: "", replyLoading: true };
      })
    );

    const thread = threads.find((t) => t.id === insightId);
    if (!thread) return;
    const text = thread.replyInput.trim();
    if (!text) return;

    // Contexte enrichi avec l'insight spécifique
    const insightContext = `${buildSystemPrompt()}\n\nCONTEXTE DE CETTE DISCUSSION :\nL'utilisateur répond à cette alerte financière que tu as soulevée : "${thread.title}"\nDétail initial : "${thread.detail}"\nMontant en jeu : ${formatCurrency(thread.euros)}`;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: thread.thread,
          systemContext: insightContext,
        }),
      });
      const data = await res.json();
      const reply = data.error ? "Erreur de connexion. Réessayez." : data.content;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === insightId
            ? { ...t, thread: [...t.thread, { role: "assistant" as const, content: reply }], replyLoading: false }
            : t
        )
      );
      markAsSeen(insightId);
    } catch {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === insightId
            ? { ...t, thread: [...t.thread, { role: "assistant" as const, content: "Erreur. Réessayez." }], replyLoading: false }
            : t
        )
      );
    }
  }

  function handleThreadKeyDown(e: React.KeyboardEvent, insightId: string) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleThreadReply(insightId); }
  }

  function dismissThread(id: string) {
    markAsSeen(id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <PageTransition>
      <div className="flex flex-col h-screen">
        <Topbar
          title="Assistant IA"
          subtitle="Conseiller financier — deux canaux, aucune frustration"
        />

        <div className="flex flex-1 overflow-hidden">

          {/* ══ CANAL GAUCHE : Pensées IA (conversations proactives) ══ */}
          <div className="w-[380px] flex-shrink-0 border-r border-gold-400/10 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gold-400/10 flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold-400" />
              <div>
                <span className="text-xs font-sans font-semibold text-white">L'IA prend la parole</span>
                <p className="text-[9px] font-sans text-atlantic-200/40">Réponds directement dans chaque sujet</p>
              </div>
              {threads.length > 0 && (
                <span className="ml-auto text-[9px] font-sans px-1.5 py-0.5 rounded-full bg-red-400/20 text-red-300 font-bold">
                  {threads.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {threads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-xs font-sans text-atlantic-200/50">
                    Aucune alerte financière. Activité saine.
                  </p>
                </div>
              ) : (
                threads.map((t) => {
                  const s = COLOR_STYLES[t.color] ?? COLOR_STYLES.blue;
                  return (
                    <div key={t.id} className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>

                      {/* En-tête du thread */}
                      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm leading-none flex-shrink-0">{t.icon}</span>
                          <span className={`text-[10px] font-sans font-bold ${s.title} leading-snug`}>
                            {t.title}
                          </span>
                        </div>
                        <button
                          onClick={() => dismissThread(t.id)}
                          className="text-atlantic-200/30 hover:text-white transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Thread de messages */}
                      <div className="px-3 pb-2 space-y-2 max-h-48 overflow-y-auto">
                        {t.thread.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && (
                              <div className="w-4 h-4 rounded-md bg-gold-400/15 flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0">
                                <Brain className="w-2 h-2 text-gold-400" />
                              </div>
                            )}
                            <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[10px] font-sans leading-relaxed ${
                              msg.role === "user"
                                ? "bg-gold-400/15 text-white rounded-tr-sm border border-gold-400/15"
                                : "bg-atlantic-800/50 text-atlantic-200/80 rounded-tl-sm"
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {t.replyLoading && (
                          <div className="flex justify-start">
                            <div className="w-4 h-4 rounded-md bg-gold-400/15 flex items-center justify-center mr-1.5 flex-shrink-0">
                              <Brain className="w-2 h-2 text-gold-400" />
                            </div>
                            <div className="px-2.5 py-1.5 rounded-xl bg-atlantic-800/50">
                              <Loader2 className="w-3 h-3 text-gold-400/60 animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input propre à ce thread */}
                      <div className={`px-3 pb-3 border-t ${s.border} pt-2`}>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={t.replyInput}
                            onChange={(e) =>
                              setThreads((prev) =>
                                prev.map((th) => th.id === t.id ? { ...th, replyInput: e.target.value } : th)
                              )
                            }
                            onKeyDown={(e) => handleThreadKeyDown(e, t.id)}
                            placeholder="Répondre à cette pensée..."
                            className="flex-1 bg-atlantic-800/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] font-sans text-white placeholder:text-atlantic-200/30 focus:outline-none focus:border-gold-400/30 transition-colors"
                            disabled={t.replyLoading}
                          />
                          <button
                            onClick={() => handleThreadReply(t.id)}
                            disabled={!t.replyInput.trim() || t.replyLoading}
                            className={`p-1.5 rounded-lg ${s.sendBtn} disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0`}
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ══ CANAL DROIT : Conversation libre ══ */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-gold-400/10 flex items-center gap-2">
              <Brain className="w-4 h-4 text-gold-400" />
              <div>
                <span className="text-xs font-sans font-semibold text-white">Tu prends la parole</span>
                <p className="text-[9px] font-sans text-atlantic-200/40">Questions libres, stratégie, analyse</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-gold-400/10 flex items-center justify-center">
                    <Brain className="w-7 h-7 text-gold-400/70" />
                  </div>
                  <div>
                    <p className="text-sm font-sans font-semibold text-white mb-1">
                      Pose ta question, je réponds cash
                    </p>
                    <p className="text-xs font-sans text-atlantic-200/40 leading-relaxed">
                      Chiffres réels, recommandations concrètes. Pas de langue de bois.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5">
                    {[
                      "Qui me doit le plus d'argent en ce moment ?",
                      "Comment améliorer mon taux de conversion devis ?",
                      "Quels clients devrais-je relancer en priorité ?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-sans text-atlantic-200/60 hover:text-gold-400 border border-gold-400/5 hover:border-gold-400/20 hover:bg-gold-400/5 transition-all"
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
                    <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0">
                      <Brain className="w-3 h-3 text-gold-400" />
                    </div>
                  )}
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm font-sans leading-relaxed ${
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
                  <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0">
                    <Brain className="w-3 h-3 text-gold-400" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-atlantic-800/60 border border-white/5">
                    <Loader2 className="w-4 h-4 text-gold-400/60 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gold-400/10">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez une question financière ou stratégique..."
                  rows={1}
                  className="flex-1 resize-none premium-input text-sm py-3 max-h-32 leading-relaxed"
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
              <p className="text-[10px] font-sans text-atlantic-200/20 mt-2 text-center">
                Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
              </p>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { PageTransition } from "@/components/premium/page-transition";
import { Send, Loader2, X, TrendingUp, Zap, Sparkles } from "lucide-react";
import { useAppContext } from "@/lib/context/app-context";
import { computeInsights, markAsSeen } from "@/lib/insights";
import type { Insight } from "@/lib/insights";
import { formatCurrency } from "@/lib/utils";
import { getOrganization } from "@/lib/supabase/data";
import { createTicket } from "@/lib/tickets";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InsightThread extends Insight {
  thread: Message[];
  replyInput: string;
  replyLoading: boolean;
}

const COLOR_STYLES: Record<string, { border: string; bg: string; title: string; sendBtn: string }> = {
  red:    { border: "border-red-400/30",    bg: "bg-red-400/[0.03]",    title: "text-red-300",    sendBtn: "text-red-300 hover:bg-red-400/20" },
  orange: { border: "border-orange-400/30", bg: "bg-orange-400/[0.03]", title: "text-orange-300", sendBtn: "text-orange-300 hover:bg-orange-400/20" },
  yellow: { border: "border-yellow-400/30", bg: "bg-yellow-400/[0.03]", title: "text-yellow-300", sendBtn: "text-yellow-300 hover:bg-yellow-400/20" },
  blue:   { border: "border-blue-400/30",   bg: "bg-blue-400/[0.03]",   title: "text-blue-300",   sendBtn: "text-blue-300 hover:bg-blue-400/20" },
  green:  { border: "border-emerald-400/30",bg: "bg-emerald-400/[0.03]",title: "text-emerald-300",sendBtn: "text-emerald-300 hover:bg-emerald-400/20" },
};

// ── Avatars distincts ─────────────────────────────────────────────────────────
function SamAvatar({ size = "sm" }: { size?: "sm" | "xs" }) {
  const cls = size === "xs"
    ? "w-4 h-4 text-[8px]"
    : "w-6 h-6 text-[10px]";
  return (
    <div className={`${cls} rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-300 flex-shrink-0`}>
      S
    </div>
  );
}

function HelenaAvatar({ size = "sm" }: { size?: "sm" | "xs" }) {
  const cls = size === "xs"
    ? "w-4 h-4 text-[8px]"
    : "w-6 h-6 text-[10px]";
  return (
    <div className={`${cls} rounded-lg bg-violet-400/20 border border-violet-400/30 flex items-center justify-center font-bold text-violet-300 flex-shrink-0`}>
      H
    </div>
  );
}

export default function AssistantPage() {
  const { documents, clients } = useAppContext();
  const [threads, setThreads] = useState<InsightThread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [orgName, setOrgName] = useState("votre entreprise");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!documents.length && !clients.length) return;
    const all = computeInsights(documents, clients);
    const withThreads: InsightThread[] = all.map((insight) => ({
      ...insight,
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

  // ── Prompt Sam — conseillère financière proactive ─────────────────────────────
  const buildSamPrompt = useCallback((insightTitle: string, insightDetail: string, euros: number): string => {
    const today = new Date();
    const overdue = documents.filter(
      (d) => d.type === "facture" && d.status === "envoye" && d.due_date && new Date(d.due_date) < today
    );
    const paidCA = documents
      .filter((d) => d.type === "facture" && d.status === "paye")
      .reduce((s, d) => s + d.total_ttc, 0);

    return `Tu es Sam. Tu travailles pour ${orgName} comme conseillère financière. Tu es celle qui prend la parole sans qu'on te demande, qui repère l'argent qui dort ou qui s'échappe, et qui dit tout haut ce que les chiffres murmurent.

RÈGLES ABSOLUES DE TON STYLE :
1. Tu commences TOUJOURS par le montant en jeu ou un chiffre concret. Jamais par "Bonjour" ou "Bonne question".
2. Tes phrases sont courtes. Maximum 20 mots par phrase. Tu coupes là où d'autres continuent.
3. Tu donnes UNE action. Pas trois. Pas "plusieurs options". Une. La meilleure.
4. Tu n'utilises JAMAIS ces mots : "peut-être", "éventuellement", "il serait intéressant de", "je vous suggère", "n'hésitez pas".
5. Quand tu détectes une erreur ou une occasion manquée, tu le dis sans détour.
6. Tu conclus toujours par un délai : "Fais ça aujourd'hui." / "Tu as 48h." / "D'ici vendredi."

EXEMPLE DE TON STYLE :
Question : "Mon client ne répond plus à mes relances."
Mauvaise réponse (pas ton style) : "Il serait peut-être intéressant d'envisager une approche différente pour relancer ce client."
Bonne réponse (ton style) : "4 200€ en jeu. Deux semaines sans réponse = signal clair. Envoie une mise en demeure par recommandé aujourd'hui. Pas un email — un courrier. Le RAR change tout psychologiquement. Tu as 24h avant que ça devienne une procédure."

CONTEXTE DE CETTE DISCUSSION :
Alerte que tu as soulevée : "${insightTitle}"
Montant en jeu : ${formatCurrency(euros)}

DONNÉES CLÉS :
- CA encaissé : ${formatCurrency(paidCA)}
- Retards de paiement : ${overdue.length} factures — ${formatCurrency(overdue.reduce((s, d) => s + d.total_ttc, 0))}
- Clients : ${clients.length}

COLLABORATION AVEC HELENA :
Si la question est purement technique ou légale sans urgence financière (TVA, mentions obligatoires, délais légaux, statuts juridiques), réponds en une phrase et dis : "Pour une réponse complète sur ce point, pose la question à Helena dans le canal de droite — c'est son terrain."

Réponds en français. Court. Chiffré. Une action. Un délai.`.trim();
  }, [documents, clients, orgName]);

  // ── Prompt Helena — assistante experte réactive ───────────────────────────────
  const buildHelenaPrompt = useCallback((): string => {
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
    const allDevis = documents.filter((d) => d.type === "devis");
    const conversionRate = allDevis.length > 0
      ? Math.round((documents.filter((d) => d.type === "devis" && d.status === "paye").length / allDevis.length) * 100)
      : 0;

    return `Tu es Helena. Tu travailles pour ${orgName} comme assistante experte en gestion financière et administrative. Tu es la référence — on vient te voir quand on a besoin de comprendre, pas juste d'agir.

RÈGLES ABSOLUES DE TON STYLE :
1. Tu commences par reformuler brièvement la question pour montrer que tu as compris. Une phrase. Pas plus.
2. Tu structures ta réponse : d'abord le contexte ou la règle, ensuite l'application au cas précis, enfin les options ou nuances.
3. Tu cites les textes de loi quand c'est pertinent (CGI, Code de commerce, loi LME, etc.) mais en rendant ça accessible.
4. Quand il y a plusieurs options, tu les présentes toutes avec les avantages et risques de chacune.
5. Tu n'inventes jamais. Si une info te manque pour répondre correctement, tu le dis et tu demandes.
6. Tu termines souvent par une question de clarification ou un "point de vigilance" à ne pas oublier.

EXEMPLE DE TON STYLE :
Question : "Est-ce que je dois mettre la TVA sur mes devis ?"
Bonne réponse (ton style) : "Tu veux savoir si tes devis doivent afficher la TVA — bonne question car ça dépend de ton régime. Si tu es en franchise en base de TVA (article 293 B du CGI), tu ne facturas pas de TVA et tu dois l'indiquer explicitement sur le document. Si tu es au régime réel, la TVA doit apparaître avec le taux applicable et le montant HT/TTC séparés. Dans ton cas, je vois que tu utilises un taux de TVA — tu es donc au régime réel. Point de vigilance : un devis sans mention TVA correcte peut être contesté. Tu veux que je t'explique les mentions obligatoires complètes ?"

DONNÉES RÉELLES DE L'ENTREPRISE :
- CA encaissé : ${formatCurrency(paidCA)}
- Encours : ${formatCurrency(pending.reduce((s, d) => s + d.total_ttc, 0))} (${pending.length} factures)
- Retards : ${overdue.length} factures — ${formatCurrency(overdue.reduce((s, d) => s + d.total_ttc, 0))}
- Clients : ${clients.length}
- Taux de conversion devis : ${conversionRate}%

Factures en retard :
${overdue.slice(0, 5).map((d) => `- ${d.number} : ${formatCurrency(d.total_ttc)} — depuis le ${d.due_date}`).join("\n") || "Aucune"}

COLLABORATION AVEC SAM :
Si la question demande une action immédiate sur un montant précis et urgent, donne ta réponse structurée puis ajoute : "Pour une recommandation directe et immédiate sur ce point, Sam dans le canal de gauche peut te donner la marche à suivre en une phrase."

Réponds en français. Précis, structuré, avec le contexte légal quand c'est utile.`.trim();
  }, [documents, clients, orgName]);

  // ── Canal Helena : conversation libre ─────────────────────────────────────────
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
        body: JSON.stringify({ message: text, history: messages, systemContext: buildHelenaPrompt() }),
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

  function handleEscalate() {
    if (messages.length === 0 || ticketCreated) return;
    const userMessages = messages.filter((m) => m.role === "user");
    const title = userMessages[0]?.content?.slice(0, 80) || "Problème signalé";
    const description = userMessages.map((m) => m.content).join(" / ").slice(0, 200);
    const ticket = createTicket(title, description, messages);
    setTicketCreated(true);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Ton incident a été transmis au support.\n\n📋 Numéro de ticket : **${ticket.id}**\n\nConserve ce numéro pour le suivi. Tu peux retrouver l'avancement à tout moment dans Messages (icône en haut à droite). Le support reviendra vers toi dès que possible.`,
      },
    ]);
  }

  // ── Canal Sam : répondre dans un thread ───────────────────────────────────────
  async function handleThreadReply(insightId: string) {
    const thread = threads.find((t) => t.id === insightId);
    if (!thread) return;
    const text = thread.replyInput.trim();
    if (!text || thread.replyLoading) return;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === insightId
          ? { ...t, thread: [...t.thread, { role: "user" as const, content: text }], replyInput: "", replyLoading: true }
          : t
      )
    );

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: thread.thread,
          systemContext: buildSamPrompt(thread.title, thread.detail, thread.euros),
        }),
      });
      const data = await res.json();
      const reply = data.error ? "Erreur. Réessayez." : data.content;
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
          title="Espace IA"
          subtitle="Sam · Helena — deux conseillers, zéro langue de bois"
        />

        <div className="flex flex-1 overflow-hidden">

          {/* ══ CANAL SAM ══ */}
          <div className="w-[380px] flex-shrink-0 border-r border-gold-400/10 flex flex-col overflow-hidden">

            {/* Header Sam */}
            <div className="px-4 py-3 border-b border-amber-400/10 bg-amber-400/[0.02] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400/15 border border-amber-400/25 flex items-center justify-center font-display font-bold text-amber-300 text-sm flex-shrink-0">
                S
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-sans font-bold text-amber-300">Sam</p>
                <p className="text-[9px] font-sans text-atlantic-200/40">Elle prend la parole — tu réponds</p>
              </div>
              {threads.length > 0 && (
                <span className="text-[9px] font-sans px-1.5 py-0.5 rounded-full bg-red-400/20 text-red-300 font-bold flex-shrink-0">
                  {threads.length}
                </span>
              )}
            </div>

            {/* Threads Sam */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {threads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-400/60" />
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-amber-300/60 mb-1">Sam est silencieuse</p>
                    <p className="text-[10px] font-sans text-atlantic-200/40">
                      Aucune alerte financière détectée. Votre activité est saine.
                    </p>
                  </div>
                </div>
              ) : (
                threads.map((t) => {
                  const s = COLOR_STYLES[t.color] ?? COLOR_STYLES.blue;
                  return (
                    <div key={t.id} className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>

                      {/* Titre du thread */}
                      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm leading-none flex-shrink-0">{t.icon}</span>
                          <span className={`text-[10px] font-sans font-bold ${s.title} leading-snug`}>
                            {t.title}
                          </span>
                        </div>
                        <button onClick={() => dismissThread(t.id)} className="text-atlantic-200/30 hover:text-white transition-colors flex-shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Messages du thread */}
                      <div className="px-3 pb-2 space-y-2 max-h-52 overflow-y-auto">
                        {t.thread.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            {msg.role === "assistant" && <SamAvatar size="xs" />}
                            <div className={`${msg.role === "assistant" ? "ml-1.5" : ""} max-w-[85%] px-2.5 py-1.5 rounded-xl text-[10px] font-sans leading-relaxed ${
                              msg.role === "user"
                                ? "bg-gold-400/15 text-white rounded-tr-sm border border-gold-400/15"
                                : "bg-atlantic-800/50 text-atlantic-200/80 rounded-tl-sm"
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                        {t.replyLoading && (
                          <div className="flex justify-start items-center gap-1.5">
                            <SamAvatar size="xs" />
                            <div className="px-2.5 py-1.5 rounded-xl bg-atlantic-800/50">
                              <Loader2 className="w-3 h-3 text-amber-400/60 animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input Sam */}
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
                            placeholder="Répondre à Sam..."
                            className="flex-1 bg-atlantic-800/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] font-sans text-white placeholder:text-atlantic-200/30 focus:outline-none focus:border-amber-400/30 transition-colors"
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

          {/* ══ CANAL HELENA ══ */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Header Helena */}
            <div className="px-6 py-3 border-b border-violet-400/10 bg-violet-400/[0.02] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-400/15 border border-violet-400/25 flex items-center justify-center font-display font-bold text-violet-300 text-sm flex-shrink-0">
                H
              </div>
              <div>
                <p className="text-xs font-sans font-bold text-violet-300">Helena</p>
                <p className="text-[9px] font-sans text-atlantic-200/40">Tu prends la parole — elle répond</p>
              </div>
            </div>

            {/* Messages Helena */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-violet-400/70" />
                  </div>
                  <div>
                    <p className="text-sm font-sans font-semibold text-white mb-1">
                      Helena est à votre écoute
                    </p>
                    <p className="text-xs font-sans text-atlantic-200/40 leading-relaxed">
                      Questions sur vos chiffres, la TVA, vos clients, vos relances — elle sait tout.
                    </p>
                  </div>
                  <div className="w-full space-y-1.5">
                    {[
                      "Qui me doit le plus d'argent en ce moment ?",
                      "Comment améliorer mon taux de conversion devis ?",
                      "Quelle est la mention légale obligatoire sur mes factures ?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-sans text-atlantic-200/60 hover:text-violet-300 border border-violet-400/5 hover:border-violet-400/20 hover:bg-violet-400/5 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <HelenaAvatar />}
                  <div className={`${msg.role === "assistant" ? "ml-2.5" : ""} max-w-[75%] px-4 py-3 rounded-2xl text-sm font-sans leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gold-400/15 text-white rounded-tr-sm border border-gold-400/20"
                      : "bg-violet-400/[0.06] text-atlantic-100 rounded-tl-sm border border-violet-400/10"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start items-center gap-2.5">
                  <HelenaAvatar />
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-violet-400/[0.06] border border-violet-400/10">
                    <Loader2 className="w-4 h-4 text-violet-400/60 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input Helena */}
            <div className="px-6 py-4 border-t border-violet-400/10">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Poser une question à Helena..."
                  rows={1}
                  className="flex-1 resize-none bg-atlantic-800/40 border border-violet-400/10 rounded-xl px-4 py-3 text-sm font-sans text-white placeholder:text-atlantic-200/30 focus:outline-none focus:border-violet-400/30 transition-colors max-h-32 leading-relaxed"
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 128) + "px";
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-3 rounded-xl bg-violet-400/10 text-violet-300 hover:bg-violet-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] font-sans text-atlantic-200/20">
                  Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
                </p>
                {messages.length >= 4 && !ticketCreated && (
                  <button
                    onClick={handleEscalate}
                    className="text-[10px] font-sans text-atlantic-200/40 hover:text-orange-300 transition-colors underline underline-offset-2"
                  >
                    Helena ne peut pas résoudre → escalader au support
                  </button>
                )}
                {ticketCreated && (
                  <span className="text-[10px] font-sans text-emerald-400/60">
                    ✓ Ticket transmis
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageTransition>
  );
}

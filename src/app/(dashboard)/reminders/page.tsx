"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Bell, Brain, Mail, Phone, Plus, Send, Clock, AlertTriangle,
  CheckCircle2, Sparkles, ChevronRight, MessageSquare, Zap, ExternalLink,
} from "lucide-react";
import {
  saveReminder as saveReminderLS,
  getReminders as getRemindersLS,
} from "@/lib/local-storage";
import {
  saveReminder as saveReminderDB,
  markReminderSent,
} from "@/lib/supabase/data";
import { useAppContext } from "@/lib/context/app-context";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import type { Reminder, Document as Doc, Client } from "@/types/database";

const PRIORITY_COLORS = {
  low: "bg-blue-400/10 text-blue-400",
  medium: "bg-amber-400/10 text-amber-400",
  high: "bg-orange-400/10 text-orange-400",
  critical: "bg-red-400/10 text-red-400",
};

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  appel: Phone,
};

export default function RemindersPage() {
  const router = useRouter();
  const { reminders: ctxReminders, documents, clients, refreshReminders } = useAppContext();
  const [reminders, setReminders] = useState<Reminder[]>(ctxReminders);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "appel">("email");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [autoGlobal, setAutoGlobal] = useState(false);
  const [autoDelays, setAutoDelays] = useState<number[]>([7, 14, 30]);
  const [autoOverrides, setAutoOverrides] = useState<Record<string, boolean>>({});
  const [autoNextMsg, setAutoNextMsg] = useState<string | null>(null);
  // Délai et ton personnalisés par relance (clé = reminder.id)
  const [nextDelayOverrides, setNextDelayOverrides] = useState<Record<string, number>>({});
  const [nextToneOverrides, setNextToneOverrides] = useState<Record<string, string>>({});

  const AUTO_TONES = ["amical", "ferme", "mise en demeure"] as const;
  type Tone = typeof AUTO_TONES[number];
  const TONE_LABELS: Record<string, string> = { amical: "Amical", ferme: "Ferme", "mise en demeure": "Mise en demeure" };
  const TONE_COLORS: Record<string, string> = { amical: "blue", ferme: "amber", "mise en demeure": "red" };

  useEffect(() => {
    setReminders(ctxReminders);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxReminders]);

  useEffect(() => {
    const global = localStorage.getItem("auto_reminder_global");
    if (global !== null) setAutoGlobal(global === "true");
    const delays = localStorage.getItem("auto_reminder_delays");
    if (delays) { try { setAutoDelays(JSON.parse(delays)); } catch {} }
    const overrides = localStorage.getItem("auto_reminder_overrides");
    if (overrides) setAutoOverrides(JSON.parse(overrides));
  }, []);

  function toggleAutoGlobal() {
    const next = !autoGlobal;
    setAutoGlobal(next);
    localStorage.setItem("auto_reminder_global", String(next));
  }

  function toggleAutoClient(clientId: string) {
    const current = autoOverrides[clientId] ?? autoGlobal;
    const next = { ...autoOverrides, [clientId]: !current };
    setAutoOverrides(next);
    localStorage.setItem("auto_reminder_overrides", JSON.stringify(next));
  }

  function getEffectiveAuto(clientId: string): boolean {
    return autoOverrides[clientId] ?? autoGlobal;
  }

  // Auto-génération dès qu'une facture est sélectionnée
  useEffect(() => {
    if (!selectedDocId) return;
    generateAIReminder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId]);

  const overdueInvoices = useMemo(() => {
    return documents.filter((d) => {
      if (d.type !== "facture" || d.status === "paye" || d.status === "annule") return false;
      if (!d.due_date) return false;
      return new Date(d.due_date) < new Date();
    });
  }, [documents]);

  function getClientName(clientId: string): string {
    const c = clients.find((cl) => cl.id === clientId);
    if (!c) return "Inconnu";
    return c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  }

  function getDaysOverdue(dueDate: string): number {
    return Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  async function generateAIReminder() {
    const doc = documents.find((d) => d.id === selectedDocId);
    if (!doc) return;
    setGenerating(true);

    const clientName = getClientName(doc.client_id);
    const days = doc.due_date ? getDaysOverdue(doc.due_date) : 0;
    const existingReminders = reminders.filter((r) => r.document_id === doc.id).length;

    try {
      const response = await fetch("/api/ai-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docNumber: doc.number,
          amount: doc.total_ttc,
          clientName,
          daysOverdue: days,
          existingRemindersCount: existingReminders,
          channel,
        }),
      });

      if (!response.ok) throw new Error("Erreur API");
      const data = await response.json();
      setContent(data.content);
    } catch {
      // Fallback sur les templates si l'IA est indisponible
      let tone = "amical";
      if (existingReminders >= 2) tone = "mise en demeure";
      else if (existingReminders >= 1) tone = "ferme";

      const templates = {
        amical: `Bonjour ${clientName},\n\nNous nous permettons de vous rappeler que la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} est arrivée à échéance depuis ${days} jour(s).\n\nNous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,`,
        ferme: `${clientName},\n\nMalgré notre précédent rappel, la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} reste impayée avec un retard de ${days} jours.\n\nNous vous demandons de régulariser cette situation sous 8 jours.\n\nSans réponse de votre part, nous serons contraints d'engager des démarches de recouvrement.\n\nCordialement,`,
        "mise en demeure": `MISE EN DEMEURE\n\n${clientName},\n\nLa facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} demeure impayée malgré nos ${existingReminders} relances précédentes (retard : ${days} jours).\n\nConformément aux articles L.441-10 et suivants du Code de commerce, nous vous mettons en demeure de régler cette somme sous 8 jours.\n\nÀ défaut, des pénalités de retard seront appliquées conformément à nos CGV, et le dossier sera transmis à notre service contentieux.\n\nCordialement,`,
      };

      setContent(templates[tone as keyof typeof templates] || templates.amical);
    } finally {
      setPriority(existingReminders >= 2 ? "critical" : existingReminders >= 1 ? "high" : "medium");
      setGenerating(false);
    }
  }

  async function handleCreateReminder() {
    if (!selectedDocId || !content) return;
    const payload = { document_id: selectedDocId, channel, priority, content, ai_generated: true };
    try {
      await saveReminderDB(payload);
      await refreshReminders();
    } catch {
      saveReminderLS(payload);
    }
    setShowCreate(false);
    setContent("");
    setSelectedDocId("");
  }

  async function quickCreateReminder(doc: Doc) {
    const existingCount = reminders.filter(r => r.document_id === doc.id).length;
    const tone = AUTO_TONES[Math.min(existingCount, AUTO_TONES.length - 1)];
    const clientName = getClientName(doc.client_id);
    const days = doc.due_date ? getDaysOverdue(doc.due_date) : 0;
    const templates: Record<string, string> = {
      amical: `Bonjour ${clientName},\n\nNous nous permettons de vous rappeler que la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} est arrivée à échéance depuis ${days} jour(s).\n\nNous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,`,
      ferme: `${clientName},\n\nMalgré notre précédent rappel, la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} reste impayée avec un retard de ${days} jours.\n\nNous vous demandons de régulariser cette situation sous 8 jours.\n\nCordialement,`,
      "mise en demeure": `MISE EN DEMEURE\n\n${clientName},\n\nLa facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} demeure impayée malgré nos ${existingCount} relances précédentes (retard : ${days} jours).\n\nNous vous mettons en demeure de régler cette somme sous 8 jours.\n\nCordialement,`,
    };
    const nextPriority = existingCount >= 2 ? "critical" as const : existingCount >= 1 ? "high" as const : "medium" as const;
    const payload = { document_id: doc.id, channel: "email" as const, priority: nextPriority, content: templates[tone] ?? templates.amical, ai_generated: false };
    try { await saveReminderDB(payload); await refreshReminders(); }
    catch { saveReminderLS(payload); }
  }

  async function markSent(reminder: Reminder) {
    setReminders((prev) =>
      prev.map((r) => r.id === reminder.id ? { ...r, sent_at: new Date().toISOString() } : r)
    );
    try {
      await markReminderSent(reminder.id);
    } catch {
      const all = getRemindersLS();
      const idx = all.findIndex((r) => r.id === reminder.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], sent_at: new Date().toISOString() };
        saveReminderLS(all[idx]);
      }
    }

    // Auto-relance si activée pour ce client
    const doc = documents.find((d) => d.id === reminder.document_id);
    if (!doc) return;
    if (!getEffectiveAuto(doc.client_id)) return;

    const existingCount = reminders.filter((r) => r.document_id === doc.id).length;

    // Stop si max atteint
    if (existingCount >= autoDelays.length) return;

    const delay = nextDelayOverrides[reminder.id] ?? autoDelays[existingCount] ?? autoDelays[autoDelays.length - 1];
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + delay);

    const clientName = getClientName(doc.client_id);
    const days = doc.due_date ? getDaysOverdue(doc.due_date) : 0;
    const tone = (nextToneOverrides[reminder.id] as Tone | undefined) ?? AUTO_TONES[Math.min(existingCount, AUTO_TONES.length - 1)];

    const templates: Record<string, string> = {
      amical: `Bonjour ${clientName},\n\nNous nous permettons de vous rappeler que la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} est arrivée à échéance depuis ${days} jour(s).\n\nNous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,`,
      ferme: `${clientName},\n\nMalgré notre précédent rappel, la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} reste impayée avec un retard de ${days} jours.\n\nNous vous demandons de régulariser cette situation sous 8 jours.\n\nSans réponse de votre part, nous serons contraints d'engager des démarches de recouvrement.\n\nCordialement,`,
      "mise en demeure": `MISE EN DEMEURE\n\n${clientName},\n\nLa facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} demeure impayée malgré nos ${existingCount} relances précédentes (retard : ${days} jours).\n\nConformément aux articles L.441-10 et suivants du Code de commerce, nous vous mettons en demeure de régler cette somme sous 8 jours.\n\nÀ défaut, des pénalités de retard seront appliquées.\n\nCordialement,`,
    };

    const nextPriority = existingCount >= 2 ? "critical" as const : existingCount >= 1 ? "high" as const : "medium" as const;
    const payload = {
      document_id: doc.id,
      channel: reminder.channel,
      priority: nextPriority,
      content: templates[tone] ?? templates.amical,
      ai_generated: false,
      scheduled_for: scheduledDate.toISOString().split("T")[0],
    };

    try {
      await saveReminderDB(payload);
      await refreshReminders();
    } catch {
      saveReminderLS(payload);
    }

    const toneLabel = { amical: "Rappel amical", ferme: "Relance ferme", "mise en demeure": "Mise en demeure" }[tone] ?? tone;
    setAutoNextMsg(`${toneLabel} programmée pour le ${scheduledDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`);
    setTimeout(() => setAutoNextMsg(null), 6000);
  }

  return (
    <PageTransition>
      <Topbar title="Relances" subtitle={`${overdueInvoices.length} facture${overdueInvoices.length > 1 ? "s" : ""} en retard`} />
      <div className="p-6 space-y-6">
        {/* Confirmation auto-relance programmée */}
        {autoNextMsg && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gold-400/8 border border-gold-400/20">
            <Clock className="w-4 h-4 text-gold-400 flex-shrink-0" />
            <p className="text-sm font-sans text-gold-400">
              Prochaine relance programmée automatiquement pour le <span className="font-semibold">{autoNextMsg}</span>
            </p>
          </div>
        )}

        {/* ── Cadence Sam ── */}
        <GlassCard hover={false}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-gold-400" />
                <p className="text-sm font-sans font-semibold text-white">Cadence de relances automatiques</p>
                <button
                  onClick={toggleAutoGlobal}
                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ml-auto ${autoGlobal ? "bg-gold-400" : "bg-atlantic-600/60"}`}
                >
                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${autoGlobal ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <span className={`text-xs font-sans ${autoGlobal ? "text-gold-400" : "text-atlantic-200/40"}`}>{autoGlobal ? "Activé" : "Désactivé"}</span>
              </div>
              <div className="space-y-2">
                {autoDelays.map((delay, i) => {
                  const toneLabel = ["Rappel amical", "Relance ferme", "Mise en demeure"][i] ?? "Relance";
                  const toneColor = ["text-blue-400", "text-amber-400", "text-red-400"][i] ?? "text-atlantic-200/60";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] font-sans text-atlantic-200/30 w-4">{i + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-sans text-atlantic-200/40">J+</span>
                        <input
                          type="number"
                          min={1}
                          max={180}
                          value={delay}
                          onChange={(e) => {
                            const v = Math.max(1, Math.min(180, parseInt(e.target.value) || 1));
                            const next = [...autoDelays];
                            next[i] = v;
                            setAutoDelays(next);
                            localStorage.setItem("auto_reminder_delays", JSON.stringify(next));
                          }}
                          className="w-12 px-1.5 py-0.5 text-xs font-sans font-semibold text-center rounded-md bg-atlantic-700/60 border border-atlantic-500/20 text-white focus:outline-none focus:border-gold-400/40"
                        />
                      </div>
                      <span className={`text-xs font-sans font-medium ${toneColor}`}>{toneLabel}</span>
                      {i > 0 && <span className="text-[10px] font-sans text-atlantic-200/20">depuis étape {i}</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] font-sans text-atlantic-200/25 mt-3">{autoDelays.length} relances maximum · arrêt automatique ensuite</p>
            </div>
          </div>
        </GlassCard>

        {/* Overdue alert bar + liste par client */}
        {overdueInvoices.length > 0 && (
          <GlassCard hover={false} className="border-red-400/15">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm font-sans font-semibold text-red-400">{overdueInvoices.length} facture{overdueInvoices.length > 1 ? "s" : ""} en retard</p>
                  <p className="text-[10px] font-sans text-atlantic-200/40">
                    Total : {formatCurrency(overdueInvoices.reduce((s, d) => s + d.total_ttc, 0))}
                  </p>
                </div>
              </div>
              <PremiumButton size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
                Créer une relance
              </PremiumButton>
            </div>
            <div className="space-y-2">
              {overdueInvoices.map((doc) => {
                const effective = getEffectiveAuto(doc.client_id);
                const isOverride = doc.client_id in autoOverrides;
                const sentCount = reminders.filter(r => r.document_id === doc.id && r.sent_at).length;
                const maxReached = sentCount >= autoDelays.length;
                return (
                  <div key={doc.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border gap-3 ${maxReached ? "bg-red-400/5 border-red-400/15" : "bg-atlantic-800/40 border-atlantic-600/15"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-sans font-medium text-white truncate">
                          {doc.number} — {getClientName(doc.client_id)}
                        </p>
                        {maxReached && (
                          <span className="shrink-0 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 border border-red-400/20">
                            Contentieux
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-sans text-atlantic-200/40">
                        {formatCurrency(doc.total_ttc)} · {getDaysOverdue(doc.due_date!)} j de retard
                        {sentCount > 0 && ` · ${sentCount}/${autoDelays.length} relance${sentCount > 1 ? "s" : ""} envoyée${sentCount > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => { sessionStorage.setItem("open_doc_id", doc.id); router.push("/documents"); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlantic-700/50 border border-atlantic-500/20 text-atlantic-200/60 text-xs font-sans hover:text-white hover:border-atlantic-400/40 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir la facture
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-sans ${effective ? "text-gold-400" : "text-atlantic-200/30"}`}>
                            Auto{isOverride ? " ✱" : ""}
                          </span>
                          <button
                            onClick={() => toggleAutoClient(doc.client_id)}
                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${effective ? "bg-gold-400" : "bg-atlantic-600/60"}`}
                          >
                            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${effective ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                        <button
                          onClick={() => quickCreateReminder(doc)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-400/10 border border-gold-400/20 text-gold-400 text-xs font-sans font-medium hover:bg-gold-400/20 hover:border-gold-400/40 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          Mettre à jour
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {overdueInvoices.some((d) => d.client_id in autoOverrides) && (
              <p className="text-[10px] font-sans text-atlantic-200/30 mt-3">✱ Override individuel — différent du réglage global</p>
            )}
          </GlassCard>
        )}

        {/* Create reminder form */}
        {showCreate && (
          <GlassCard hover={false} glow>
            <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" /> Nouvelle relance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Facture *</label>
                <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} className="premium-input w-full text-sm">
                  <option value="">Sélectionner...</option>
                  {overdueInvoices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.number} - {getClientName(d.client_id)} ({formatCurrency(d.total_ttc)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Canal</label>
                <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="premium-input w-full text-sm">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="appel">Appel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Priorité</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="premium-input w-full text-sm">
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
            </div>

            {selectedDocId && (
              <PremiumButton variant="outline" size="sm" icon={<Brain className="w-4 h-4" />} onClick={generateAIReminder} loading={generating} className="mb-4">
                Générer avec l&apos;IA
              </PremiumButton>
            )}

            <textarea
              placeholder="Contenu de la relance..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="premium-input w-full resize-none text-sm mb-4"
            />

            <div className="flex justify-end gap-2">
              <PremiumButton variant="ghost" onClick={() => { setShowCreate(false); setContent(""); }}>Annuler</PremiumButton>
              <PremiumButton onClick={handleCreateReminder} icon={<Send className="w-4 h-4" />}>Créer la relance</PremiumButton>
            </div>
          </GlassCard>
        )}

        {/* Reminders list */}
        {reminders.length === 0 && !showCreate ? (
          <GlassCard hover={false} className="py-20">
            <div className="text-center">
              <div className="inline-block animate-float">
                <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6 relative">
                  <Bell className="w-10 h-10 text-gold-400/40" />
                </div>
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">Aucune relance</h3>
              <p className="text-sm font-sans text-atlantic-200/40 max-w-md mx-auto">
                {overdueInvoices.length > 0
                  ? "Vous avez des factures en retard. Créez votre première relance."
                  : "Les relances apparaîtront ici quand des factures seront en retard."}
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {reminders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((reminder) => {
              const doc = documents.find((d) => d.id === reminder.document_id);
              const ChannelIcon = CHANNEL_ICONS[reminder.channel] || Mail;

              // Calculs étape — faits ici, hors JSX
              const docReminders = reminders.filter(r => r.document_id === reminder.document_id);
              const stepIndex = docReminders.findIndex(r => r.id === reminder.id);
              const stepNum = stepIndex + 1;
              const nextStepIndex = stepIndex + 1;
              const hasNext = nextStepIndex < autoDelays.length;
              const nextTone = AUTO_TONES[Math.min(nextStepIndex, AUTO_TONES.length - 1)];
              const TONE_LABELS: Record<string, string> = { amical: "Rappel amical", ferme: "Relance ferme", "mise en demeure": "Mise en demeure" };
              const TONE_COLORS: Record<string, string> = { amical: "text-blue-400", ferme: "text-amber-400", "mise en demeure": "text-red-400" };
              const toneLabel = TONE_LABELS[nextTone] ?? nextTone;
              const toneColor = TONE_COLORS[nextTone] ?? "text-atlantic-200/60";
              const effectiveDelay = nextDelayOverrides[reminder.id] ?? autoDelays[nextStepIndex] ?? autoDelays[autoDelays.length - 1];
              const isAutoOn = doc ? getEffectiveAuto(doc.client_id) : false;

              return (
                <GlassCard key={reminder.id} className={`!p-4 ${!reminder.sent_at && reminder.scheduled_for ? "border-gold-400/15" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${!reminder.sent_at && reminder.scheduled_for ? "bg-gold-400/8" : "bg-gold-400/10"}`}>
                      {!reminder.sent_at && reminder.scheduled_for
                        ? <Clock className="w-5 h-5 text-gold-400/60" />
                        : <ChannelIcon className="w-5 h-5 text-gold-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-sans font-medium text-white">
                          {doc ? `${doc.number} - ${getClientName(doc.client_id)}` : "Document"}
                        </p>
                        <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${PRIORITY_COLORS[reminder.priority]}`}>
                          {reminder.priority}
                        </span>
                        {reminder.ai_generated && (
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> IA
                          </span>
                        )}
                        {stepNum > 0 && (
                          <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-atlantic-700/60 text-atlantic-200/40">
                            Relance {stepNum}/{autoDelays.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-sans text-atlantic-200/50 line-clamp-2 whitespace-pre-line">{reminder.content}</p>
                      <p className="text-[10px] font-sans text-atlantic-200/30 mt-1">
                        {new Date(reminder.created_at).toLocaleString("fr-FR")}
                        {reminder.sent_at && " • Envoyée"}
                        {!reminder.sent_at && reminder.scheduled_for && (
                          <span className="text-gold-400/60"> • Programmée le {new Date(reminder.scheduled_for).toLocaleDateString("fr-FR")}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">

                      {/* 1. Voir la facture */}
                      {doc && (
                        <button
                          onClick={() => { sessionStorage.setItem("open_doc_id", doc.id); router.push("/documents"); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlantic-700/50 border border-atlantic-500/20 text-atlantic-200/60 text-xs font-sans hover:text-white hover:border-atlantic-400/40 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Voir la facture
                        </button>
                      )}

                      {/* 2. Auto toggle */}
                      {!reminder.sent_at && doc && (
                        <div className="flex items-center gap-1.5">
                          <Zap className={`w-3 h-3 ${isAutoOn ? "text-gold-400" : "text-atlantic-200/20"}`} />
                          <span className="text-[10px] font-sans text-atlantic-200/40">Auto</span>
                          <button
                            onClick={() => toggleAutoClient(doc.client_id)}
                            className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${isAutoOn ? "bg-gold-400" : "bg-atlantic-600/60"}`}
                          >
                            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${isAutoOn ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </div>
                      )}

                      {/* 3. Badges ton + variateur jours */}
                      {!reminder.sent_at && (
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {AUTO_TONES.map((t) => {
                            const activeTone = nextToneOverrides[reminder.id] ?? nextTone;
                            const isActive = t === activeTone;
                            const c = TONE_COLORS[t];
                            return (
                              <button
                                key={t}
                                onClick={() => setNextToneOverrides(prev => ({ ...prev, [reminder.id]: t }))}
                                className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border transition-colors ${
                                  isActive
                                    ? c === "blue"   ? "bg-blue-400/20 border-blue-400/40 text-blue-300"
                                    : c === "amber"  ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                                    : "bg-red-400/20 border-red-400/40 text-red-300"
                                    : "bg-atlantic-800/40 border-atlantic-600/20 text-atlantic-200/30 hover:text-white hover:border-atlantic-400/30"
                                }`}
                              >
                                {TONE_LABELS[t]}
                              </button>
                            );
                          })}
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={effectiveDelay}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(180, parseInt(e.target.value) || 1));
                              setNextDelayOverrides(prev => ({ ...prev, [reminder.id]: v }));
                            }}
                            className="w-10 px-1 py-0.5 text-[10px] font-sans font-semibold text-center rounded bg-atlantic-700/60 border border-atlantic-500/20 text-white focus:outline-none focus:border-gold-400/40"
                          />
                          <span className="text-[10px] font-sans text-atlantic-200/30">j</span>
                        </div>
                      )}

                      {/* 4. Envoyer / Envoyée */}
                      {!reminder.sent_at ? (
                        <PremiumButton variant="outline" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => markSent(reminder)}>
                          Envoyer
                        </PremiumButton>
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

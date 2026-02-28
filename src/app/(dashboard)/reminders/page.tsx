"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Bell, Brain, Mail, Phone, Plus, Send, Clock, AlertTriangle,
  CheckCircle2, Sparkles, ChevronRight, MessageSquare,
} from "lucide-react";
import {
  saveReminder as saveReminderLS,
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
  const { reminders: ctxReminders, documents, clients, refreshReminders } = useAppContext();
  const [reminders, setReminders] = useState<Reminder[]>(ctxReminders);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "appel">("email");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setReminders(ctxReminders);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxReminders]);

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

  async function markSent(reminder: Reminder) {
    // Mise à jour optimiste immédiate
    setReminders((prev) =>
      prev.map((r) => r.id === reminder.id ? { ...r, sent_at: new Date().toISOString() } : r)
    );
    try {
      await markReminderSent(reminder.id);
    } catch {
      // Fallback localStorage
      const all = getRemindersLS();
      const idx = all.findIndex((r) => r.id === reminder.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], sent_at: new Date().toISOString() };
        saveReminderLS(all[idx]);
      }
    }
  }

  return (
    <PageTransition>
      <Topbar title="Relances" subtitle={`${overdueInvoices.length} facture${overdueInvoices.length > 1 ? "s" : ""} en retard`} />
      <div className="p-6 space-y-6">
        {/* Overdue alert bar */}
        {overdueInvoices.length > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-400/[0.06] border border-red-400/15">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-sans font-medium text-red-400">{overdueInvoices.length} facture{overdueInvoices.length > 1 ? "s" : ""} en retard</p>
              <p className="text-xs font-sans text-atlantic-200/40">
                Total : {formatCurrency(overdueInvoices.reduce((s, d) => s + d.total_ttc, 0))}
              </p>
            </div>
            <PremiumButton size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
              Créer une relance
            </PremiumButton>
          </div>
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
              return (
                <GlassCard key={reminder.id} className="!p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-gold-400/10">
                      <ChannelIcon className="w-5 h-5 text-gold-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
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
                      </div>
                      <p className="text-xs font-sans text-atlantic-200/50 line-clamp-2 whitespace-pre-line">{reminder.content}</p>
                      <p className="text-[10px] font-sans text-atlantic-200/30 mt-1">
                        {new Date(reminder.created_at).toLocaleString("fr-FR")}
                        {reminder.sent_at && " • Envoyée"}
                      </p>
                    </div>
                    {!reminder.sent_at ? (
                      <PremiumButton variant="outline" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => markSent(reminder)}>
                        Envoyer
                      </PremiumButton>
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
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

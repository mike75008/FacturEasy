"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Bell, Brain, Mail, Phone, Plus, Send, Clock, AlertTriangle,
  CheckCircle2, Sparkles, ChevronRight, MessageSquare, Zap, ExternalLink, Search,
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
import { ModeGate } from "@/components/dashboard/mode-gate";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { notifyRelanceSent, notifyContentieux } from "@/lib/notifications";
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
  const [cardToneOverrides, setCardToneOverrides] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [searchOverdue, setSearchOverdue] = useState("");
  const [groupPage, setGroupPage] = useState<Record<string, number>>({});
  const [overdueCurrentPage, setOverdueCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const AUTO_TONES = ["amical", "ferme", "mise en demeure"] as const;
  type Tone = typeof AUTO_TONES[number];
  const TONE_LABELS: Record<string, string> = { amical: "Amical", ferme: "Ferme", "mise en demeure": "Mise en demeure" };
  const TONE_COLORS: Record<string, string> = { amical: "blue", ferme: "amber", "mise en demeure": "red" };
  const TONE_PRIORITY_LABELS: Record<string, string> = { amical: "Basse", ferme: "Moyenne", "mise en demeure": "Haute" };
  const TONE_PRIORITY_COLORS: Record<string, string> = {
    amical: "bg-blue-400/10 text-blue-400",
    ferme: "bg-amber-400/10 text-amber-400",
    "mise en demeure": "bg-red-400/10 text-red-400",
  };
  const TONE_GROUP_COLORS: Record<string, string> = {
    amical: "border-blue-400/20",
    ferme: "border-amber-400/20",
    "mise en demeure": "border-red-400/20",
  };

  // Statut document lisible par type
  const DOC_STATUS_TEXT: Record<string, Record<string, string>> = {
    facture:            { paye: "Payée",       annule: "Annulée",   refuse: "Refusée",   envoye: "Envoyée",      valide: "Validée",    brouillon: "Brouillon" },
    devis:              { paye: "Accepté",     annule: "Annulé",    refuse: "Refusé",    envoye: "Envoyé",       valide: "Validé",     brouillon: "Brouillon" },
    contrat:            { paye: "Signé",       annule: "Annulé",    refuse: "Refusé",    envoye: "Envoyé",       valide: "Validé",     brouillon: "Brouillon" },
    avoir:              { paye: "Remboursé",   annule: "Annulé",    refuse: "Refusé",    envoye: "Envoyé",       valide: "Validé",     brouillon: "Brouillon" },
    bon_livraison:      { paye: "Livré",       annule: "Annulé",    refuse: "Refusé",    envoye: "En livraison", valide: "Validé",     brouillon: "Brouillon" },
    ordre_mission:      { paye: "Terminé",     annule: "Annulé",    refuse: "Refusé",    envoye: "En cours",     valide: "Validé",     brouillon: "Brouillon" },
    fiche_intervention: { paye: "Clôturée",    annule: "Annulée",   refuse: "Refusée",   envoye: "En cours",     valide: "Validée",    brouillon: "Brouillon" },
    bon_commande:       { paye: "Réceptionné", annule: "Annulé",    refuse: "Refusé",    envoye: "Envoyé",       valide: "Validé",     brouillon: "Brouillon" },
    recu:               { paye: "Émis",        annule: "Annulé",    refuse: "Refusé",    envoye: "Envoyé",       valide: "Validé",     brouillon: "Brouillon" },
  };
  const DOC_STATUS_COLORS: Record<string, string> = {
    paye: "bg-emerald-400/10 text-emerald-400",
    annule: "bg-red-400/10 text-red-400",
    refuse: "bg-red-400/10 text-red-400",
    envoye: "bg-amber-400/10 text-amber-400",
    valide: "bg-blue-400/10 text-blue-400",
    brouillon: "bg-atlantic-500/10 text-atlantic-200/40",
  };
  const DOC_VIEW_LABELS: Record<string, string> = {
    facture: "Voir la facture", devis: "Voir le devis", contrat: "Voir le contrat",
    bon_livraison: "Voir le bon de livraison", ordre_mission: "Voir la mission",
    fiche_intervention: "Voir l'intervention", bon_commande: "Voir la commande",
    recu: "Voir le reçu", avoir: "Voir l'avoir",
  };

  useEffect(() => {
    setReminders(ctxReminders);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxReminders]);

  // Reset pagination dès que la recherche change
  useEffect(() => {
    setGroupPage({});
  }, [search]);

  useEffect(() => {
    setOverdueCurrentPage(1);
  }, [searchOverdue]);

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

  // Config par type : seuil en jours avant alerte, label d'action, couleur
  const PENDING_DOC_CONFIG: Record<string, { alertLabel: string; actionLabel: string; thresholdDays: number; color: string }> = {
    devis:              { alertLabel: "Devis en attente de réponse",    actionLabel: "Relancer la validation",  thresholdDays: 7,  color: "border-blue-400/15" },
    contrat:            { alertLabel: "Contrat en attente de signature", actionLabel: "Relancer la signature",   thresholdDays: 14, color: "border-cyan-400/15"  },
    bon_commande:       { alertLabel: "Commande en attente de réception",actionLabel: "Relancer la réception",   thresholdDays: 7,  color: "border-rose-400/15"  },
    ordre_mission:      { alertLabel: "Mission en attente de réponse",   actionLabel: "Relancer l'acceptation",  thresholdDays: 14, color: "border-indigo-400/15" },
    fiche_intervention: { alertLabel: "Intervention en attente de clôture",actionLabel: "Relancer la clôture",  thresholdDays: 3,  color: "border-orange-400/15" },
  };

  const pendingDocs = useMemo(() => {
    const now = Date.now();
    return documents.filter((d) => {
      const cfg = PENDING_DOC_CONFIG[d.type];
      if (!cfg) return false;
      if (d.status === "paye" || d.status === "annule" || d.status === "refuse") return false;
      if (d.status !== "envoye") return false;
      // Devis : expiré si due_date dépassé
      if (d.type === "devis" && d.due_date) return new Date(d.due_date) < new Date();
      // Autres : envoyé depuis > seuil jours
      const ref = new Date(d.created_at).getTime();
      return Math.floor((now - ref) / 86_400_000) >= cfg.thresholdDays;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  function getClientName(clientId: string): string {
    const c = clients.find((cl) => cl.id === clientId);
    if (!c) return "Inconnu";
    return c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  }

  function getDaysOverdue(dueDate: string): number {
    return Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  function getActiveToneForReminder(rem: Reminder): Tone {
    const override = cardToneOverrides[rem.id] as Tone | undefined;
    if (override) return override;
    const docRems = reminders.filter(r => r.document_id === rem.document_id);
    const idx = Math.max(0, docRems.findIndex(r => r.id === rem.id));
    return AUTO_TONES[Math.min(idx, AUTO_TONES.length - 1)];
  }

  function getDaysWaiting(doc: Doc): number {
    const ref = doc.due_date && doc.type === "devis"
      ? doc.due_date
      : doc.created_at;
    return Math.floor((Date.now() - new Date(ref).getTime()) / 86_400_000);
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
    const days = doc.due_date ? getDaysOverdue(doc.due_date) : getDaysWaiting(doc);

    // Templates spécifiques par type de document
    const typeTemplates: Record<string, Record<string, string>> = {
      facture: {
        amical: `Bonjour ${clientName},\n\nNous nous permettons de vous rappeler que la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} est arrivée à échéance depuis ${days} jour(s).\n\nNous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,`,
        ferme: `${clientName},\n\nMalgré notre précédent rappel, la facture ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)} reste impayée avec un retard de ${days} jours.\n\nNous vous demandons de régulariser cette situation sous 8 jours.\n\nCordialement,`,
        "mise en demeure": `MISE EN DEMEURE\n\n${clientName},\n\nLa facture ${doc.number} demeure impayée malgré nos ${existingCount} relances (retard : ${days} jours).\n\nNous vous mettons en demeure de régler ${formatCurrency(doc.total_ttc)} sous 8 jours.\n\nCordialement,`,
      },
      devis: {
        amical: `Bonjour ${clientName},\n\nNous revenons vers vous au sujet du devis ${doc.number} d'un montant de ${formatCurrency(doc.total_ttc)}, resté sans réponse depuis ${days} jour(s).\n\nN'hésitez pas à nous contacter pour toute question ou ajustement.\n\nCordialement,`,
        ferme: `${clientName},\n\nNotre devis ${doc.number} (${formatCurrency(doc.total_ttc)}) est toujours en attente de votre validation après ${days} jours.\n\nMerci de nous confirmer votre décision sous 5 jours afin que nous puissions organiser notre planning.\n\nCordialement,`,
        "mise en demeure": `${clientName},\n\nSans retour de votre part, le devis ${doc.number} sera considéré comme caduc à l'issue d'un délai de 48h.\n\nCordialement,`,
      },
      contrat: {
        amical: `Bonjour ${clientName},\n\nNous vous rappelons que le contrat ${doc.number} est en attente de votre signature depuis ${days} jour(s).\n\nMerci de bien vouloir nous retourner le document signé.\n\nCordialement,`,
        ferme: `${clientName},\n\nLe contrat ${doc.number} reste non signé depuis ${days} jours. Nous vous demandons de le retourner signé sous 8 jours afin de poursuivre notre collaboration.\n\nCordialement,`,
        "mise en demeure": `${clientName},\n\nEn l'absence de signature du contrat ${doc.number} sous 48h, nous serons contraints d'annuler notre engagement et de proposer notre disponibilité à d'autres clients.\n\nCordialement,`,
      },
      bon_commande: {
        amical: `Bonjour ${clientName},\n\nNous revenons vers vous concernant le bon de commande ${doc.number} (${formatCurrency(doc.total_ttc)}), en attente de confirmation de réception depuis ${days} jour(s).\n\nCordialement,`,
        ferme: `${clientName},\n\nLe bon de commande ${doc.number} n'a pas encore été réceptionné après ${days} jours. Merci de confirmer la réception sous 5 jours.\n\nCordialement,`,
        "mise en demeure": `${clientName},\n\nSans confirmation de réception du bon de commande ${doc.number} sous 48h, nous initierons une procédure de litige.\n\nCordialement,`,
      },
      ordre_mission: {
        amical: `Bonjour ${clientName},\n\nNous vous rappelons que l'ordre de mission ${doc.number} est en attente de votre acceptation depuis ${days} jour(s).\n\nCordialement,`,
        ferme: `${clientName},\n\nL'ordre de mission ${doc.number} reste sans acceptation après ${days} jours. Merci de nous confirmer votre accord sous 5 jours.\n\nCordialement,`,
        "mise en demeure": `${clientName},\n\nSans acceptation de l'ordre de mission ${doc.number} sous 48h, nous annulerons la prestation planifiée.\n\nCordialement,`,
      },
      fiche_intervention: {
        amical: `Bonjour ${clientName},\n\nNous revenons vers vous concernant la fiche d'intervention ${doc.number}, en attente de clôture depuis ${days} jour(s).\n\nMerci de nous confirmer la fin des travaux.\n\nCordialement,`,
        ferme: `${clientName},\n\nLa fiche d'intervention ${doc.number} n'a pas été clôturée après ${days} jours. Merci de régulariser la situation sous 48h.\n\nCordialement,`,
        "mise en demeure": `${clientName},\n\nSans clôture de la fiche ${doc.number} sous 24h, nous procéderons à la facturation automatique de la prestation.\n\nCordialement,`,
      },
    };

    const tplSet = typeTemplates[doc.type] ?? typeTemplates.facture;
    const nextPriority = existingCount >= 2 ? "critical" as const : existingCount >= 1 ? "high" as const : "medium" as const;
    const payload = { document_id: doc.id, channel: "email" as const, priority: nextPriority, content: tplSet[tone] ?? tplSet.amical, ai_generated: false };
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

    // Notification relance envoyée
    const docForNotif = documents.find((d) => d.id === reminder.document_id);
    if (docForNotif) {
      const toneForNotif = (cardToneOverrides[reminder.id] as string | undefined) ?? "amical";
      notifyRelanceSent(docForNotif.number, getClientName(docForNotif.client_id), toneForNotif, docForNotif.id);
    }

    // Auto-relance si activée pour ce client
    const doc = documents.find((d) => d.id === reminder.document_id);
    if (!doc) return;
    if (!getEffectiveAuto(doc.client_id)) return;

    const existingCount = reminders.filter((r) => r.document_id === doc.id).length;

    // Stop si max atteint — notification contentieux
    if (existingCount >= autoDelays.length) {
      notifyContentieux(doc.number, getClientName(doc.client_id), doc.id);
      return;
    }

    const delay = nextDelayOverrides[reminder.id] ?? autoDelays[existingCount] ?? autoDelays[autoDelays.length - 1];
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + delay);

    const clientName = getClientName(doc.client_id);
    const days = doc.due_date ? getDaysOverdue(doc.due_date) : 0;
    const tone = (cardToneOverrides[reminder.id] as Tone | undefined) ?? AUTO_TONES[Math.min(existingCount, AUTO_TONES.length - 1)];

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

  // Factures en retard — filtrage + pagination
  const filteredOverdue = searchOverdue.trim()
    ? overdueInvoices.filter(d => {
        const q = searchOverdue.toLowerCase();
        return d.number.toLowerCase().includes(q) || getClientName(d.client_id).toLowerCase().includes(q);
      })
    : overdueInvoices;
  const overdueTotalPages = Math.max(1, Math.ceil(filteredOverdue.length / PAGE_SIZE));
  const overdueVisible = filteredOverdue.slice((overdueCurrentPage - 1) * PAGE_SIZE, overdueCurrentPage * PAGE_SIZE);

  const { overdueTotal } = (() => {
    const now = new Date();
    const overdue = documents.filter(d => d.type === "facture" && d.status !== "paye" && d.status !== "annule" && d.due_date && new Date(d.due_date) < now);
    return { overdueTotal: overdue.reduce((s, d) => s + d.total_ttc, 0) };
  })();

  return (
    <PageTransition>
      <ModeGate
        requiredMode="intermediaire"
        featureName="Relances"
        samMessage={overdueTotal > 0
          ? `Tu as ${overdueInvoices.length} facture${overdueInvoices.length > 1 ? "s" : ""} en retard pour un total de ${overdueTotal.toFixed(2).replace(".", ",")}€. Les relances automatiques règlent ça en général en 48h — c'est dans le plan Pro. Voici ce que ça ferait sur tes factures à toi.`
          : "Les relances automatiques te permettent de récupérer tes paiements sans y penser. Sam envoie le bon message au bon moment — c'est dans le plan Pro."
        }
        benefits={[
          "Relances automatiques par email au bon moment",
          "Sam choisit le ton selon le client et le retard",
          "Historique complet des relances envoyées",
          "Relances manuelles par email, SMS ou appel",
        ]}
      >
      <Topbar title="Relances" subtitle={`${overdueInvoices.length} facture${overdueInvoices.length > 1 ? "s" : ""} en retard${pendingDocs.length > 0 ? ` · ${pendingDocs.length} document${pendingDocs.length > 1 ? "s" : ""} en attente` : ""}`} />
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
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
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
            {/* Recherche factures en retard */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-atlantic-200/30 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher une facture ou un client…"
                value={searchOverdue}
                onChange={(e) => setSearchOverdue(e.target.value)}
                className="w-full pl-8 pr-4 py-2 rounded-lg bg-atlantic-800/50 border border-atlantic-600/20 text-xs font-sans text-white placeholder-atlantic-200/30 focus:outline-none focus:border-red-400/30 transition-colors"
              />
            </div>
            <div className="space-y-2">
              {overdueVisible.map((doc) => {
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
            {/* Pagination factures en retard */}
            <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-atlantic-600/10">
              <button
                onClick={() => setOverdueCurrentPage(p => p - 1)}
                disabled={overdueCurrentPage === 1}
                className="px-2.5 py-1 rounded-lg text-[11px] font-sans text-atlantic-200/40 hover:text-white border border-atlantic-600/15 hover:border-atlantic-400/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              >←</button>
              {Array.from({ length: overdueTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setOverdueCurrentPage(page)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-sans border transition-colors ${
                    page === overdueCurrentPage
                      ? "bg-red-400/15 border-red-400/30 text-red-300 font-semibold"
                      : "text-atlantic-200/40 hover:text-white border-atlantic-600/15 hover:border-atlantic-400/30"
                  }`}
                >{page}</button>
              ))}
              <button
                onClick={() => setOverdueCurrentPage(p => p + 1)}
                disabled={overdueCurrentPage >= overdueTotalPages}
                className="px-2.5 py-1 rounded-lg text-[11px] font-sans text-atlantic-200/40 hover:text-white border border-atlantic-600/15 hover:border-atlantic-400/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              >→</button>
            </div>
            {overdueInvoices.some((d) => d.client_id in autoOverrides) && (
              <p className="text-[10px] font-sans text-atlantic-200/30 mt-3">✱ Override individuel — différent du réglage global</p>
            )}
          </GlassCard>
        )}

        {/* ── Documents en attente (hors factures) ── */}
        {pendingDocs.length > 0 && (
          <GlassCard hover={false} className="border-amber-400/15">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-sans font-semibold text-amber-400">{pendingDocs.length} document{pendingDocs.length > 1 ? "s" : ""} en attente</p>
                  <p className="text-[10px] font-sans text-atlantic-200/40">Devis, contrats, commandes, missions non clôturés</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {pendingDocs.map((doc) => {
                const cfg = PENDING_DOC_CONFIG[doc.type];
                const days = getDaysWaiting(doc);
                const sentCount = reminders.filter(r => r.document_id === doc.id && r.sent_at).length;
                const maxReached = sentCount >= autoDelays.length;
                const effective = getEffectiveAuto(doc.client_id);
                const isOverride = doc.client_id in autoOverrides;
                return (
                  <div key={doc.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border gap-3 ${maxReached ? "bg-red-400/5 border-red-400/15" : `bg-atlantic-800/40 ${cfg?.color ?? "border-atlantic-600/15"}`}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-sans font-medium text-white truncate">
                          {doc.number} — {getClientName(doc.client_id)}
                        </p>
                        {maxReached ? (
                          <span className="shrink-0 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 border border-red-400/20">
                            Contentieux
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-sans px-2 py-0.5 rounded-full bg-atlantic-700/60 text-atlantic-200/50">
                            {cfg?.alertLabel ?? doc.type}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-sans text-atlantic-200/40">
                        {formatCurrency(doc.total_ttc)} · {days} j d&apos;attente
                        {sentCount > 0 && ` · ${sentCount}/${autoDelays.length} relance${sentCount > 1 ? "s" : ""} envoyée${sentCount > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button
                        onClick={() => { sessionStorage.setItem("open_doc_id", doc.id); router.push("/documents"); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-atlantic-700/50 border border-atlantic-500/20 text-atlantic-200/60 text-xs font-sans hover:text-white hover:border-atlantic-400/40 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir
                      </button>
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
                        {cfg?.actionLabel ?? "Relancer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {pendingDocs.some((d) => d.client_id in autoOverrides) && (
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

        {/* Barre de recherche */}
        {reminders.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlantic-200/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par client, numéro de document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-atlantic-800/50 border border-atlantic-600/20 text-sm font-sans text-white placeholder-atlantic-200/30 focus:outline-none focus:border-gold-400/30 transition-colors"
            />
          </div>
        )}

        {/* Reminders list — groupés par ton */}
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
          <div className="space-y-4">

            {/* ── 3 groupes tonaux — relances non envoyées ── */}
            {AUTO_TONES.map((groupTone) => {
              const allGroupReminders = reminders
                .filter(r => !r.sent_at && getActiveToneForReminder(r) === groupTone)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              const groupReminders = search.trim()
                ? allGroupReminders.filter(r => {
                    const doc = documents.find(d => d.id === r.document_id);
                    const q = search.toLowerCase();
                    return doc?.number.toLowerCase().includes(q) || getClientName(doc?.client_id ?? "").toLowerCase().includes(q);
                  })
                : allGroupReminders;
              if (groupReminders.length === 0) return null;
              const currentPage = groupPage[groupTone] ?? 1;
              const totalPages = Math.ceil(groupReminders.length / PAGE_SIZE);
              const visibleReminders = groupReminders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              const groupClientIds = [...new Set(groupReminders.map(r => {
                const d = documents.find(doc => doc.id === r.document_id);
                return d?.client_id ?? "";
              }).filter(Boolean))];
              const allAutoOn = groupClientIds.every(id => getEffectiveAuto(id));
              const c = TONE_COLORS[groupTone];

              return (
                <GlassCard key={groupTone} hover={false} className={TONE_GROUP_COLORS[groupTone]}>
                  {/* En-tête groupe */}
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-sans font-semibold px-2.5 py-1 rounded-full border ${
                        c === "blue"  ? "bg-blue-400/15 border-blue-400/30 text-blue-300"
                        : c === "amber" ? "bg-amber-400/15 border-amber-400/30 text-amber-300"
                        : "bg-red-400/15 border-red-400/30 text-red-300"
                      }`}>
                        {TONE_LABELS[groupTone]}
                      </span>
                      <span className="text-xs font-sans text-atlantic-200/40">
                        {groupReminders.length} relance{groupReminders.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Toggle auto de groupe */}
                      <div className="flex items-center gap-1.5">
                        <Zap className={`w-3 h-3 ${allAutoOn ? "text-gold-400" : "text-atlantic-200/20"}`} />
                        <span className="text-[10px] font-sans text-atlantic-200/40">Auto groupe</span>
                        <button
                          onClick={() => groupClientIds.forEach(id => {
                            const current = getEffectiveAuto(id);
                            if (current !== !allAutoOn) toggleAutoClient(id);
                          })}
                          className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${allAutoOn ? "bg-gold-400" : "bg-atlantic-600/60"}`}
                        >
                          <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${allAutoOn ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Cards du groupe */}
                  <div className="space-y-2">
                    {visibleReminders.map((reminder) => {
                      const doc = documents.find((d) => d.id === reminder.document_id);
                      const ChannelIcon = CHANNEL_ICONS[reminder.channel] || Mail;
                      const docReminders = reminders.filter(r => r.document_id === reminder.document_id);
                      const stepIndex = docReminders.findIndex(r => r.id === reminder.id);
                      const nextStepIndex = stepIndex + 1;
                      const activeTone = getActiveToneForReminder(reminder);
                      const activeStepNum = AUTO_TONES.indexOf(activeTone) + 1;
                      const effectiveDelay = nextDelayOverrides[reminder.id] ?? autoDelays[nextStepIndex] ?? autoDelays[autoDelays.length - 1];
                      const isAutoOn = doc ? getEffectiveAuto(doc.client_id) : false;
                      const docStatusText = doc ? (DOC_STATUS_TEXT[doc.type]?.[doc.status] ?? doc.status) : null;
                      const docStatusColor = doc ? (DOC_STATUS_COLORS[doc.status] ?? "") : "";
                      const viewDocLabel = doc ? (DOC_VIEW_LABELS[doc.type] ?? "Voir le document") : "Voir le document";

                      return (
                        <div key={reminder.id} className={`rounded-xl border p-3 ${reminder.scheduled_for ? "bg-gold-400/[0.03] border-gold-400/10" : "bg-atlantic-800/40 border-atlantic-600/15"}`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${reminder.scheduled_for ? "bg-gold-400/8" : "bg-gold-400/10"}`}>
                              {reminder.scheduled_for
                                ? <Clock className="w-4 h-4 text-gold-400/60" />
                                : <ChannelIcon className="w-4 h-4 text-gold-400" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <p className="text-sm font-sans font-medium text-white">
                                  {doc ? `${doc.number} — ${getClientName(doc.client_id)}` : "Document"}
                                </p>
                                {docStatusText && (
                                  <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${docStatusColor}`}>
                                    {docStatusText}
                                  </span>
                                )}
                                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400 flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> IA
                                </span>
                                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-atlantic-700/60 text-atlantic-200/40">
                                  Fermeté {activeStepNum}/{AUTO_TONES.length}
                                </span>
                              </div>
                              <p className="text-xs font-sans text-atlantic-200/50 line-clamp-2 whitespace-pre-line">{reminder.content}</p>
                              <p className="text-[10px] font-sans text-atlantic-200/30 mt-1">
                                {new Date(reminder.created_at).toLocaleString("fr-FR")}
                                {reminder.scheduled_for && (
                                  <span className="text-gold-400/60"> • Programmée le {new Date(reminder.scheduled_for).toLocaleDateString("fr-FR")}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              {doc && (
                                <button
                                  onClick={() => { sessionStorage.setItem("open_doc_id", doc.id); router.push("/documents"); }}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-atlantic-700/50 border border-atlantic-500/20 text-atlantic-200/60 text-xs font-sans hover:text-white hover:border-atlantic-400/40 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {viewDocLabel}
                                </button>
                              )}
                              <div className="flex items-center gap-1.5">
                                <Zap className={`w-3 h-3 ${isAutoOn ? "text-gold-400" : "text-atlantic-200/20"}`} />
                                <span className="text-[10px] font-sans text-atlantic-200/40">Auto</span>
                                <button
                                  onClick={() => doc && toggleAutoClient(doc.client_id)}
                                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${isAutoOn ? "bg-gold-400" : "bg-atlantic-600/60"}`}
                                >
                                  <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${isAutoOn ? "translate-x-4" : "translate-x-0.5"}`} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap justify-end">
                                {AUTO_TONES.map((t) => {
                                  const isActive = t === activeTone;
                                  const tc = TONE_COLORS[t];
                                  return (
                                    <button
                                      key={t}
                                      onClick={() => setCardToneOverrides(prev => ({ ...prev, [reminder.id]: t }))}
                                      className={`text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border transition-colors ${
                                        isActive
                                          ? tc === "blue"  ? "bg-blue-400/20 border-blue-400/40 text-blue-300"
                                          : tc === "amber" ? "bg-amber-400/20 border-amber-400/40 text-amber-300"
                                          : "bg-red-400/20 border-red-400/40 text-red-300"
                                          : "bg-atlantic-800/40 border-atlantic-600/20 text-atlantic-200/30 hover:text-white hover:border-atlantic-400/30"
                                      }`}
                                    >
                                      {TONE_LABELS[t]}
                                    </button>
                                  );
                                })}
                                <input
                                  type="number" min={1} max={180} value={effectiveDelay}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const v = Math.max(1, Math.min(180, parseInt(e.target.value) || 1));
                                    setNextDelayOverrides(prev => ({ ...prev, [reminder.id]: v }));
                                  }}
                                  className="w-10 px-1 py-0.5 text-[10px] font-sans font-semibold text-center rounded bg-atlantic-700/60 border border-atlantic-500/20 text-white focus:outline-none focus:border-gold-400/40"
                                />
                                <span className="text-[10px] font-sans text-atlantic-200/30">j</span>
                                <PremiumButton variant="outline" size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => markSent(reminder)}>
                                  Envoyer
                                </PremiumButton>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Pagination numérotée — toujours visible */}
                  <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-atlantic-600/10">
                    <button
                      onClick={() => setGroupPage(prev => ({ ...prev, [groupTone]: currentPage - 1 }))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-sans text-atlantic-200/40 hover:text-white border border-atlantic-600/15 hover:border-atlantic-400/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setGroupPage(prev => ({ ...prev, [groupTone]: page }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-sans border transition-colors ${
                          page === currentPage
                            ? "bg-gold-400/15 border-gold-400/30 text-gold-400 font-semibold"
                            : "text-atlantic-200/40 hover:text-white border-atlantic-600/15 hover:border-atlantic-400/30"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setGroupPage(prev => ({ ...prev, [groupTone]: currentPage + 1 }))}
                      disabled={currentPage >= Math.max(1, totalPages)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-sans text-atlantic-200/40 hover:text-white border border-atlantic-600/15 hover:border-atlantic-400/30 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </div>
                </GlassCard>
              );
            })}

            {/* ── Envoyées ── */}
            {reminders.some(r => r.sent_at) && (
              <GlassCard hover={false} className="border-atlantic-600/10">
                <p className="text-xs font-sans font-semibold text-atlantic-200/40 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Envoyées — {reminders.filter(r => r.sent_at).length}
                </p>
                <div className="space-y-2">
                  {reminders
                    .filter(r => {
                      if (!search.trim()) return r.sent_at;
                      const doc = documents.find(d => d.id === r.document_id);
                      const q = search.toLowerCase();
                      return r.sent_at && (doc?.number.toLowerCase().includes(q) || getClientName(doc?.client_id ?? "").toLowerCase().includes(q));
                    })
                    .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime())
                    .map((reminder) => {
                      const doc = documents.find((d) => d.id === reminder.document_id);
                      const docStatusText = doc ? (DOC_STATUS_TEXT[doc.type]?.[doc.status] ?? doc.status) : null;
                      const docStatusColor = doc ? (DOC_STATUS_COLORS[doc.status] ?? "") : "";
                      const viewDocLabel = doc ? (DOC_VIEW_LABELS[doc.type] ?? "Voir le document") : "Voir le document";
                      return (
                        <div key={reminder.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-atlantic-800/20 border border-atlantic-600/10 gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-sans text-atlantic-200/60 truncate">
                                {doc ? `${doc.number} — ${getClientName(doc.client_id)}` : "Document"}
                              </p>
                              <p className="text-[10px] font-sans text-atlantic-200/30">
                                Envoyée le {new Date(reminder.sent_at!).toLocaleDateString("fr-FR")}
                              </p>
                            </div>
                            {docStatusText && (
                              <span className={`shrink-0 text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full ${docStatusColor}`}>
                                {docStatusText}
                              </span>
                            )}
                          </div>
                          {doc && (
                            <button
                              onClick={() => { sessionStorage.setItem("open_doc_id", doc.id); router.push("/documents"); }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-atlantic-700/40 border border-atlantic-500/15 text-atlantic-200/40 text-[10px] font-sans hover:text-white transition-colors flex-shrink-0"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              {viewDocLabel}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>
      </ModeGate>
    </PageTransition>
  );
}

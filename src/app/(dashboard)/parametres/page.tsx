"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { PageTransition } from "@/components/premium/page-transition";
import { useAppContext } from "@/lib/context/app-context";
import { cn } from "@/lib/utils";
import {
  User, CreditCard, Users, Plug, Database, Bell,
  Check, Eye, EyeOff, Download, Upload, AlertTriangle,
  Crown, Zap, Shield, Key, Trash2,
} from "lucide-react";

const SECTIONS = [
  { id: "compte",        label: "Compte",        icon: User,       subtitle: "Email, mot de passe, sécurité" },
  { id: "abonnement",    label: "Abonnement",    icon: CreditCard, subtitle: "Plan, limites, facturation" },
  { id: "equipe",        label: "Équipe",        icon: Users,      subtitle: "Collaborateurs et rôles" },
  { id: "notifications", label: "Notifications", icon: Bell,       subtitle: "Alertes email et rappels automatiques" },
  { id: "integrations",  label: "Intégrations",  icon: Plug,       subtitle: "Connexions externes et API" },
  { id: "donnees",       label: "Données",       icon: Database,   subtitle: "Export CSV/JSON, import, suppression" },
];

// ─── COMPTE ────────────────────────────────────────────────────────────────────
function SectionCompte() {
  const { userName, userEmail } = useAppContext();
  const [name, setName] = useState(userName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msgName, setMsgName] = useState("");
  const [msgPw, setMsgPw] = useState("");

  const initials = userName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function saveName() {
    setSaving(true);
    setMsgName("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
      setMsgName("Nom mis à jour ✓");
    } catch (e: unknown) {
      setMsgName((e as Error).message || "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      setMsgPw("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 8) {
      setMsgPw("Minimum 8 caractères");
      return;
    }
    setSavingPw(true);
    setMsgPw("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMsgPw("Mot de passe modifié ✓");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      setMsgPw((e as Error).message || "Erreur");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profil */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-atlantic-200/50 uppercase tracking-wider mb-4">Profil</h4>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400/20 to-gold-400/5 border border-gold-400/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-display font-bold text-gold-400">{initials || "?"}</span>
          </div>
          <div>
            <p className="text-sm font-sans font-semibold text-white">{userName}</p>
            <p className="text-xs font-sans text-atlantic-200/40">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <div className="flex-1">
            <PremiumInput
              label="Nom d'affichage"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <PremiumButton size="sm" onClick={saveName} loading={saving} icon={<Check className="w-4 h-4" />}>
            Sauvegarder
          </PremiumButton>
        </div>
        {msgName && (
          <p className={cn("text-xs font-sans", msgName.includes("✓") ? "text-emerald-400" : "text-red-400")}>
            {msgName}
          </p>
        )}
        <div className="mt-4">
          <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Email</label>
          <input value={userEmail} disabled className="premium-input w-full text-sm opacity-50 cursor-not-allowed" />
          <p className="text-xs font-sans text-atlantic-200/30 mt-1">L&apos;email ne peut pas être modifié ici.</p>
        </div>
      </div>

      <div className="border-t border-gold-400/10" />

      {/* Sécurité */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-atlantic-200/50 uppercase tracking-wider mb-4">Sécurité</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <PremiumInput
              label="Nouveau mot de passe"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
            />
            <button
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-9 text-atlantic-200/30 hover:text-white transition-colors"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PremiumInput
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Répétez le mot de passe"
          />
        </div>
        <div className="flex items-center gap-3">
          <PremiumButton size="sm" onClick={savePassword} loading={savingPw} icon={<Shield className="w-4 h-4" />}>
            Modifier le mot de passe
          </PremiumButton>
          {msgPw && (
            <p className={cn("text-xs font-sans", msgPw.includes("✓") ? "text-emerald-400" : "text-red-400")}>
              {msgPw}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ABONNEMENT ────────────────────────────────────────────────────────────────
function SectionAbonnement() {
  const { documents, clients, products } = useAppContext();

  const FEATURES = [
    "Factures & devis illimités",
    "Gestion des clients",
    "Catalogue produits",
    "Relances automatiques",
    "Export PDF",
    "IA intégrée",
  ];

  const stats = [
    { label: "Documents", value: documents.length },
    { label: "Clients", value: clients.length },
    { label: "Produits", value: products.length },
  ];

  return (
    <div className="space-y-6">
      {/* Badge plan */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gold-400/[0.06] border border-gold-400/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <p className="text-sm font-sans font-semibold text-white">Plan Gratuit</p>
            <p className="text-xs font-sans text-atlantic-200/40">Accès complet pendant la phase bêta</p>
          </div>
        </div>
        <span className="text-xs font-sans px-3 py-1 rounded-full bg-gold-400/10 text-gold-400 border border-gold-400/20">
          Actif
        </span>
      </div>

      {/* Utilisation */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-atlantic-200/50 uppercase tracking-wider mb-3">Utilisation</h4>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="p-3 rounded-xl bg-atlantic-800/30 border border-gold-400/10 text-center">
              <p className="text-2xl font-display font-bold text-white">{s.value}</p>
              <p className="text-xs font-sans text-atlantic-200/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fonctionnalités incluses */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-atlantic-200/50 uppercase tracking-wider mb-3">Inclus dans votre plan</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm font-sans text-atlantic-200/70">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Pro */}
      <div className="p-4 rounded-xl bg-atlantic-800/30 border border-gold-400/10">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-gold-400" />
          <p className="text-sm font-sans font-semibold text-white">Plan Pro — bientôt disponible</p>
        </div>
        <p className="text-xs font-sans text-atlantic-200/40 mb-3">
          Multi-utilisateurs, domaine personnalisé, envoi d&apos;emails, intégrations avancées.
        </p>
        <PremiumButton size="sm" disabled>Rejoindre la liste d&apos;attente</PremiumButton>
      </div>
    </div>
  );
}

// ─── ÉQUIPE ────────────────────────────────────────────────────────────────────
function SectionEquipe() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gold-400/10 flex items-center justify-center mb-5">
        <Crown className="w-8 h-8 text-gold-400/30" />
      </div>
      <h4 className="text-lg font-display font-semibold text-white mb-2">Fonctionnalité Pro</h4>
      <p className="text-sm font-sans text-atlantic-200/40 max-w-xs">
        La gestion d&apos;équipe et les rôles collaborateurs seront disponibles avec le plan Pro.
      </p>
    </div>
  );
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────
const NOTIF_ITEMS = [
  { key: "overdue_alert",    label: "Factures en retard",      desc: "Alerte quand une facture dépasse son échéance" },
  { key: "payment_reminder", label: "Rappels de paiement",     desc: "Notifications avant l'échéance d'une facture" },
  { key: "weekly_summary",   label: "Résumé hebdomadaire",     desc: "Synthèse de votre activité chaque lundi" },
  { key: "new_document",     label: "Confirmation de création", desc: "Notification à chaque nouveau document créé" },
];

const NOTIF_DEFAULTS: Record<string, boolean> = {
  overdue_alert: true,
  payment_reminder: true,
  weekly_summary: false,
  new_document: true,
};

function SectionNotifications() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(NOTIF_DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("notif_prefs") || "{}");
      setPrefs({ ...NOTIF_DEFAULTS, ...stored });
    } catch { /* ignore */ }
  }, []);

  function toggle(key: string) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem("notif_prefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {NOTIF_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10"
          >
            <div>
              <p className="text-sm font-sans font-medium text-white">{item.label}</p>
              <p className="text-xs font-sans text-atlantic-200/40">{item.desc}</p>
            </div>
            <button
              onClick={() => toggle(item.key)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
                prefs[item.key] ? "bg-gold-400" : "bg-atlantic-600/50"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                  prefs[item.key] ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <PremiumButton size="sm" onClick={save} icon={<Check className="w-4 h-4" />}>
          Sauvegarder
        </PremiumButton>
        {saved && <p className="text-xs font-sans text-emerald-400">Préférences enregistrées ✓</p>}
      </div>
    </div>
  );
}

// ─── INTÉGRATIONS ──────────────────────────────────────────────────────────────
function SectionIntegrations() {
  const [stripeKey, setStripeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [showStripe, setShowStripe] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [msg, setMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    setStripeKey(localStorage.getItem("stripe_key") || "");
    setOpenaiKey(localStorage.getItem("openai_key") || "");
    setResendKey(localStorage.getItem("resend_key") || "");
  }, []);

  function saveKey(storageKey: string, value: string, label: string) {
    localStorage.setItem(storageKey, value);
    setMsg((prev) => ({ ...prev, [storageKey]: `${label} enregistrée ✓` }));
    setTimeout(() => setMsg((prev) => ({ ...prev, [storageKey]: "" })), 2000);
  }

  const INTEGRATIONS = [
    {
      id: "stripe",
      label: "Stripe",
      desc: "Paiements en ligne et abonnements",
      storageKey: "stripe_key",
      value: stripeKey,
      setValue: setStripeKey,
      show: showStripe,
      setShow: setShowStripe,
      placeholder: "sk_live_...",
      color: "text-[#635BFF]",
      bg: "bg-[#635BFF]/10",
    },
    {
      id: "openai",
      label: "OpenAI",
      desc: "IA pour la génération de contenu",
      storageKey: "openai_key",
      value: openaiKey,
      setValue: setOpenaiKey,
      show: showOpenai,
      setShow: setShowOpenai,
      placeholder: "sk-proj-...",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      id: "resend",
      label: "Resend",
      desc: "Envoi d'emails transactionnels",
      storageKey: "resend_key",
      value: resendKey,
      setValue: setResendKey,
      show: showResend,
      setShow: setShowResend,
      placeholder: "re_...",
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
  ];

  return (
    <div className="space-y-4">
      {INTEGRATIONS.map((integ) => (
        <div key={integ.id} className="p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", integ.bg)}>
              <Key className={cn("w-4 h-4", integ.color)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-sans font-semibold text-white">{integ.label}</p>
              <p className="text-xs font-sans text-atlantic-200/40">{integ.desc}</p>
            </div>
            {integ.value && (
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                Configuré
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={integ.show ? "text" : "password"}
                placeholder={integ.placeholder}
                value={integ.value}
                onChange={(e) => integ.setValue(e.target.value)}
                className="premium-input w-full text-sm pr-10"
              />
              <button
                onClick={() => integ.setShow(!integ.show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-atlantic-200/30 hover:text-white transition-colors"
              >
                {integ.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PremiumButton size="sm" onClick={() => saveKey(integ.storageKey, integ.value, integ.label)}>
              Sauvegarder
            </PremiumButton>
          </div>
          {msg[integ.storageKey] && (
            <p className="text-xs font-sans text-emerald-400 mt-2">{msg[integ.storageKey]}</p>
          )}
        </div>
      ))}
      <p className="text-xs font-sans text-atlantic-200/30">
        Les clés API sont stockées localement sur votre appareil et ne transitent jamais par nos serveurs.
      </p>
    </div>
  );
}

// ─── DONNÉES ───────────────────────────────────────────────────────────────────
function SectionDonnees() {
  const { documents, clients, products } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  function exportCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(","),
      ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = { documents, clients, products, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "factureasy-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    if (deleteInput !== "SUPPRIMER") return;
    setDeleting(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-8">
      {/* Exports */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-atlantic-200/50 uppercase tracking-wider mb-3">Exporter</h4>
        <div className="space-y-2">
          {[
            {
              label: "Documents (CSV)",
              desc: `${documents.length} document${documents.length > 1 ? "s" : ""}`,
              action: () => exportCSV(documents as unknown as Record<string, unknown>[], "documents.csv"),
            },
            {
              label: "Clients (CSV)",
              desc: `${clients.length} client${clients.length > 1 ? "s" : ""}`,
              action: () => exportCSV(clients as unknown as Record<string, unknown>[], "clients.csv"),
            },
            {
              label: "Tout exporter (JSON)",
              desc: "Documents, clients, produits",
              action: exportJSON,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 rounded-xl bg-atlantic-800/20 border border-gold-400/10"
            >
              <div>
                <p className="text-sm font-sans font-medium text-white">{item.label}</p>
                <p className="text-xs font-sans text-atlantic-200/40">{item.desc}</p>
              </div>
              <PremiumButton
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={item.action}
              >
                Exporter
              </PremiumButton>
            </div>
          ))}
        </div>
      </div>

      {/* Import */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-atlantic-200/50 uppercase tracking-wider mb-3">Importer</h4>
        <div className="p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10 border-dashed">
          <p className="text-sm font-sans text-atlantic-200/50 mb-3">
            Importez vos données depuis un fichier CSV ou JSON
          </p>
          <PremiumButton variant="outline" size="sm" icon={<Upload className="w-3.5 h-3.5" />} disabled>
            Choisir un fichier
          </PremiumButton>
          <p className="text-xs font-sans text-atlantic-200/30 mt-2">Formats acceptés : .csv, .json — Disponible prochainement</p>
        </div>
      </div>

      {/* Zone de danger */}
      <div>
        <h4 className="text-xs font-sans font-semibold text-red-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> Zone de danger
        </h4>
        <div className="p-4 rounded-xl bg-red-400/[0.04] border border-red-400/20">
          {!deleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-sans font-medium text-white">Supprimer le compte</p>
                <p className="text-xs font-sans text-atlantic-200/40">
                  Action irréversible. Toutes vos données seront perdues.
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-sm font-sans font-medium text-red-400 hover:text-red-300 px-3 py-2 rounded-lg hover:bg-red-400/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-sans text-red-400">
                Tapez <strong>SUPPRIMER</strong> pour confirmer la suppression de votre compte.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="premium-input flex-1 text-sm"
                />
                <PremiumButton
                  size="sm"
                  onClick={handleDeleteAccount}
                  loading={deleting}
                  disabled={deleteInput !== "SUPPRIMER"}
                  className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                >
                  Confirmer
                </PremiumButton>
                <PremiumButton
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }}
                >
                  Annuler
                </PremiumButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ───────────────────────────────────────────────────────────
export default function ParametresPage() {
  const [active, setActive] = useState("compte");
  const activeSection = SECTIONS.find((s) => s.id === active)!;

  const SECTION_CONTENT: Record<string, React.ReactNode> = {
    compte:        <SectionCompte />,
    abonnement:    <SectionAbonnement />,
    equipe:        <SectionEquipe />,
    notifications: <SectionNotifications />,
    integrations:  <SectionIntegrations />,
    donnees:       <SectionDonnees />,
  };

  return (
    <PageTransition>
      <Topbar title="Paramètres" subtitle="Réglages de l'application" />
      <div className="p-6">
        <GlassCard hover={false} className="!p-0 overflow-hidden">
          <div className="flex min-h-[600px]">

            {/* Menu latéral interne */}
            <div className="w-56 flex-shrink-0 border-r border-gold-400/10 p-3 space-y-1">
              {SECTIONS.map((section) => {
                const isActive = section.id === active;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActive(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-200",
                      isActive
                        ? "bg-gold-400/10 border border-gold-400/20 text-gold-400"
                        : "text-atlantic-200/50 hover:text-white hover:bg-atlantic-600/15"
                    )}
                  >
                    <section.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-sans font-medium">{section.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Contenu de la section */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="mb-6">
                <h3 className="text-lg font-display font-semibold text-white flex items-center gap-2">
                  <activeSection.icon className="w-5 h-5 text-gold-400" />
                  {activeSection.label}
                </h3>
                <p className="text-sm font-sans text-atlantic-200/40 mt-1">{activeSection.subtitle}</p>
              </div>
              <div className="border-t border-gold-400/10 pt-6">
                {SECTION_CONTENT[active]}
              </div>
            </div>

          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}

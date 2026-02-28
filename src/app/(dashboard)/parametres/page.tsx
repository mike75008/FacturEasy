"use client";

import { useState, useEffect, useRef } from "react";
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
  Crown, Zap, Shield, Key, Trash2, Brain, FileSpreadsheet,
  ArrowRight, RotateCcw, CheckCircle2, XCircle,
} from "lucide-react";
import {
  saveClient,
  saveProduct,
} from "@/lib/supabase/data";

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

// ─── IMPORT WIZARD ────────────────────────────────────────────────────────────

type WizardStep = "idle" | "parsing" | "analyzing" | "mapping" | "pdf_records" | "importing" | "done";

interface ParsedFile {
  headers: string[];
  rows: string[][];
  fileName: string;
  isPDF?: boolean;
  pdfText?: string;
}

interface AIMapping {
  entityType: "clients" | "products";
  confidence: number;
  mapping: Record<string, string | null>;
  records?: Record<string, string>[]; // Pour PDF : enregistrements extraits directement
}

interface ImportResult {
  total: number;
  imported: number;
  errors: number;
}

const CLIENT_FIELD_OPTIONS = [
  { value: "", label: "— Ignorer —" },
  { value: "company_name", label: "Nom entreprise" },
  { value: "first_name", label: "Prénom" },
  { value: "last_name", label: "Nom de famille" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Téléphone" },
  { value: "address", label: "Adresse" },
  { value: "city", label: "Ville" },
  { value: "postal_code", label: "Code postal" },
  { value: "country", label: "Pays" },
  { value: "siret", label: "SIRET" },
  { value: "tva_number", label: "N° TVA" },
  { value: "sector", label: "Secteur / Domaine" },
  { value: "notes", label: "Notes" },
];

const PRODUCT_FIELD_OPTIONS = [
  { value: "", label: "— Ignorer —" },
  { value: "name", label: "Nom du produit/service" },
  { value: "description", label: "Description" },
  { value: "unit_price", label: "Prix unitaire HT (€)" },
  { value: "unit", label: "Unité" },
  { value: "tva_rate", label: "Taux TVA (%)" },
  { value: "category", label: "Catégorie" },
];

async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const PDFJS = await import("pdfjs-dist");
    PDFJS.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const buffer = await file.arrayBuffer();
    const pdf = await PDFJS.getDocument({ data: buffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: unknown) => {
          const it = item as { str?: string };
          return it.str ?? "";
        })
        .join(" ");
      fullText += pageText + "\n";
    }
    return { headers: [], rows: [], fileName: file.name, isPDF: true, pdfText: fullText };
  }

  if (ext === "json") {
    const text = await file.text();
    const json = JSON.parse(text);
    let rows: Record<string, unknown>[];
    if (Array.isArray(json)) rows = json;
    else if (json.clients) rows = json.clients;
    else if (json.products) rows = json.products;
    else rows = [json];
    const headers = Object.keys(rows[0] || {});
    return {
      headers,
      rows: rows.map((r) => headers.map((h) => String(r[h] ?? ""))),
      fileName: file.name,
    };
  }

  // xlsx gère Excel (.xlsx, .xls) ET CSV
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  const headers = ((data[0] as unknown[]) || []).map((h) => String(h ?? ""));
  const rows = data.slice(1).map((row) =>
    (row as unknown[]).map((cell) => String(cell ?? ""))
  );
  return { headers, rows, fileName: file.name };
}

function ImportWizard({ onComplete }: { onComplete: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>("idle");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [aiMapping, setAiMapping] = useState<AIMapping | null>(null);
  const [userMapping, setUserMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setStep("parsing");
    try {
      const data = await parseFile(file);
      setParsed(data);
      setStep("analyzing");

      if (data.isPDF) {
        // Flow PDF : extraction directe par l'IA
        const res = await fetch("/api/ai-import-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.pdfText }),
        });
        if (!res.ok) throw new Error("Erreur API PDF");
        const result: AIMapping = await res.json();
        setAiMapping(result);
        setStep("pdf_records");
      } else {
        // Flow Excel/CSV/JSON : mapping de colonnes
        const res = await fetch("/api/ai-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers: data.headers,
            sampleRows: data.rows.slice(0, 3),
          }),
        });
        if (!res.ok) throw new Error("Erreur API");
        const mapping: AIMapping = await res.json();
        setAiMapping(mapping);

        const initial: Record<string, string> = {};
        data.headers.forEach((h) => {
          initial[h] = mapping.mapping[h] ?? "";
        });
        setUserMapping(initial);
        setStep("mapping");
      }
    } catch (e: unknown) {
      setError((e as Error).message || "Erreur lors de l'analyse");
      setStep("idle");
    }
  }

  async function handleImport(pdfRecords?: Record<string, string>[]) {
    if (!parsed || !aiMapping) return;
    setStep("importing");
    let imported = 0;
    let errors = 0;

    const records = pdfRecords ?? null;

    if (records) {
      // Flow PDF : importer les enregistrements extraits par l'IA
      for (const record of records) {
        try {
          const r: Record<string, unknown> = { ...record };
          if (aiMapping.entityType === "clients") {
            await saveClient(r as Parameters<typeof saveClient>[0]);
          } else {
            if (r.unit_price) r.unit_price = parseFloat(String(r.unit_price)) || 0;
            if (r.tva_rate) r.tva_rate = parseFloat(String(r.tva_rate)) || 20;
            await saveProduct(r as Parameters<typeof saveProduct>[0]);
          }
          imported++;
        } catch {
          errors++;
        }
      }
      setResult({ total: records.length, imported, errors });
    } else {
      // Flow Excel/CSV : importer via le mapping de colonnes
      for (const row of parsed.rows) {
        if (row.every((cell) => !cell.trim())) continue;
        try {
          const record: Record<string, unknown> = {};
          parsed.headers.forEach((header, i) => {
            const target = userMapping[header];
            if (target) record[target] = row[i] ?? "";
          });
          if (aiMapping.entityType === "clients") {
            await saveClient(record as Parameters<typeof saveClient>[0]);
          } else {
            if (record.unit_price) record.unit_price = parseFloat(String(record.unit_price)) || 0;
            if (record.tva_rate) record.tva_rate = parseFloat(String(record.tva_rate)) || 20;
            await saveProduct(record as Parameters<typeof saveProduct>[0]);
          }
          imported++;
        } catch {
          errors++;
        }
      }
      setResult({ total: parsed.rows.length, imported, errors });
    }

    setStep("done");
    onComplete();
  }

  const fieldOptions = aiMapping?.entityType === "products" ? PRODUCT_FIELD_OPTIONS : CLIENT_FIELD_OPTIONS;

  if (step === "idle") {
    return (
      <div className="p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10 border-dashed">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-gold-400" />
          </div>
          <div>
            <p className="text-sm font-sans font-medium text-white">Importer depuis un fichier</p>
            <p className="text-xs font-sans text-atlantic-200/40">Excel (.xlsx, .xls), CSV, JSON, PDF — L&apos;IA détecte et structure vos données automatiquement</p>
          </div>
        </div>
        {error && <p className="text-xs font-sans text-red-400 mb-3">{error}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.json,.pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <PremiumButton size="sm" icon={<Upload className="w-3.5 h-3.5" />} onClick={() => fileInputRef.current?.click()}>
          Choisir un fichier
        </PremiumButton>
      </div>
    );
  }

  if (step === "parsing" || step === "analyzing") {
    return (
      <div className="p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
          <p className="text-sm font-sans text-atlantic-200/60">
            {step === "parsing" ? "Lecture du fichier..." : "Analyse IA en cours..."}
          </p>
        </div>
        {step === "analyzing" && parsed && (
          <p className="text-xs font-sans text-atlantic-200/30 mt-2 ml-9">
            {parsed.rows.length} lignes détectées dans {parsed.fileName}
          </p>
        )}
      </div>
    );
  }

  if (step === "mapping" && parsed && aiMapping) {
    const entityLabel = aiMapping.entityType === "clients" ? "clients" : "produits";
    return (
      <div className="space-y-4">
        {/* En-tête résultat IA */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/20">
          <Brain className="w-4 h-4 text-gold-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-sans font-medium text-white">
              Fichier détecté : <span className="text-gold-400">{entityLabel}</span>
              <span className="text-atlantic-200/40 text-xs ml-2">({parsed.rows.length} lignes • {Math.round(aiMapping.confidence * 100)}% de confiance)</span>
            </p>
            <p className="text-xs font-sans text-atlantic-200/40">Vérifiez et ajustez la correspondance des colonnes</p>
          </div>
          <button onClick={() => { setStep("idle"); setParsed(null); setAiMapping(null); }} className="text-atlantic-200/30 hover:text-white transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Table de mapping */}
        <div className="space-y-2">
          {parsed.headers.map((header) => (
            <div key={header} className="flex items-center gap-3 p-3 rounded-lg bg-atlantic-800/20 border border-gold-400/5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans font-medium text-white truncate">{header}</p>
                <p className="text-xs font-sans text-atlantic-200/30 truncate">
                  ex: {parsed.rows[0]?.[parsed.headers.indexOf(header)] || "—"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gold-400/30 flex-shrink-0" />
              <select
                value={userMapping[header] ?? ""}
                onChange={(e) => setUserMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                className="premium-input text-sm w-52 flex-shrink-0"
              >
                {fieldOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <PremiumButton onClick={handleImport} icon={<Check className="w-4 h-4" />}>
            Importer {parsed.rows.length} lignes
          </PremiumButton>
          <PremiumButton variant="ghost" onClick={() => { setStep("idle"); setParsed(null); setAiMapping(null); }}>
            Annuler
          </PremiumButton>
        </div>
      </div>
    );
  }

  if (step === "pdf_records" && aiMapping?.records) {
    const records = aiMapping.records;
    const entityLabel = aiMapping.entityType === "clients" ? "clients" : "produits";
    const previewFields = Object.keys(records[0] || {}).slice(0, 4);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/20">
          <Brain className="w-4 h-4 text-gold-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-sans font-medium text-white">
              PDF analysé : <span className="text-gold-400">{records.length} {entityLabel} extraits</span>
              <span className="text-atlantic-200/40 text-xs ml-2">({Math.round(aiMapping.confidence * 100)}% de confiance)</span>
            </p>
            <p className="text-xs font-sans text-atlantic-200/40">Vérifiez les données extraites avant d&apos;importer</p>
          </div>
          <button onClick={() => { setStep("idle"); setParsed(null); setAiMapping(null); }} className="text-atlantic-200/30 hover:text-white transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Aperçu des enregistrements */}
        <div className="rounded-xl border border-gold-400/10 overflow-hidden">
          <div className="grid bg-atlantic-800/40 border-b border-gold-400/10 px-3 py-2" style={{ gridTemplateColumns: `repeat(${previewFields.length}, 1fr)` }}>
            {previewFields.map((f) => (
              <p key={f} className="text-xs font-sans font-semibold text-gold-400/70 uppercase tracking-wider truncate">{f.replace(/_/g, " ")}</p>
            ))}
          </div>
          {records.slice(0, 5).map((rec, i) => (
            <div key={i} className="grid px-3 py-2 border-b border-gold-400/5 last:border-0 hover:bg-atlantic-800/20 transition-colors" style={{ gridTemplateColumns: `repeat(${previewFields.length}, 1fr)` }}>
              {previewFields.map((f) => (
                <p key={f} className="text-xs font-sans text-atlantic-200/70 truncate pr-2">{rec[f] || "—"}</p>
              ))}
            </div>
          ))}
          {records.length > 5 && (
            <div className="px-3 py-2 text-center">
              <p className="text-xs font-sans text-atlantic-200/30">+ {records.length - 5} autre{records.length - 5 > 1 ? "s" : ""} enregistrement{records.length - 5 > 1 ? "s" : ""}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <PremiumButton onClick={() => handleImport(records)} icon={<Check className="w-4 h-4" />}>
            Importer {records.length} {entityLabel}
          </PremiumButton>
          <PremiumButton variant="ghost" onClick={() => { setStep("idle"); setParsed(null); setAiMapping(null); }}>
            Annuler
          </PremiumButton>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin" />
          <p className="text-sm font-sans text-atlantic-200/60">Import en cours...</p>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    return (
      <div className="p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/10 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <p className="text-sm font-sans font-semibold text-white">Import terminé</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-atlantic-800/30">
            <p className="text-xl font-display font-bold text-white">{result.total}</p>
            <p className="text-xs font-sans text-atlantic-200/40">Total</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
            <p className="text-xl font-display font-bold text-emerald-400">{result.imported}</p>
            <p className="text-xs font-sans text-atlantic-200/40">Importés</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-400/5 border border-red-400/10">
            <p className="text-xl font-display font-bold text-red-400">{result.errors}</p>
            <p className="text-xs font-sans text-atlantic-200/40">Erreurs</p>
          </div>
        </div>
        {result.errors > 0 && (
          <div className="flex items-center gap-2 text-xs font-sans text-red-400/70">
            <XCircle className="w-3.5 h-3.5" />
            Certaines lignes n&apos;ont pas pu être importées (doublons ou données invalides)
          </div>
        )}
        <PremiumButton variant="outline" size="sm" onClick={() => { setStep("idle"); setResult(null); }}>
          Fermer
        </PremiumButton>
      </div>
    );
  }

  return null;
}

// ─── DONNÉES ───────────────────────────────────────────────────────────────────
function SectionDonnees() {
  const { documents, clients, products, refreshClients, refreshProducts } = useAppContext();

  function handleImportComplete() {
    refreshClients();
    refreshProducts();
  }
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
        <ImportWizard onComplete={handleImportComplete} />
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

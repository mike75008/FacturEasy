"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumInput } from "@/components/premium/premium-input";
import { PremiumButton } from "@/components/premium/premium-button";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Building2,
  CreditCard,
  FileDigit,
  Save,
  Camera,
  Check,
  X,
} from "lucide-react";
import {
  getLogo, saveLogo,
  getOrganization as getOrgLS,
  getSequences as getSeqLS,
  saveOrganization as saveOrgLS,
  updateSequencePrefix as updateSeqPrefixLS,
} from "@/lib/local-storage";
import {
  getOrganization as getOrganizationDB,
  saveOrganization as saveOrganizationDB,
  getSequences as getSequencesDB,
  updateSequencePrefix as updateSequencePrefixDB,
} from "@/lib/supabase/data";
import { validateSIRET, validateTVANumber, validateIBAN } from "@/lib/validators";
import type { Organization, NumberingSequence } from "@/types/database";

const tabs = [
  { id: "company" as const, label: "Entreprise", icon: Building2 },
  { id: "banking" as const, label: "Banque", icon: CreditCard },
  { id: "numbering" as const, label: "Numérotation", icon: FileDigit },
];

type TabId = "company" | "banking" | "numbering";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [org, setOrg] = useState<Organization | null>(null);
  const [logo, setLogoState] = useState<string | null>(null);
  const [sequences, setSequences] = useState<NumberingSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [orgData, seqData] = await Promise.all([
          getOrganizationDB(),
          getSequencesDB(),
        ]);
        // Fusion Supabase + localStorage : Supabase prioritaire sauf pour les champs
        // pas encore en DB (ex: regime_tva avant migration SQL).
        const lsOrg = getOrgLS();
        setOrg(orgData ? {
          ...lsOrg,
          ...orgData,
          regime_tva: orgData.regime_tva ?? lsOrg.regime_tva,
        } : lsOrg);
        setSequences(seqData.length > 0 ? seqData : getSeqLS());
        setLogoState(getLogo());
      } catch {
        // Pas authentifié ou erreur réseau → localStorage
        setOrg(getOrgLS());
        setSequences(getSeqLS());
        setLogoState(getLogo());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const updateOrg = useCallback((field: keyof Organization, value: string | number | null) => {
    setHasChanges(true);
    setSaved(false);
    setOrg((prev) => prev ? { ...prev, [field]: value } : prev);
    const newErrors = { ...errors };
    if (field === "siret" && value && typeof value === "string" && value.replace(/\s/g, "").length > 0) {
      if (!validateSIRET(value)) newErrors.siret = "SIRET invalide (14 chiffres, algorithme de Luhn)";
      else delete newErrors.siret;
    } else if (field === "siret") {
      delete newErrors.siret;
    }
    if (field === "tva_number" && value && typeof value === "string" && value.length > 0) {
      if (!validateTVANumber(value)) newErrors.tva_number = "Format: FR + 11 chiffres";
      else delete newErrors.tva_number;
    } else if (field === "tva_number") {
      delete newErrors.tva_number;
    }
    if (field === "rib_iban" && value && typeof value === "string" && value.length > 0) {
      if (!validateIBAN(value)) newErrors.rib_iban = "IBAN invalide";
      else delete newErrors.rib_iban;
    } else if (field === "rib_iban") {
      delete newErrors.rib_iban;
    }
    setErrors(newErrors);
  }, [errors]);

  async function handleSave() {
    if (!org) return;
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      // Tente Supabase, fallback localStorage si pas authentifié
      try {
        await saveOrganizationDB(org);
      } catch {
        saveOrgLS(org);
      }
      setSaved(true);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Le logo ne doit pas dépasser 2 Mo");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      saveLogo(dataUrl);
      setLogoState(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleSequencePrefix(docType: string, prefix: string) {
    const upper = prefix.toUpperCase();
    // Mise à jour optimiste immédiate
    setSequences((prev) =>
      prev.map((s) => s.document_type === docType ? { ...s, prefix: upper } : s)
    );
    try {
      await updateSequencePrefixDB(docType, upper);
    } catch {
      // Pas authentifié → localStorage
      updateSeqPrefixLS(docType, upper);
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <Topbar title="Profil" subtitle="Configuration de votre entreprise" />
        <div className="p-6 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full border-2 border-gold-400/30 border-t-gold-400 animate-spin mx-auto mb-4" />
            <p className="text-sm font-sans text-atlantic-200/40">Chargement...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!org) return null;

  return (
    <PageTransition>
      <Topbar title="Profil" subtitle="Configuration de votre entreprise" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-atlantic-800/30 w-fit mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-sans transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-gold-400 bg-gold-400/10 border border-gold-400/20"
                  : "text-atlantic-200/40 hover:text-white border border-transparent"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ ENTREPRISE ═══ */}
        {activeTab === "company" && (
          <GlassCard hover={false}>
            <h3 className="text-xl font-display font-semibold mb-6">
              Informations entreprise
            </h3>

            {/* Logo */}
            <div className="mb-8">
              <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Logo</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <div
                onClick={() => fileRef.current?.click()}
                className="w-32 h-32 rounded-2xl border-2 border-dashed border-gold-400/20 hover:border-gold-400/40 flex flex-col items-center justify-center cursor-pointer transition-colors bg-atlantic-800/20 group overflow-hidden hover:scale-[1.02]"
              >
                {logo ? (
                  <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gold-400/30 group-hover:text-gold-400/50 transition-colors mb-1" />
                    <span className="text-[10px] font-sans text-atlantic-200/30">Cliquez pour ajouter</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <PremiumInput
                label="Raison sociale *"
                placeholder="Ma Société SAS"
                value={org.name}
                onChange={(e) => updateOrg("name", e.target.value)}
              />
              <PremiumInput
                label="SIRET"
                placeholder="123 456 789 00012"
                value={org.siret || ""}
                onChange={(e) => updateOrg("siret", e.target.value)}
                error={errors.siret}
              />
              <PremiumInput
                label="N° TVA intracommunautaire"
                placeholder="FR12345678901"
                value={org.tva_number || ""}
                onChange={(e) => updateOrg("tva_number", e.target.value)}
                error={errors.tva_number}
              />
              <PremiumInput
                label="Forme juridique"
                placeholder="SAS, SARL, EI..."
                value={org.legal_form || ""}
                onChange={(e) => updateOrg("legal_form", e.target.value)}
              />
              <PremiumInput
                label="Capital social"
                placeholder="10 000 €"
                value={org.capital || ""}
                onChange={(e) => updateOrg("capital", e.target.value)}
              />
              <PremiumInput
                label="RCS"
                placeholder="Paris B 123 456 789"
                value={org.rcs || ""}
                onChange={(e) => updateOrg("rcs", e.target.value)}
              />
              <PremiumInput
                label="Adresse"
                placeholder="123 rue Example"
                value={org.address || ""}
                onChange={(e) => updateOrg("address", e.target.value)}
                className="md:col-span-2"
              />
              <PremiumInput
                label="Code postal"
                placeholder="75001"
                value={org.postal_code || ""}
                onChange={(e) => updateOrg("postal_code", e.target.value)}
              />
              <PremiumInput
                label="Ville"
                placeholder="Paris"
                value={org.city || ""}
                onChange={(e) => updateOrg("city", e.target.value)}
              />
              <PremiumInput
                label="Téléphone"
                placeholder="+33 1 23 45 67 89"
                value={org.phone || ""}
                onChange={(e) => updateOrg("phone", e.target.value)}
              />
              <PremiumInput
                label="Email"
                placeholder="contact@entreprise.fr"
                value={org.email || ""}
                onChange={(e) => updateOrg("email", e.target.value)}
              />
              <PremiumInput
                label="Site web"
                placeholder="https://entreprise.fr"
                value={org.website || ""}
                onChange={(e) => updateOrg("website", e.target.value)}
                className="md:col-span-2"
              />
            </div>

            {/* ── Régime TVA ── */}
            <div className="mt-8 pt-6 border-t border-gold-400/10">
              <h4 className="text-base font-display font-semibold mb-1">Régime TVA</h4>
              <p className="text-xs font-sans text-atlantic-200/40 mb-4">
                Ce réglage adapte automatiquement vos déclarations, mentions légales sur factures et la CA3.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { value: "reel_mensuel",     label: "TVA réelle mensuelle",      desc: "Régime normal — CA3 chaque mois avant le 20",                        color: "border-emerald-400/30 bg-emerald-400/5" },
                  { value: "reel_trimestriel", label: "TVA réelle trimestrielle",  desc: "RSI — CA3 chaque trimestre (T1 → 24 avril, T2 → 24 juillet…)",      color: "border-blue-400/30 bg-blue-400/5" },
                  { value: "franchise_base",   label: "Franchise en base de TVA",  desc: "Auto-entrepreneur — pas de TVA collectée, mention art. 293 B CGI",   color: "border-amber-400/30 bg-amber-400/5" },
                  { value: "exonere",          label: "Exonéré de TVA",            desc: "Professions de santé, enseignement… — mention art. 261 CGI",         color: "border-violet-400/30 bg-violet-400/5" },
                ] as const).map(({ value, label, desc, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateOrg("regime_tva", value)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      org.regime_tva === value
                        ? color + " border-opacity-100"
                        : "border-atlantic-600/20 bg-atlantic-800/20 hover:border-atlantic-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${org.regime_tva === value ? "bg-gold-400 border-gold-400" : "border-atlantic-500/40"}`} />
                      <p className="text-sm font-sans font-semibold text-white">{label}</p>
                    </div>
                    <p className="text-xs font-sans text-atlantic-200/50 ml-5">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              {hasChanges ? (
                <span className="flex items-center gap-1.5 text-sm font-sans text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Modifications non sauvegardées
                </span>
              ) : saved ? (
                <span className="flex items-center gap-1.5 text-sm font-sans text-emerald-400">
                  <Check className="w-4 h-4" /> À jour
                </span>
              ) : null}
              <PremiumButton
                onClick={handleSave}
                loading={saving}
                icon={<Save className="w-4 h-4" />}
                disabled={Object.keys(errors).length > 0}
              >
                Enregistrer
              </PremiumButton>
            </div>
          </GlassCard>
        )}

        {/* ═══ BANQUE ═══ */}
        {activeTab === "banking" && (
          <GlassCard hover={false}>
            <h3 className="text-xl font-display font-semibold mb-6">
              Coordonnées bancaires
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <PremiumInput
                label="Banque"
                placeholder="Nom de la banque"
                value={org.rib_bank || ""}
                onChange={(e) => updateOrg("rib_bank", e.target.value)}
              />
              <PremiumInput
                label="BIC/SWIFT"
                placeholder="BNPAFRPP"
                value={org.rib_bic || ""}
                onChange={(e) => updateOrg("rib_bic", e.target.value)}
              />
              <PremiumInput
                label="IBAN"
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                value={org.rib_iban || ""}
                onChange={(e) => updateOrg("rib_iban", e.target.value)}
                error={errors.rib_iban}
                className="md:col-span-2"
              />
              <PremiumInput
                label="Délai de paiement par défaut (jours)"
                placeholder="30"
                type="number"
                value={String(org.default_payment_terms)}
                onChange={(e) => updateOrg("default_payment_terms", parseInt(e.target.value) || 30)}
              />
              <PremiumInput
                label="Taux TVA par défaut (%)"
                placeholder="20"
                type="number"
                value={String(org.default_tva_rate)}
                onChange={(e) => updateOrg("default_tva_rate", parseFloat(e.target.value) || 20)}
              />
            </div>
            <div className="mt-8 flex items-center justify-end gap-3">
              {hasChanges ? (
                <span className="flex items-center gap-1.5 text-sm font-sans text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Modifications non sauvegardées
                </span>
              ) : saved ? (
                <span className="flex items-center gap-1.5 text-sm font-sans text-emerald-400">
                  <Check className="w-4 h-4" /> À jour
                </span>
              ) : null}
              <PremiumButton
                onClick={handleSave}
                loading={saving}
                icon={<Save className="w-4 h-4" />}
                disabled={Object.keys(errors).length > 0}
              >
                Enregistrer
              </PremiumButton>
            </div>
          </GlassCard>
        )}

        {/* ═══ NUMÉROTATION ═══ */}
        {activeTab === "numbering" && (
          <GlassCard hover={false}>
            <h3 className="text-xl font-display font-semibold mb-2">
              Numérotation des documents
            </h3>
            <p className="text-sm font-sans text-atlantic-200/40 mb-8">
              Numérotation séquentielle sans trou, conforme à la législation française.
              Format : <span className="text-gold-400/60">PREFIXE-ANNÉE-NUMÉRO</span>
            </p>
            <div className="space-y-3">
              {sequences.map((seq) => {
                const colors: Record<string, string> = {
                  facture: "bg-emerald-400",
                  devis: "bg-blue-400",
                  avoir: "bg-amber-400",
                  bon_livraison: "bg-violet-400",
                };
                const labels: Record<string, string> = {
                  facture: "Factures",
                  devis: "Devis",
                  avoir: "Avoirs",
                  bon_livraison: "Bons de livraison",
                };
                return (
                  <div
                    key={seq.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/5 hover:border-gold-400/15 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${colors[seq.document_type] || "bg-gold-400"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-sans font-medium text-white">
                        {labels[seq.document_type] || seq.document_type}
                      </p>
                      <p className="text-xs font-sans text-atlantic-200/30 font-mono">
                        {seq.prefix}-{seq.fiscal_year}-{String(seq.current_number + 1).padStart(5, "0")}
                      </p>
                    </div>
                    <PremiumInput
                      value={seq.prefix}
                      onChange={(e) => handleSequencePrefix(seq.document_type, e.target.value)}
                      className="w-24 text-center text-sm"
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs font-sans text-atlantic-200/30">
              Les préfixes sont sauvegardés automatiquement.
            </p>
          </GlassCard>
        )}
      </div>
    </PageTransition>
  );
}

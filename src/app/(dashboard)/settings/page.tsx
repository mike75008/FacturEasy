"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  getOrganization,
  saveOrganization,
  getLogo,
  saveLogo,
  getSequences,
  updateSequencePrefix,
} from "@/lib/local-storage";
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
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOrg(getOrganization());
    setLogoState(getLogo());
    setSequences(getSequences());
  }, []);

  const updateOrg = useCallback((field: keyof Organization, value: string | number | null) => {
    setOrg((prev) => prev ? { ...prev, [field]: value } : prev);
    // Live validation
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

  function handleSave() {
    if (!org) return;
    if (Object.keys(errors).length > 0) return;
    saveOrganization(org);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  function handleSequencePrefix(docType: string, prefix: string) {
    updateSequencePrefix(docType, prefix.toUpperCase());
    setSequences(getSequences());
  }

  if (!org) return null;

  return (
    <PageTransition>
      <Topbar title="Paramètres" subtitle="Configuration de votre entreprise" />
      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-atlantic-800/30 w-fit mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-sans transition-all duration-200 ${
                activeTab === tab.id
                  ? "text-gold-400"
                  : "text-atlantic-200/40 hover:text-white"
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="settings-tab"
                  className="absolute inset-0 bg-gold-400/10 border border-gold-400/20 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
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
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => fileRef.current?.click()}
                    className="w-32 h-32 rounded-2xl border-2 border-dashed border-gold-400/20 hover:border-gold-400/40 flex flex-col items-center justify-center cursor-pointer transition-colors bg-atlantic-800/20 group overflow-hidden"
                  >
                    {logo ? (
                      <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gold-400/30 group-hover:text-gold-400/50 transition-colors mb-1" />
                        <span className="text-[10px] font-sans text-atlantic-200/30">Cliquez pour ajouter</span>
                      </>
                    )}
                  </motion.div>
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

                <div className="mt-8 flex items-center justify-end gap-3">
                  <AnimatePresence>
                    {saved && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 text-sm font-sans text-emerald-400"
                      >
                        <Check className="w-4 h-4" /> Enregistré
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <PremiumButton
                    onClick={handleSave}
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
                  <AnimatePresence>
                    {saved && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 text-sm font-sans text-emerald-400"
                      >
                        <Check className="w-4 h-4" /> Enregistré
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <PremiumButton
                    onClick={handleSave}
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
                  {sequences.map((seq, i) => {
                    const colors: Record<string, string> = {
                      facture: "text-emerald-400",
                      devis: "text-blue-400",
                      avoir: "text-amber-400",
                      bon_livraison: "text-violet-400",
                    };
                    const labels: Record<string, string> = {
                      facture: "Factures",
                      devis: "Devis",
                      avoir: "Avoirs",
                      bon_livraison: "Bons de livraison",
                    };
                    return (
                      <motion.div
                        key={seq.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-atlantic-800/20 border border-gold-400/5 hover:border-gold-400/15 transition-colors"
                      >
                        <div className={`w-2 h-2 rounded-full ${colors[seq.document_type] || "text-gold-400"}`} />
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
                      </motion.div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs font-sans text-atlantic-200/30">
                  Les préfixes sont sauvegardés automatiquement.
                </p>
              </GlassCard>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

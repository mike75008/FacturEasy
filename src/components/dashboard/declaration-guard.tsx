"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BookOpen, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { useAppContext } from "@/lib/context/app-context";
import {
  getDeclarationsTVADB,
  getOrganization as getOrganizationDB,
} from "@/lib/supabase/data";
import { getOrganization as getOrganizationLS } from "@/lib/local-storage";
import { formatCurrency } from "@/lib/utils";
import type { DeclarationTVA, Document as Doc, Depense, Organization } from "@/types/database";

const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

// Sam intervient 3 jours avant la vraie deadline — notre J0 = J-3 réel
const SAM_ADVANCE = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeclarationType = "tva" | "cfe" | "revenus" | "urssaf_ae" | "is_acompte" | "liasse" | "greffe";

export const ALL_DECL_TYPES: { type: DeclarationType; label: string; external: boolean; companyOnly: boolean }[] = [
  { type: "tva",        label: "TVA",                    external: false, companyOnly: false },
  { type: "cfe",        label: "CFE",                    external: true,  companyOnly: false },
  { type: "revenus",    label: "Revenus",                external: true,  companyOnly: false },
  { type: "urssaf_ae",  label: "URSSAF AE",              external: true,  companyOnly: false },
  { type: "is_acompte", label: "IS — acomptes",          external: true,  companyOnly: true  },
  { type: "liasse",     label: "Liasse fiscale",         external: true,  companyOnly: true  },
  { type: "greffe",     label: "Dépôt greffe / bilan",   external: true,  companyOnly: true  },
];

export interface PendingDecl {
  type: DeclarationType;
  label: string;
  periodKey: string;
  daysLeftReal: number;   // jours avant la vraie deadline fiscale
  daysLeftSam: number;    // daysLeftReal - SAM_ADVANCE (négatif = retard du point de vue Sam)
  solde: number;          // 0 si inconnu
  penaltyRate: number;    // ex: 0.10 pour 10%
  penaltyAmount: number;  // solde * penaltyRate (0 si solde inconnu)
  external: boolean;      // true = se déclare hors appli (impots.gouv.fr)
}

interface AlertInfo {
  level: 0 | 1 | 2;
  decl: PendingDecl | null;
  allPending: PendingDecl[];
  demoType: DeclarationType | null;
  setDemo: (level: 0 | 1 | 2, type?: DeclarationType) => void;
  markDone: (periodKey: string) => void;
}

// ─── localStorage — déclarations validées hors TVA ────────────────────────────

const LS_DONE = "guard_declarations_done";

function getLocalDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LS_DONE) || "[]")); }
  catch { return new Set(); }
}
function saveLocalDone(keys: Set<string>): void {
  localStorage.setItem(LS_DONE, JSON.stringify([...keys]));
}

// ─── Check TVA ────────────────────────────────────────────────────────────────

function checkTVA(
  docs: Doc[], deps: Depense[], org: Organization, tvaDecls: DeclarationTVA[],
): PendingDecl | null {
  const regime = org.regime_tva ?? "reel_mensuel";
  if (regime === "franchise_base" || regime === "exonere") return null;

  const now = new Date();
  let label = "", periodKey = "", deadline: Date;
  let filterFn: (dt: Date) => boolean;
  let alreadyDone = false;

  if (regime === "reel_trimestriel") {
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    const prevQ = currentQ === 1 ? 4 : currentQ - 1;
    const pYear = currentQ === 1 ? now.getFullYear() - 1 : now.getFullYear();
    const qEnd = prevQ * 3;
    deadline = new Date(qEnd === 12 ? now.getFullYear() : pYear, qEnd === 12 ? 0 : qEnd, 24);
    label = `TVA T${prevQ} ${pYear}`;
    periodKey = `tva-${pYear}-T${prevQ}`;
    alreadyDone = tvaDecls.some(d => d.annee === pYear && d.trimestre === prevQ);
    filterFn = (dt) => dt.getFullYear() === pYear && Math.floor(dt.getMonth() / 3) + 1 === prevQ;
  } else {
    const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    deadline = new Date(now.getFullYear(), now.getMonth(), 20);
    label = `TVA ${MONTH_NAMES[pm]} ${py}`;
    periodKey = `tva-${py}-${pm + 1}`;
    alreadyDone = tvaDecls.some(d => d.annee === py && d.mois === pm + 1);
    filterFn = (dt) => dt.getFullYear() === py && dt.getMonth() === pm;
  }

  if (alreadyDone) return null;

  const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  const daysLeftSam = daysLeftReal - SAM_ADVANCE;
  if (daysLeftSam > 7) return null;

  const paidInv = docs.filter(d =>
    d.type === "facture" && d.status === "paye" &&
    filterFn(d.paid_at ? new Date(d.paid_at) : new Date(d.date)));
  const paidAvoir = docs.filter(d =>
    d.type === "avoir" && d.status === "paye" &&
    filterFn(d.paid_at ? new Date(d.paid_at) : new Date(d.date)));
  const periodDeps = deps.filter(d => filterFn(new Date(d.date)));

  const tvaC = paidInv.reduce((s, d) => s + d.total_tva, 0)
    - paidAvoir.reduce((s, d) => s + d.total_tva, 0);
  const tvaD = periodDeps.reduce((s, d) => s + d.montant_tva, 0);
  const solde = Math.max(0, Math.round((tvaC - tvaD) * 100) / 100);
  const penaltyAmount = Math.round(solde * 0.10 * 100) / 100;

  return { type: "tva", label, periodKey, daysLeftReal, daysLeftSam, solde, penaltyRate: 0.10, penaltyAmount, external: false };
}

// ─── Check CFE ────────────────────────────────────────────────────────────────

function checkCFE(localDone: Set<string>): PendingDecl | null {
  const now = new Date();
  const year = now.getFullYear();
  const periodKey = `cfe-${year}`;
  if (localDone.has(periodKey)) return null;

  const deadline = new Date(year, 11, 15); // 15 décembre
  const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  const daysLeftSam = daysLeftReal - SAM_ADVANCE;
  if (daysLeftSam > 7 || daysLeftReal < -60) return null;

  return { type: "cfe", label: `CFE ${year}`, periodKey, daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.10, penaltyAmount: 0, external: true };
}

// ─── Check Déclaration de revenus ─────────────────────────────────────────────

function checkRevenus(localDone: Set<string>): PendingDecl | null {
  const now = new Date();
  const year = now.getFullYear();
  const periodKey = `revenus-${year}`;
  if (localDone.has(periodKey)) return null;

  // Deadline simplifiée : 1er juin (zone 1 & 2 — zone 3 c'est fin juin)
  const deadline = new Date(year, 5, 1);

  // Ne pas alerter avant le 1er avril (trop tôt)
  if (now < new Date(year, 3, 1)) return null;

  const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  const daysLeftSam = daysLeftReal - SAM_ADVANCE;
  if (daysLeftSam > 7 || daysLeftReal < -45) return null;

  return { type: "revenus", label: `Déclaration revenus ${year - 1}`, periodKey, daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.10, penaltyAmount: 0, external: true };
}

// ─── Helpers structure ────────────────────────────────────────────────────────

const IS_COMPANY_FORMS = new Set(["sas", "sasu", "sarl", "eurl", "sa", "sca"]);
const FILING_COMPANY_FORMS = new Set(["sas", "sasu", "sarl", "eurl", "sa", "sca", "scs", "snc", "sci"]);

function isISCompany(org: Organization): boolean {
  const lf = (org.legal_form ?? "").toLowerCase().split(/[\s\-–—]/)[0];
  return IS_COMPANY_FORMS.has(lf);
}

function isCompanyWithFilingObligation(org: Organization): boolean {
  const lf = (org.legal_form ?? "").toLowerCase().split(/[\s\-–—]/)[0];
  return FILING_COMPANY_FORMS.has(lf);
}

// ─── Check IS acomptes ────────────────────────────────────────────────────────

function checkISAcomptes(org: Organization, localDone: Set<string>): PendingDecl | null {
  if (!isISCompany(org)) return null;
  const now = new Date();
  const year = now.getFullYear();
  const deadlines = [
    { quarter: 1, deadline: new Date(year, 2, 15) },
    { quarter: 2, deadline: new Date(year, 5, 15) },
    { quarter: 3, deadline: new Date(year, 8, 15) },
    { quarter: 4, deadline: new Date(year, 11, 15) },
  ];
  for (const { quarter, deadline } of deadlines) {
    const periodKey = `is-acompte-${year}-${quarter}`;
    if (localDone.has(periodKey)) continue;
    const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
    const daysLeftSam = daysLeftReal - SAM_ADVANCE;
    if (daysLeftSam > 7 || daysLeftReal < -30) continue;
    return { type: "is_acompte", label: `IS — acompte Q${quarter} ${year}`, periodKey, daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.05, penaltyAmount: 0, external: true };
  }
  return null;
}

// ─── Check Liasse fiscale ─────────────────────────────────────────────────────

function checkLiasse(org: Organization, localDone: Set<string>): PendingDecl | null {
  if (!isCompanyWithFilingObligation(org)) return null;
  const now = new Date();
  const year = now.getFullYear();
  const periodKey = `liasse-${year - 1}`;
  if (localDone.has(periodKey)) return null;
  const deadline = new Date(year, 3, 30); // 30 avril (clôture 31/12)
  if (now < new Date(year, 2, 1)) return null; // Pas d'alerte avant mars
  const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  const daysLeftSam = daysLeftReal - SAM_ADVANCE;
  if (daysLeftSam > 7 || daysLeftReal < -45) return null;
  return { type: "liasse", label: `Liasse fiscale ${year - 1}`, periodKey, daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.05, penaltyAmount: 750, external: true };
}

// ─── Check Dépôt greffe / bilan ───────────────────────────────────────────────

function checkGreffe(org: Organization, localDone: Set<string>): PendingDecl | null {
  if (!isCompanyWithFilingObligation(org)) return null;
  const now = new Date();
  const year = now.getFullYear();
  const periodKey = `greffe-${year - 1}`;
  if (localDone.has(periodKey)) return null;
  const deadline = new Date(year, 6, 31); // 31 juillet
  if (now < new Date(year, 5, 1)) return null; // Pas d'alerte avant juin
  const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  const daysLeftSam = daysLeftReal - SAM_ADVANCE;
  if (daysLeftSam > 7 || daysLeftReal < -60) return null;
  return { type: "greffe", label: `Dépôt comptes ${year - 1} au greffe`, periodKey, daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0, penaltyAmount: 1_500, external: true };
}

// ─── Check URSSAF auto-entrepreneur ───────────────────────────────────────────

function checkURSSAFAE(docs: Doc[], org: Organization, localDone: Set<string>): PendingDecl | null {
  if (org.regime_tva !== "franchise_base") return null;

  const now = new Date();
  const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const periodKey = `urssaf-${py}-${pm + 1}`;
  if (localDone.has(periodKey)) return null;

  // Deadline : dernier jour du mois en cours
  const deadline = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeftReal = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  const daysLeftSam = daysLeftReal - SAM_ADVANCE;
  if (daysLeftSam > 7) return null;

  // Estimation CA HT du mois précédent × 22% (taux services)
  const filterFn = (dt: Date) => dt.getFullYear() === py && dt.getMonth() === pm;
  const caHT = docs
    .filter(d => d.type === "facture" && d.status === "paye" && filterFn(d.paid_at ? new Date(d.paid_at) : new Date(d.date)))
    .reduce((s, d) => s + d.total_ht, 0);
  const solde = Math.round(caHT * 0.22 * 100) / 100;
  const penaltyAmount = Math.round(solde * 0.05 * 100) / 100;

  return { type: "urssaf_ae", label: `URSSAF ${MONTH_NAMES[pm]} ${py}`, periodKey, daysLeftReal, daysLeftSam, solde, penaltyRate: 0.05, penaltyAmount, external: true };
}

// ─── Sélection la plus urgente ────────────────────────────────────────────────

function getMostUrgent(checks: (PendingDecl | null)[]): PendingDecl[] {
  return checks
    .filter((c): c is PendingDecl => c !== null)
    .sort((a, b) => a.daysLeftSam - b.daysLeftSam);
}

function toLevel(decl: PendingDecl | null): 0 | 1 | 2 {
  if (!decl) return 0;
  return decl.daysLeftSam <= 0 ? 2 : 1;
}

// ─── Messages Sam ─────────────────────────────────────────────────────────────

function penaltyLabel(d: PendingDecl, short = false): string {
  if (d.solde > 0 && d.penaltyAmount > 0)
    return short
      ? ` · Si tu rates : +${formatCurrency(d.penaltyAmount)}`
      : ` · Si tu rates : +${formatCurrency(d.penaltyAmount)} de majoration`;
  if (d.penaltyAmount > 0)
    return ` · Amende jusqu'à ${formatCurrency(d.penaltyAmount)} si tu rates`;
  if (d.penaltyRate > 0)
    return ` · Majoration +${Math.round(d.penaltyRate * 100)}% si tu rates`;
  return ` · Injonction tribunal de commerce possible`;
}

function samBannerMsg(d: PendingDecl): string {
  const dReal = d.daysLeftReal;
  const amount = d.solde > 0 ? ` · ${formatCurrency(d.solde)} à verser` : "";
  const penalty = penaltyLabel(d);

  if (dReal <= 0) return `${d.label} — ${Math.abs(dReal)} j de retard${amount}${penalty}`;
  if (dReal === 1) return `${d.label} — demain dernier délai${amount}${penalty}`;
  if (dReal <= 3) return `${d.label} — dans ${dReal} j${amount}${penalty}`;
  return `${d.label} dans ${dReal} j${amount}${penalty}`;
}

function samBlockMsg(d: PendingDecl): string {
  const dSam = d.daysLeftSam;
  const dReal = d.daysLeftReal;
  let withPenalty: string;
  if (d.solde > 0 && d.penaltyAmount > 0) {
    withPenalty = `Si tu ne le fais pas : +${Math.round(d.penaltyRate * 100)}% de majoration, soit ${formatCurrency(d.penaltyAmount)} de plus pour rien — ${formatCurrency(d.solde + d.penaltyAmount)} au lieu de ${formatCurrency(d.solde)}.`;
  } else if (d.penaltyAmount > 0) {
    withPenalty = `Si tu rates la deadline : amende jusqu'à ${formatCurrency(d.penaltyAmount)}.`;
  } else if (d.penaltyRate > 0) {
    withPenalty = `Si tu rates la deadline : majoration de ${Math.round(d.penaltyRate * 100)}% immédiate.`;
  } else {
    withPenalty = `Si tu rates la deadline : injonction du tribunal de commerce.`;
  }

  if (dReal < 0) {
    const jours = Math.abs(dReal);
    return `Franchement, tu abuses là. ${d.label} a ${jours} jour${jours > 1 ? "s" : ""} de retard. ${withPenalty} C'est mon rôle de te protéger. On règle ça maintenant.`;
  }
  if (dReal === 0) return `C'est aujourd'hui dernier délai pour ${d.label}. ${withPenalty} J'ai tout prêt. 30 secondes et c'est réglé.`;
  if (dSam <= 0) return `${d.label}, c'est dans ${dReal} jour${dReal > 1 ? "s" : ""}. ${withPenalty} C'est mon rôle de t'éviter ça. J'ai tout prêt — un clic.`;
  return `${d.label} dans ${dReal} jours. ${withPenalty} C'est mon rôle de t'éviter ça. Allez, on y va.`;
}

// ─── Demo factory ─────────────────────────────────────────────────────────────

function makeDemoDecl(type: DeclarationType, level: 1 | 2): PendingDecl {
  const daysLeftReal = level === 2 ? 2 : 6;
  const daysLeftSam  = level === 2 ? -1 : 3;
  switch (type) {
    case "tva":
      return { type, label: "TVA Février 2026", periodKey: "tva-demo",
        daysLeftReal, daysLeftSam, solde: 1_240, penaltyRate: 0.10,
        penaltyAmount: 124, external: false };
    case "cfe":
      return { type, label: "CFE 2026", periodKey: "cfe-demo",
        daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.10,
        penaltyAmount: 0, external: true };
    case "revenus":
      return { type, label: "Déclaration revenus 2025", periodKey: "revenus-demo",
        daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.10,
        penaltyAmount: 0, external: true };
    case "urssaf_ae":
      return { type, label: "URSSAF Février 2026", periodKey: "urssaf-demo",
        daysLeftReal, daysLeftSam, solde: 847, penaltyRate: 0.05,
        penaltyAmount: Math.round(847 * 0.05 * 100) / 100, external: true };
    case "is_acompte":
      return { type, label: "IS — acompte Q1 2026", periodKey: "is-acompte-demo",
        daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.05,
        penaltyAmount: 0, external: true };
    case "liasse":
      return { type, label: "Liasse fiscale 2025", periodKey: "liasse-demo",
        daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0.05,
        penaltyAmount: 750, external: true };
    case "greffe":
      return { type, label: "Dépôt comptes 2025 au greffe", periodKey: "greffe-demo",
        daysLeftReal, daysLeftSam, solde: 0, penaltyRate: 0,
        penaltyAmount: 1_500, external: true };
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GuardCtx = createContext<AlertInfo>({
  level: 0, decl: null, allPending: [], demoType: null, setDemo: () => {}, markDone: () => {},
});
export function useDeclarationGuard() { return useContext(GuardCtx); }

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DeclarationGuardProvider({ children }: { children: React.ReactNode }) {
  const { documents, depenses, dataLoading } = useAppContext();
  const [org, setOrg] = useState<Organization | null>(null);
  const [tvaDecls, setTvaDecls] = useState<DeclarationTVA[]>([]);
  const [localDone, setLocalDone] = useState<Set<string>>(new Set());
  const [demoLevel, setDemoLevel] = useState<0 | 1 | 2>(0);
  const [demoType, setDemoType] = useState<DeclarationType | null>(null);

  useEffect(() => {
    getDeclarationsTVADB().then(setTvaDecls).catch(() => {});
    getOrganizationDB().then(setOrg).catch(() => setOrg(getOrganizationLS()));
    setLocalDone(getLocalDone());
  }, []);

  const markDone = useCallback((periodKey: string) => {
    setLocalDone((prev) => {
      const next = new Set(prev);
      next.add(periodKey);
      saveLocalDone(next);
      return next;
    });
  }, []);

  const setDemo = useCallback((level: 0 | 1 | 2, type?: DeclarationType) => {
    setDemoLevel(level);
    setDemoType(level > 0 ? (type ?? "tva") : null);
  }, []);

  const { level, decl, allPending } = useMemo(() => {
    if (demoLevel > 0) {
      const type = demoType ?? "tva";
      const demoDecl = makeDemoDecl(type, demoLevel as 1 | 2);
      return { level: demoLevel, decl: demoDecl, allPending: [demoDecl] };
    }

    if (!org || dataLoading) return { level: 0 as const, decl: null, allPending: [] };

    const pending = getMostUrgent([
      checkTVA(documents, depenses, org, tvaDecls),
      checkCFE(localDone),
      checkRevenus(localDone),
      checkURSSAFAE(documents, org, localDone),
      checkISAcomptes(org, localDone),
      checkLiasse(org, localDone),
      checkGreffe(org, localDone),
    ]);

    const top = pending[0] ?? null;
    return { level: toLevel(top), decl: top, allPending: pending };
  }, [documents, depenses, org, tvaDecls, localDone, dataLoading, demoLevel, demoType]);

  return (
    <GuardCtx.Provider value={{ level, decl, allPending, demoType, setDemo, markDone }}>
      {children}
    </GuardCtx.Provider>
  );
}

// ─── Bannière niveau 1 ────────────────────────────────────────────────────────

export function DeclarationBanner() {
  const { level, decl } = useDeclarationGuard();
  if (level !== 1 || !decl) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-400/10 border-b border-amber-400/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm font-sans text-amber-300 truncate">{samBannerMsg(decl)}</span>
      </div>
      <Link
        href="/comptabilite"
        className="flex items-center gap-1.5 text-xs font-sans font-medium text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 transition-colors shrink-0 whitespace-nowrap"
      >
        {decl.external ? "Voir le rappel" : "Déclarer"} <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Écran de blocage niveau 2 ────────────────────────────────────────────────

export function DeclarationBlock({ children }: { children: React.ReactNode }) {
  const { level, decl, markDone } = useDeclarationGuard();
  const pathname = usePathname();
  const isOnCompta = pathname === "/comptabilite";

  if (level === 2 && !isOnCompta && decl) {
    const isLate = decl.daysLeftReal < 0;
    const canMarkExternal = decl.external;

    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] p-8">
        <div className="max-w-lg w-full text-center space-y-6">

          {/* Icône */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto ${isLate ? "bg-red-400/10 border border-red-400/20" : "bg-amber-400/10 border border-amber-400/20"}`}>
            <BookOpen className={`w-9 h-9 ${isLate ? "text-red-400" : "text-amber-400"}`} />
          </div>

          {/* Badge Sam */}
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans border ${isLate ? "bg-red-400/10 border-red-400/20 text-red-400" : "bg-amber-400/10 border-amber-400/20 text-amber-400"}`}>
              Sam · Garde-fou déclaratif
            </div>
            <p className="text-base font-sans text-white/90 leading-relaxed">{samBlockMsg(decl)}</p>
          </div>

          {/* Montant + majoration ou amende */}
          {(decl.solde > 0 || decl.penaltyAmount > 0) && (
            <div className="p-5 rounded-xl bg-atlantic-800/40 border border-gold-400/10">
              {decl.solde > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-sans text-atlantic-200/40 mb-1">À verser</p>
                      <p className="text-2xl font-display font-bold text-gold-400">{formatCurrency(decl.solde)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-sans text-red-400/60 mb-1">Majoration +{Math.round(decl.penaltyRate * 100)}%</p>
                      <p className="text-2xl font-display font-bold text-red-400">+{formatCurrency(decl.penaltyAmount)}</p>
                    </div>
                  </div>
                  <div className="border-t border-gold-400/10 pt-3">
                    <p className="text-xs font-sans text-atlantic-200/40">Si tu ne déclares pas aujourd'hui</p>
                    <p className="text-lg font-display font-semibold text-white/70">{formatCurrency(decl.solde + decl.penaltyAmount)} au lieu de {formatCurrency(decl.solde)}</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-sans text-red-400/60 mb-1">Amende maximale encourûe</p>
                  <p className="text-3xl font-display font-bold text-red-400">{formatCurrency(decl.penaltyAmount)}</p>
                  <p className="text-xs font-sans text-atlantic-200/30 mt-2">Prononcée par le tribunal de commerce si non régularisé</p>
                </div>
              )}
            </div>
          )}

          {/* CTA */}
          {!decl.external ? (
            <Link
              href="/comptabilite"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-atlantic-900 font-sans font-bold text-sm transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Faire ma déclaration {decl.label}
            </Link>
          ) : (
            <div className="space-y-3">
              <a
                href={decl.type === "greffe" ? "https://www.infogreffe.fr" : "https://www.impots.gouv.fr"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-atlantic-900 font-sans font-bold text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {decl.type === "greffe" ? "Déposer sur infogreffe.fr" : "Déclarer sur impots.gouv.fr"}
              </a>
              <button
                onClick={() => markDone(decl.periodKey)}
                className="w-full py-3 rounded-xl border border-gold-400/20 text-gold-400 hover:bg-gold-400/10 font-sans text-sm transition-colors"
              >
                J'ai déclaré, rétablir mon accès
              </button>
            </div>
          )}

          <p className="text-[11px] font-sans text-atlantic-200/20 leading-relaxed">
            L'accès complet est rétabli automatiquement dès que ta déclaration est validée.
          </p>
        </div>
      </div>
    );
  }

  // Niveau 2 sur la page comptabilité : bannière rouge discrète en haut
  if (level === 2 && isOnCompta && decl) {
    return (
      <>
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-2.5 bg-red-400/10 border-b border-red-400/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm font-sans text-red-300 truncate">{samBannerMsg(decl)}</span>
          </div>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}

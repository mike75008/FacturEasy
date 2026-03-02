"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BookOpen, AlertTriangle, ArrowRight } from "lucide-react";
import { useAppContext } from "@/lib/context/app-context";
import {
  getDeclarationsTVADB,
  getOrganization as getOrganizationDB,
} from "@/lib/supabase/data";
import { getOrganization as getOrganizationLS } from "@/lib/local-storage";
import { formatCurrency } from "@/lib/utils";
import type { DeclarationTVA, Document as Doc, Depense, Organization } from "@/types/database";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface AlertInfo {
  level: 0 | 1 | 2;
  periodLabel: string;
  daysLeft: number;
  solde: number;
  bannerMsg: string;
  blockMsg: string;
}

const EMPTY: AlertInfo = {
  level: 0, periodLabel: "", daysLeft: 999, solde: 0, bannerMsg: "", blockMsg: "",
};

function computeAlert(
  docs: Doc[],
  deps: Depense[],
  org: Organization | null,
  decls: DeclarationTVA[],
): AlertInfo {
  const regime = org?.regime_tva ?? "reel_mensuel";
  if (regime === "franchise_base" || regime === "exonere") return EMPTY;

  const now = new Date();
  let periodLabel = "";
  let periodYear = now.getFullYear();
  let deadline: Date;
  let filterFn: (dt: Date) => boolean;
  let alreadyDone = false;

  if (regime === "reel_trimestriel") {
    const currentQ = Math.floor(now.getMonth() / 3) + 1;
    const prevQ = currentQ === 1 ? 4 : currentQ - 1;
    periodYear = currentQ === 1 ? now.getFullYear() - 1 : now.getFullYear();
    const qEndMonth = prevQ * 3;
    deadline = new Date(
      qEndMonth === 12 ? now.getFullYear() : periodYear,
      qEndMonth === 12 ? 0 : qEndMonth,
      24,
    );
    periodLabel = `T${prevQ} ${periodYear}`;
    alreadyDone = decls.some((d) => d.annee === periodYear && d.trimestre === prevQ);
    filterFn = (dt) =>
      dt.getFullYear() === periodYear && Math.floor(dt.getMonth() / 3) + 1 === prevQ;
  } else {
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    deadline = new Date(now.getFullYear(), now.getMonth(), 20);
    periodLabel = `${MONTH_NAMES[prevMonth]} ${prevYear}`;
    alreadyDone = decls.some((d) => d.annee === prevYear && d.mois === prevMonth + 1);
    filterFn = (dt) => dt.getFullYear() === prevYear && dt.getMonth() === prevMonth;
  }

  if (alreadyDone) return EMPTY;

  const daysLeft = Math.round((deadline.getTime() - now.getTime()) / 86400000);
  if (daysLeft > 7) return EMPTY;

  const paidInv = docs.filter(
    (d) => d.type === "facture" && d.status === "paye" &&
      filterFn(d.paid_at ? new Date(d.paid_at) : new Date(d.date)),
  );
  const paidAvoir = docs.filter(
    (d) => d.type === "avoir" && d.status === "paye" &&
      filterFn(d.paid_at ? new Date(d.paid_at) : new Date(d.date)),
  );
  const periodDeps = deps.filter((d) => filterFn(new Date(d.date)));

  const tvaC = paidInv.reduce((s, d) => s + d.total_tva, 0)
    - paidAvoir.reduce((s, d) => s + d.total_tva, 0);
  const tvaD = periodDeps.reduce((s, d) => s + d.montant_tva, 0);
  const solde = tvaC - tvaD;

  const level: 0 | 1 | 2 = daysLeft <= 2 ? 2 : 1;

  const bannerMsg = daysLeft < 0
    ? `Déclaration TVA ${periodLabel} — ${Math.abs(daysLeft)} j de retard · ${formatCurrency(solde)} à régulariser`
    : daysLeft === 0
    ? `Déclaration TVA ${periodLabel} — aujourd'hui dernier délai · ${formatCurrency(solde)}`
    : daysLeft === 1
    ? `Déclaration TVA ${periodLabel} — demain dernier délai · ${formatCurrency(solde)}`
    : `Déclaration TVA ${periodLabel} dans ${daysLeft} j · ${formatCurrency(solde)} à verser`;

  const blockMsg = daysLeft < 0
    ? `Franchement, tu abuses là. Ta déclaration TVA de ${periodLabel} a ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? "s" : ""} de retard. J'ai tout calculé, le montant est là, la case est vide... et toi tu veux aller faire des devis ? Non non non. On règle ça maintenant.`
    : daysLeft === 0
    ? `C'est aujourd'hui. Ta déclaration TVA de ${periodLabel} expire ce soir. J'ai mis les ${formatCurrency(solde)} sur un plateau. 30 secondes. Le reste peut attendre, promis.`
    : `J'ai pas envie de te voir payer des majorations. Ta déclaration TVA de ${periodLabel}, c'est demain. J'ai tout prêt — les chiffres, la TVA, tout. T'as juste à valider. Allez.`;

  return { level, periodLabel, daysLeft, solde, bannerMsg, blockMsg };
}

// ─── Context ──────────────────────────────────────────────────────────────────
const GuardCtx = createContext<AlertInfo>(EMPTY);
export function useDeclarationGuard() { return useContext(GuardCtx); }

// ─── Provider — enveloppe tout le layout dashboard ────────────────────────────
export function DeclarationGuardProvider({ children }: { children: React.ReactNode }) {
  const { documents, depenses, dataLoading } = useAppContext();
  const [org, setOrg] = useState<Organization | null>(null);
  const [declarations, setDeclarations] = useState<DeclarationTVA[]>([]);

  useEffect(() => {
    getDeclarationsTVADB().then(setDeclarations).catch(() => {});
    getOrganizationDB().then(setOrg).catch(() => setOrg(getOrganizationLS()));
  }, []);

  const alert = useMemo(
    () => (!org || dataLoading) ? EMPTY : computeAlert(documents, depenses, org, declarations),
    [documents, depenses, org, declarations, dataLoading],
  );

  return <GuardCtx.Provider value={alert}>{children}</GuardCtx.Provider>;
}

// ─── Bannière niveau 1 (J-7 à J-3) ───────────────────────────────────────────
export function DeclarationBanner() {
  const { level, bannerMsg } = useDeclarationGuard();
  if (level !== 1) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-400/10 border-b border-amber-400/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-sm font-sans text-amber-300 truncate">{bannerMsg}</span>
      </div>
      <Link
        href="/comptabilite"
        className="flex items-center gap-1.5 text-xs font-sans font-medium text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 transition-colors shrink-0 whitespace-nowrap"
      >
        Déclarer <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Écran de blocage niveau 2 (J-2, J-1, J0, retard) ────────────────────────
export function DeclarationBlock({ children }: { children: React.ReactNode }) {
  const { level, blockMsg, solde, periodLabel } = useDeclarationGuard();
  const pathname = usePathname();
  const isOnCompta = pathname === "/comptabilite";

  if (level === 2 && !isOnCompta) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)] p-8">
        <div className="max-w-lg w-full text-center space-y-6">
          {/* Icône Sam */}
          <div className="w-20 h-20 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <BookOpen className="w-9 h-9 text-red-400" />
          </div>

          {/* Message Sam */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-400/10 border border-red-400/20 text-xs font-sans text-red-400">
              Sam · Garde-fou déclaratif
            </div>
            <p className="text-base font-sans text-white/90 leading-relaxed">{blockMsg}</p>
          </div>

          {/* Montant TVA */}
          <div className="p-5 rounded-xl bg-atlantic-800/40 border border-gold-400/10">
            <p className="text-xs font-sans text-atlantic-200/40 mb-1.5">TVA nette à verser · {periodLabel}</p>
            <p className="text-4xl font-display font-bold text-gold-400">{formatCurrency(solde)}</p>
            <p className="text-xs font-sans text-atlantic-200/30 mt-1.5">Calculé par Sam · tout est prêt</p>
          </div>

          {/* CTA */}
          <Link
            href="/comptabilite"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gold-400 hover:bg-gold-300 text-atlantic-900 font-sans font-bold text-sm transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Faire ma déclaration TVA
          </Link>

          <p className="text-[11px] font-sans text-atlantic-200/20 leading-relaxed">
            L'accès complet est rétabli automatiquement dès que ta déclaration est validée.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

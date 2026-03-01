"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { AnimatedCounter } from "@/components/premium/animated-counter";
import { PageTransition } from "@/components/premium/page-transition";
import {
  TrendingUp, TrendingDown, Receipt, Clock, CheckCircle2,
  Download, BookOpen, AlertTriangle, Users, BarChart3,
  FileCheck, Plus, Trash2, X, Paperclip, Eye, Sparkles,
} from "lucide-react";
import { useAppContext } from "@/lib/context/app-context";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { CATEGORIES, TVA_RATES, saveDepense, deleteDepense } from "@/lib/depenses";
import {
  saveDeclarationTVADB,
  getDeclarationsTVADB,
  uploadJustificatif,
  getJustificatifUrl,
  saveDepenseDB,
} from "@/lib/supabase/data";
import type { Depense, DeclarationTVA, Document } from "@/types/database";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function inferTvaRate(doc: Document): number {
  if (doc.total_ht === 0) return 0;
  const r = doc.total_tva / doc.total_ht;
  if (r >= 0.185) return 20;
  if (r >= 0.085) return 10;
  if (r >= 0.045) return 5.5;
  if (r >= 0.015) return 2.1;
  return 0;
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg bg-atlantic-800/50 border border-atlantic-600/20 text-white text-sm font-sans placeholder-atlantic-200/20 focus:border-gold-400/40 focus:outline-none transition-colors";
const LABEL_CLASS = "block text-xs font-sans text-atlantic-200/50 mb-1.5 uppercase tracking-wider";

const BLANK_FORM = {
  date: new Date().toISOString().split("T")[0],
  fournisseur: "",
  description: "",
  categorie_code: "606",
  montant_ht: "",
  tva_rate: "20",
  piece_ref: "",
};

export default function ComptabilitePage() {
  const { documents, clients, depenses, refreshDepenses, dataLoading: loading } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [declarations, setDeclarations] = useState<DeclarationTVA[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    getDeclarationsTVADB().then(setDeclarations).catch(() => {});
  }, []);

  // ── Années ────────────────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    documents.forEach((d) => {
      const yr = (d.status === "paye" && d.paid_at)
        ? new Date(d.paid_at).getFullYear()
        : new Date(d.date).getFullYear();
      years.add(yr);
    });
    depenses.forEach((d) => years.add(new Date(d.date).getFullYear()));
    const arr = Array.from(years).sort((a, b) => b - a);
    if (arr.length === 0) arr.push(new Date().getFullYear());
    return arr;
  }, [documents, depenses]);

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const activeYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[0] ?? new Date().getFullYear());

  const getClientName = useCallback(
    (clientId: string) => {
      const c = clients.find((cl) => cl.id === clientId);
      if (!c) return "—";
      return c.company_name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—";
    },
    [clients],
  );

  // ── Paid invoices filtrées par paid_at (TVA sur encaissements) ─────────────
  const allPaidInvYear = useMemo(() =>
    documents.filter((d) => {
      if (d.type !== "facture" || d.status !== "paye") return false;
      const yr = d.paid_at ? new Date(d.paid_at).getFullYear() : new Date(d.date).getFullYear();
      return yr === activeYear;
    }),
    [documents, activeYear],
  );

  const allPaidAvoirYear = useMemo(() =>
    documents.filter((d) => {
      if (d.type !== "avoir" || d.status !== "paye") return false;
      const yr = d.paid_at ? new Date(d.paid_at).getFullYear() : new Date(d.date).getFullYear();
      return yr === activeYear;
    }),
    [documents, activeYear],
  );

  // Documents par date d'émission (encours, mensuel)
  const yearDocs = useMemo(
    () => documents.filter((d) => new Date(d.date).getFullYear() === activeYear),
    [documents, activeYear],
  );
  const prevYearPaidInv = useMemo(() =>
    documents.filter((d) => {
      if (d.type !== "facture" || d.status !== "paye") return false;
      const yr = d.paid_at ? new Date(d.paid_at).getFullYear() : new Date(d.date).getFullYear();
      return yr === activeYear - 1;
    }),
    [documents, activeYear],
  );

  const yearDepenses = useMemo(
    () => depenses.filter((d) => new Date(d.date).getFullYear() === activeYear),
    [depenses, activeYear],
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const caHT =
      allPaidInvYear.reduce((s, d) => s + d.total_ht, 0) -
      allPaidAvoirYear.reduce((s, d) => s + d.total_ht, 0);
    const tvaCollectee =
      allPaidInvYear.reduce((s, d) => s + d.total_tva, 0) -
      allPaidAvoirYear.reduce((s, d) => s + d.total_tva, 0);

    const pending = yearDocs.filter(
      (d) => d.type === "facture" && (d.status === "envoye" || d.status === "valide"),
    );
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = pending.filter((d) => d.due_date && new Date(d.due_date) < today);

    const encours = pending.reduce((s, d) => s + d.total_ht, 0);
    const encoursTTC = pending.reduce((s, d) => s + d.total_ttc, 0);
    const encaisseTTC = allPaidInvYear.reduce((s, d) => s + d.total_ttc, 0);
    const retardTTC = overdue.reduce((s, d) => s + d.total_ttc, 0);

    const delais = allPaidInvYear
      .filter((d) => d.due_date)
      .map((d) => Math.round((new Date(d.due_date!).getTime() - new Date(d.date).getTime()) / 86400000));
    const delaiMoyen = delais.length > 0
      ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length) : 0;

    const prevCA =
      prevYearPaidInv.reduce((s, d) => s + d.total_ht, 0);
    const evolution = prevCA > 0 ? Math.round(((caHT - prevCA) / prevCA) * 100) : null;

    const totalChargesHT = yearDepenses.reduce((s, d) => s + d.montant_ht, 0);
    const resultatBrut = caHT - totalChargesHT;

    return {
      caHT, tvaCollectee, encours, encoursTTC, encaisseTTC, retardTTC,
      nbPaid: allPaidInvYear.length, delaiMoyen, evolution,
      totalChargesHT, resultatBrut,
    };
  }, [allPaidInvYear, allPaidAvoirYear, yearDocs, yearDepenses, prevYearPaidInv]);

  // ── CA3 ───────────────────────────────────────────────────────────────────
  const ca3 = useMemo(() => {
    const recettes: Record<number, { ht: number; tva: number }> = {};
    for (const d of allPaidInvYear) {
      const r = inferTvaRate(d);
      if (!recettes[r]) recettes[r] = { ht: 0, tva: 0 };
      recettes[r].ht += d.total_ht; recettes[r].tva += d.total_tva;
    }
    for (const d of allPaidAvoirYear) {
      const r = inferTvaRate(d);
      if (!recettes[r]) recettes[r] = { ht: 0, tva: 0 };
      recettes[r].ht -= d.total_ht; recettes[r].tva -= d.total_tva;
    }
    const charges: Record<number, { ht: number; tva: number }> = {};
    for (const d of yearDepenses) {
      if (!charges[d.tva_rate]) charges[d.tva_rate] = { ht: 0, tva: 0 };
      charges[d.tva_rate].ht += d.montant_ht; charges[d.tva_rate].tva += d.montant_tva;
    }
    const allRates = new Set([
      ...Object.keys(recettes).map(Number),
      ...Object.keys(charges).map(Number),
    ]);
    const rows = Array.from(allRates).sort((a, b) => b - a).map((rate) => ({
      rate,
      baseRecettes: recettes[rate]?.ht ?? 0,
      tvaCollectee: recettes[rate]?.tva ?? 0,
      baseCharges: charges[rate]?.ht ?? 0,
      tvaDeductible: charges[rate]?.tva ?? 0,
    }));
    const totalCollectee = rows.reduce((s, r) => s + r.tvaCollectee, 0);
    const totalDeductible = rows.reduce((s, r) => s + r.tvaDeductible, 0);
    return { rows, totalCollectee, totalDeductible, solde: totalCollectee - totalDeductible };
  }, [allPaidInvYear, allPaidAvoirYear, yearDepenses]);

  // ── Balance âgée ──────────────────────────────────────────────────────────
  const balanceAgee = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const pending = documents.filter(
      (d) => d.type === "facture" && (d.status === "envoye" || d.status === "valide"),
    );
    const buckets = [
      { label: "Non échu",  color: "text-emerald-400", bar: "#34d399", ht: 0, ttc: 0, nb: 0 },
      { label: "1 – 30 j",  color: "text-amber-400",   bar: "#f59e0b", ht: 0, ttc: 0, nb: 0 },
      { label: "31 – 60 j", color: "text-orange-400",  bar: "#f97316", ht: 0, ttc: 0, nb: 0 },
      { label: "61 – 90 j", color: "text-red-400",     bar: "#ef4444", ht: 0, ttc: 0, nb: 0 },
      { label: "+ 90 j",    color: "text-red-600",     bar: "#dc2626", ht: 0, ttc: 0, nb: 0 },
    ];
    for (const doc of pending) {
      if (!doc.due_date) { buckets[0].ht += doc.total_ht; buckets[0].ttc += doc.total_ttc; buckets[0].nb++; continue; }
      const diff = Math.round((today.getTime() - new Date(doc.due_date).getTime()) / 86400000);
      const idx = diff <= 0 ? 0 : diff <= 30 ? 1 : diff <= 60 ? 2 : diff <= 90 ? 3 : 4;
      buckets[idx].ht += doc.total_ht; buckets[idx].ttc += doc.total_ttc; buckets[idx].nb++;
    }
    return { buckets, total: pending.reduce((s, d) => s + d.total_ttc, 0) };
  }, [documents]);

  // ── Top clients ───────────────────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map: Record<string, { ht: number; nb: number }> = {};
    allPaidInvYear.forEach((d) => {
      if (!map[d.client_id]) map[d.client_id] = { ht: 0, nb: 0 };
      map[d.client_id].ht += d.total_ht; map[d.client_id].nb++;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ name: getClientName(id), ...v }))
      .sort((a, b) => b.ht - a.ht)
      .slice(0, 5);
  }, [allPaidInvYear, getClientName]);

  // ── Mensuel ───────────────────────────────────────────────────────────────
  const monthlyData = useMemo(() =>
    MONTH_NAMES.map((name, idx) => {
      const paidInv = allPaidInvYear.filter((d) => {
        const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
        return dt.getMonth() === idx;
      });
      const paidAvoir = allPaidAvoirYear.filter((d) => {
        const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
        return dt.getMonth() === idx;
      });
      const caHT = paidInv.reduce((s, d) => s + d.total_ht, 0) - paidAvoir.reduce((s, d) => s + d.total_ht, 0);
      const tva = paidInv.reduce((s, d) => s + d.total_tva, 0) - paidAvoir.reduce((s, d) => s + d.total_tva, 0);
      const charges = yearDepenses.filter((d) => new Date(d.date).getMonth() === idx).reduce((s, d) => s + d.montant_ht, 0);
      return { name, caHT, tva, nb: paidInv.length, charges };
    }),
    [allPaidInvYear, allPaidAvoirYear, yearDepenses],
  );
  const maxMonthCA = Math.max(...monthlyData.map((m) => m.caHT), 1);

  // ── Journal ───────────────────────────────────────────────────────────────
  const journal = useMemo(() =>
    [...allPaidInvYear].sort((a, b) => {
      const da = a.paid_at ?? a.date;
      const db = b.paid_at ?? b.date;
      return new Date(db).getTime() - new Date(da).getTime();
    }),
    [allPaidInvYear],
  );

  // ── Sam — période en attente ───────────────────────────────────────────────
  const samPeriod = useMemo(() => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const monthName = MONTH_NAMES[prevMonth];

    // Deadline légale : 20 du mois courant
    const deadline = new Date(now.getFullYear(), now.getMonth(), 20);
    const daysLeft = Math.round((deadline.getTime() - now.getTime()) / 86400000);

    // Déjà archivée ?
    const alreadyDone = declarations.some(
      (d) => d.annee === prevMonthYear && d.mois === prevMonth + 1,
    );

    // Calcul CA3 sur le mois précédent uniquement
    const periodPaidInv = documents.filter((d) => {
      if (d.type !== "facture" || d.status !== "paye") return false;
      const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
      return dt.getFullYear() === prevMonthYear && dt.getMonth() === prevMonth;
    });
    const periodPaidAvoir = documents.filter((d) => {
      if (d.type !== "avoir" || d.status !== "paye") return false;
      const dt = d.paid_at ? new Date(d.paid_at) : new Date(d.date);
      return dt.getFullYear() === prevMonthYear && dt.getMonth() === prevMonth;
    });
    const periodDepenses = depenses.filter((d) => {
      const dt = new Date(d.date);
      return dt.getFullYear() === prevMonthYear && dt.getMonth() === prevMonth;
    });

    const caHT =
      periodPaidInv.reduce((s, d) => s + d.total_ht, 0) -
      periodPaidAvoir.reduce((s, d) => s + d.total_ht, 0);
    const tvaCollectee =
      periodPaidInv.reduce((s, d) => s + d.total_tva, 0) -
      periodPaidAvoir.reduce((s, d) => s + d.total_tva, 0);
    const chargesHT = periodDepenses.reduce((s, d) => s + d.montant_ht, 0);
    const tvaDeductible = periodDepenses.reduce((s, d) => s + d.montant_tva, 0);
    const solde = tvaCollectee - tvaDeductible;

    return {
      month: prevMonth, year: prevMonthYear, monthName, deadline, daysLeft,
      alreadyDone, caHT, tvaCollectee, chargesHT, tvaDeductible, solde,
      nbInvoices: periodPaidInv.length, nbDepenses: periodDepenses.length,
    };
  }, [documents, depenses, declarations]);

  // ── Handlers dépenses ─────────────────────────────────────────────────────
  async function handleAddDepense(e: React.FormEvent) {
    e.preventDefault();
    const ht = parseFloat(form.montant_ht) || 0;
    if (ht <= 0) return;
    setSaving(true);
    const rate = parseFloat(form.tva_rate) || 0;
    const tva = Math.round(ht * rate) / 100;
    const cat = CATEGORIES.find((c) => c.code === form.categorie_code);
    const d: Depense = {
      id: `dep_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      organization_id: documents[0]?.organization_id ?? "",
      date: form.date,
      fournisseur: form.fournisseur,
      description: form.description,
      categorie_code: form.categorie_code,
      categorie_lib: cat?.lib ?? "",
      montant_ht: ht,
      tva_rate: rate,
      montant_tva: tva,
      montant_ttc: ht + tva,
      piece_ref: form.piece_ref,
      piece_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await saveDepense(d);
    await refreshDepenses();
    setForm(BLANK_FORM);
    setShowForm(false);
    setSaving(false);
  }

  async function handleDeleteDepense(id: string) {
    await deleteDepense(id);
    await refreshDepenses();
  }

  async function handleUploadJustificatif(dep: Depense, file: File) {
    const orgId = dep.organization_id || documents[0]?.organization_id;
    if (!orgId) return;
    setUploadingId(dep.id);
    try {
      const path = await uploadJustificatif(file, orgId, dep.id);
      await saveDepenseDB({ ...dep, piece_url: path });
      await refreshDepenses();
    } catch { /* silent */ } finally {
      setUploadingId(null);
    }
  }

  async function handleViewJustificatif(path: string) {
    try {
      const url = await getJustificatifUrl(path);
      window.open(url, "_blank");
    } catch { /* silent */ }
  }

  // ── Sam — archiver la période précédente ─────────────────────────────────
  async function handleSamArchive() {
    setArchiving(true);
    try {
      const decl = await saveDeclarationTVADB({
        annee: samPeriod.year,
        mois: samPeriod.month + 1,
        trimestre: Math.ceil((samPeriod.month + 1) / 3),
        periodicite: "mensuelle",
        ca_ht: samPeriod.caHT,
        tva_collectee: samPeriod.tvaCollectee,
        charges_ht: samPeriod.chargesHT,
        tva_deductible: samPeriod.tvaDeductible,
        solde_tva: samPeriod.solde,
        statut: "simulee",
        deposee_le: null,
        notes: `Archivé par Sam le ${new Date().toLocaleDateString("fr-FR")}`,
      });
      setDeclarations((prev) => [decl, ...prev]);
    } catch { /* silent */ } finally {
      setArchiving(false);
    }
  }

  // ── Archiver la CA3 ───────────────────────────────────────────────────────
  async function handleArchiveCA3() {
    setArchiving(true);
    try {
      const decl = await saveDeclarationTVADB({
        annee: activeYear,
        mois: new Date().getMonth() + 1,
        trimestre: null,
        periodicite: "mensuelle",
        ca_ht: kpis.caHT,
        tva_collectee: ca3.totalCollectee,
        charges_ht: kpis.totalChargesHT,
        tva_deductible: ca3.totalDeductible,
        solde_tva: ca3.solde,
        statut: "simulee",
        deposee_le: null,
        notes: null,
      });
      setDeclarations((prev) => [decl, ...prev]);
    } catch { /* silent */ } finally {
      setArchiving(false);
    }
  }

  // ── Export FEC complet ────────────────────────────────────────────────────
  function exportFEC() {
    const header =
      "JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|ValidDate|Montantdevise|Idevise";
    const fmtAmt = (n: number) => Math.abs(n).toFixed(2).replace(".", ",");
    const fmtDate = (s: string) => {
      const d = new Date(s);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    };
    const lines: string[] = [header];

    journal.forEach((doc, idx) => {
      const vtNum = `VT${String(idx + 1).padStart(6, "0")}`;
      const bqNum = `BQ${String(idx + 1).padStart(6, "0")}`;
      const dateVT = fmtDate(doc.date);
      const dateBQ = fmtDate(doc.paid_at ?? doc.date);
      const cn = getClientName(doc.client_id).slice(0, 35);
      const aux = doc.client_id.slice(0, 17);
      const lib = `Facture ${doc.number}`;

      lines.push(["VT","Ventes",vtNum,dateVT,"411","Clients",aux,cn,doc.number,dateVT,lib,fmtAmt(doc.total_ttc),"0,00","","","",""].join("|"));
      lines.push(["VT","Ventes",vtNum,dateVT,"706","Prestations de services","","",doc.number,dateVT,lib,"0,00",fmtAmt(doc.total_ht),"","","",""].join("|"));
      if (doc.total_tva > 0) {
        lines.push(["VT","Ventes",vtNum,dateVT,"44571","TVA collectée","","",doc.number,dateVT,lib,"0,00",fmtAmt(doc.total_tva),"","","",""].join("|"));
      }
      lines.push(["BQ","Banque",bqNum,dateBQ,"512","Banque","","",doc.number,dateBQ,`Règlement ${doc.number}`,fmtAmt(doc.total_ttc),"0,00",vtNum,"","",""].join("|"));
      lines.push(["BQ","Banque",bqNum,dateBQ,"411","Clients",aux,cn,doc.number,dateBQ,`Règlement ${doc.number}`,"0,00",fmtAmt(doc.total_ttc),vtNum,"","",""].join("|"));
    });

    yearDepenses.forEach((dep, idx) => {
      const acNum = `AC${String(idx + 1).padStart(6, "0")}`;
      const ds = fmtDate(dep.date);
      const fournisseur = dep.fournisseur.slice(0, 35);
      const lib = dep.description || dep.categorie_lib;
      lines.push(["AC","Achats",acNum,ds,dep.categorie_code,dep.categorie_lib,"","",dep.piece_ref||acNum,ds,lib,fmtAmt(dep.montant_ht),"0,00","","","",""].join("|"));
      if (dep.montant_tva > 0) {
        lines.push(["AC","Achats",acNum,ds,"44566","TVA déductible s/autres biens","","",dep.piece_ref||acNum,ds,lib,fmtAmt(dep.montant_tva),"0,00","","","",""].join("|"));
      }
      lines.push(["AC","Achats",acNum,ds,"401","Fournisseurs",dep.id.slice(0,17),fournisseur,dep.piece_ref||acNum,ds,lib,"0,00",fmtAmt(dep.montant_ttc),"","","",""].join("|"));
    });

    const blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `FEC_${activeYear}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <PageTransition>
        <Topbar title="Comptabilité" subtitle="Chargement..." />
        <div className="p-6 flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  const maxBalTTC = Math.max(...balanceAgee.buckets.map((b) => b.ttc), 1);
  const fecLignes = journal.length * 5 + yearDepenses.reduce((s, d) => s + (d.montant_tva > 0 ? 3 : 2), 0);

  return (
    <PageTransition>
      <Topbar
        title="Comptabilité"
        subtitle={`${kpis.nbPaid} encaissement${kpis.nbPaid > 1 ? "s" : ""} • ${activeYear}`}
      />
      <div className="p-6 space-y-6">

        {/* ── Filtre année ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {availableYears.map((y) => (
            <button key={y} onClick={() => setSelectedYear(y)}
              className={`px-4 py-1.5 rounded-full text-sm font-sans font-medium transition-all ${
                y === activeYear
                  ? "bg-gold-400/20 border border-gold-400/40 text-gold-400"
                  : "bg-atlantic-800/40 border border-atlantic-600/20 text-atlantic-200/50 hover:text-white hover:border-atlantic-500/40"
              }`}
            >{y}</button>
          ))}
          {kpis.evolution !== null && (
            <span className={`text-xs font-sans px-3 py-1.5 rounded-full border ${
              kpis.evolution >= 0 ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" : "bg-red-400/10 border-red-400/20 text-red-400"
            }`}>
              {kpis.evolution >= 0 ? "+" : ""}{kpis.evolution}% vs {activeYear - 1}
            </span>
          )}
        </div>

        {/* ── Sam Comptabilité ── */}
        {samPeriod.alreadyDone ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-sans text-emerald-400">
              CA3 de {samPeriod.monthName} {samPeriod.year} archivée — Sam est à jour.
            </span>
          </div>
        ) : (
          <GlassCard hover={false} glow className="border-gold-400/25">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gold-400/15 border border-gold-400/25 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm font-sans font-semibold text-gold-400">Sam</span>
                  {samPeriod.daysLeft < 0 ? (
                    <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 border border-red-400/20">
                      En retard — deadline dépassée
                    </span>
                  ) : samPeriod.daysLeft <= 5 ? (
                    <span className="text-xs font-sans px-2 py-0.5 rounded-full bg-red-400/15 text-red-400 border border-red-400/20">
                      Urgent — {samPeriod.daysLeft}j restants
                    </span>
                  ) : (
                    <span className="text-xs font-sans text-atlantic-200/40">
                      Deadline : {samPeriod.deadline.toLocaleDateString("fr-FR")} ({samPeriod.daysLeft}j)
                    </span>
                  )}
                </div>
                <p className="text-sm font-sans text-white/90 leading-relaxed mb-3">
                  Ta CA3 de <span className="font-semibold text-white">{samPeriod.monthName} {samPeriod.year}</span> est prête.{" "}
                  {samPeriod.nbInvoices === 0
                    ? "Aucune facture encaissée ce mois — rien à déclarer."
                    : <>
                        L.14 TVA brute <span className="text-emerald-400 font-semibold">{formatCurrency(samPeriod.tvaCollectee)}</span> · L.20 TVA déductible <span className="text-red-400 font-semibold">{formatCurrency(samPeriod.tvaDeductible)}</span> · <span className="font-bold text-[11px] text-gold-400/70">Ligne {samPeriod.solde >= 0 ? "29" : "28"}</span> <span className={samPeriod.solde >= 0 ? "font-bold text-amber-400" : "font-bold text-emerald-400"}>{samPeriod.solde >= 0 ? "à payer" : "crédit"} {formatCurrency(Math.abs(samPeriod.solde))}</span>.
                      </>
                  }
                </p>
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={handleSamArchive}
                    disabled={archiving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-400/15 border border-gold-400/30 text-gold-400 text-sm font-sans font-medium hover:bg-gold-400/25 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {archiving ? "Archivage…" : "Valider et archiver"}
                  </button>
                  <span className="text-xs font-sans text-atlantic-200/35">
                    {samPeriod.nbInvoices} facture{samPeriod.nbInvoices !== 1 ? "s" : ""} · {samPeriod.nbDepenses} dépense{samPeriod.nbDepenses !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "CA HT encaissé", value: kpis.caHT, suffix: " €", sub: kpis.evolution !== null ? `${kpis.evolution >= 0 ? "+" : ""}${kpis.evolution}% vs N-1` : `${activeYear}`, icon: TrendingUp, color: "from-emerald-400/20 to-emerald-400/5", iconColor: "text-emerald-400", decimals: 2 },
            { label: "Charges HT", value: kpis.totalChargesHT, suffix: " €", sub: `${yearDepenses.length} dépense${yearDepenses.length > 1 ? "s" : ""} saisie${yearDepenses.length > 1 ? "s" : ""}`, icon: TrendingDown, color: "from-red-400/20 to-red-400/5", iconColor: "text-red-400", decimals: 2 },
            { label: "Résultat brut", value: kpis.resultatBrut, suffix: " €", sub: kpis.totalChargesHT > 0 ? `marge ${kpis.caHT > 0 ? Math.round((kpis.resultatBrut / kpis.caHT) * 100) : 0}%` : "charges non renseignées", icon: kpis.resultatBrut >= 0 ? TrendingUp : TrendingDown, color: kpis.resultatBrut >= 0 ? "from-violet-400/20 to-violet-400/5" : "from-red-400/20 to-red-400/5", iconColor: kpis.resultatBrut >= 0 ? "text-violet-400" : "text-red-400", decimals: 2 },
            { label: "Encours HT", value: kpis.encours, suffix: " €", sub: `${formatCurrency(kpis.encoursTTC)} TTC • délai moyen ${kpis.delaiMoyen} j`, icon: Clock, color: "from-amber-400/20 to-amber-400/5", iconColor: "text-amber-400", decimals: 2 },
          ].map((kpi) => (
            <GlassCard key={kpi.label} className="group relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="relative flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-sans font-medium text-atlantic-200/50 uppercase tracking-wider">{kpi.label}</p>
                  <div className="text-3xl font-display font-bold text-white mt-2">
                    <AnimatedCounter target={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} duration={1.5} />
                  </div>
                  <p className="text-[10px] font-sans text-atlantic-200/40 mt-1">{kpi.sub}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-atlantic-700/50 group-hover:bg-atlantic-700/80 transition-colors flex-shrink-0 ml-3">
                  <kpi.icon className={`w-5 h-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* ── Trésorerie TTC ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Encaissé TTC", value: kpis.encaisseTTC, color: "text-emerald-400", bg: "bg-emerald-400/8", border: "border-emerald-400/15" },
            { label: "En attente TTC", value: kpis.encoursTTC, color: "text-amber-400", bg: "bg-amber-400/8", border: "border-amber-400/15" },
            { label: "En retard TTC", value: kpis.retardTTC, color: "text-red-400", bg: "bg-red-400/8", border: "border-red-400/15" },
          ].map((item) => (
            <div key={item.label} className={`flex items-center justify-between px-5 py-4 rounded-xl ${item.bg} border ${item.border}`}>
              <p className="text-sm font-sans text-atlantic-200/60">{item.label}</p>
              <p className={`text-lg font-display font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>

        {/* ── CA3 Cerfa 3310 ── */}
        <GlassCard hover={false}>
          <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-lg font-display font-semibold">Déclaration TVA — Cerfa 3310-CA3</h3>
                <p className="text-[10px] font-sans text-atlantic-200/40 mt-0.5">
                  TVA sur encaissements · {activeYear} · Reporter les valeurs sur impots.gouv.fr
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {yearDepenses.length === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/8 border border-amber-400/15">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs font-sans text-amber-400/80">Aucune dépense — TVA déductible = 0</p>
                </div>
              )}
              <button
                onClick={handleArchiveCA3}
                disabled={archiving || ca3.rows.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-sm font-sans font-medium hover:bg-emerald-400/20 transition-all disabled:opacity-40"
              >
                {archiving ? <div className="w-3.5 h-3.5 border border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                Archiver
              </button>
            </div>
          </div>

          {ca3.rows.length === 0 ? (
            <p className="py-8 text-center text-sm font-sans text-atlantic-200/30">Aucune donnée pour {activeYear}</p>
          ) : (
            <div className="space-y-px">

              {/* ── Cadre A — Bases d'imposition ── */}
              <div className="px-4 py-2 rounded-t-lg bg-atlantic-700/40 border border-atlantic-500/20">
                <p className="text-[10px] font-sans font-bold text-gold-400/70 uppercase tracking-widest">
                  Cadre A — Opérations réalisées en France (base imposable HT)
                </p>
              </div>
              {[
                { rate: 20,  ligne: "01",  label: "Taux normal 20%" },
                { rate: 10,  ligne: "5C",  label: "Taux intermédiaire 10%" },
                { rate: 5.5, ligne: "6A",  label: "Taux réduit 5,5%" },
                { rate: 2.1, ligne: "5B",  label: "Taux particulier 2,1%" },
              ].map(({ rate, ligne, label }) => {
                const base = ca3.rows.find((r) => r.rate === rate)?.baseRecettes ?? 0;
                return (
                  <div key={ligne} className={`flex items-center justify-between px-4 py-2.5 border-x border-b border-atlantic-600/15 transition-opacity ${base === 0 ? "opacity-35" : ""}`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[11px] font-sans font-bold text-gold-400/50 w-7 flex-shrink-0">L.{ligne}</span>
                      <span className="text-xs font-sans text-atlantic-200/60">{label}</span>
                    </div>
                    <span className="text-sm font-sans font-semibold text-white tabular-nums">{formatCurrency(base)}</span>
                  </div>
                );
              })}

              {/* ── Cadre A2 — TVA brute ── */}
              <div className="px-4 py-2 bg-emerald-400/5 border border-emerald-400/15 mt-1">
                <p className="text-[10px] font-sans font-bold text-emerald-400/70 uppercase tracking-widest">
                  Cadre A2 — TVA brute collectée
                </p>
              </div>
              {[
                { rate: 20,  ligne: "08" },
                { rate: 10,  ligne: "9B" },
                { rate: 5.5, ligne: "09" },
                { rate: 2.1, ligne: "9C" },
              ].map(({ rate, ligne }) => {
                const tva = ca3.rows.find((r) => r.rate === rate)?.tvaCollectee ?? 0;
                return (
                  <div key={ligne} className={`flex items-center justify-between px-4 py-2.5 border-x border-b border-emerald-400/10 transition-opacity ${tva === 0 ? "opacity-35" : ""}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-[11px] font-sans font-bold text-gold-400/50 w-7 flex-shrink-0">L.{ligne}</span>
                      <span className="text-xs font-sans text-atlantic-200/60">TVA brute à {rate}%</span>
                    </div>
                    <span className="text-sm font-sans font-semibold text-emerald-400 tabular-nums">{formatCurrency(tva)}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-3 border border-emerald-400/20 bg-emerald-400/8 rounded-b-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-sans font-bold text-gold-400/70 w-7">L.14</span>
                  <span className="text-xs font-sans font-semibold text-emerald-400 uppercase tracking-wider">Total TVA brute</span>
                </div>
                <span className="text-lg font-display font-bold text-emerald-400 tabular-nums">{formatCurrency(ca3.totalCollectee)}</span>
              </div>

              {/* ── Cadre B — Déductions ── */}
              <div className="px-4 py-2 bg-red-400/5 border border-red-400/15 mt-1">
                <p className="text-[10px] font-sans font-bold text-red-400/70 uppercase tracking-widest">
                  Cadre B — TVA déductible
                </p>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-x border-b border-red-400/10 opacity-35">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-sans font-bold text-gold-400/50 w-7">L.19</span>
                  <span className="text-xs font-sans text-atlantic-200/60">TVA déductible sur immobilisations</span>
                </div>
                <span className="text-sm font-sans font-semibold text-white tabular-nums">{formatCurrency(0)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 border-x border-b border-red-400/10">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-sans font-bold text-gold-400/50 w-7">L.20</span>
                  <span className="text-xs font-sans text-atlantic-200/60">TVA déductible sur autres biens et services</span>
                </div>
                <span className="text-sm font-sans font-semibold text-red-400 tabular-nums">{formatCurrency(ca3.totalDeductible)}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border border-red-400/20 bg-red-400/8 rounded-b-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-sans font-bold text-gold-400/70 w-7">L.21</span>
                  <span className="text-xs font-sans font-semibold text-red-400 uppercase tracking-wider">Total déductions</span>
                </div>
                <span className="text-lg font-display font-bold text-red-400 tabular-nums">{formatCurrency(ca3.totalDeductible)}</span>
              </div>

              {/* ── Résultat ── */}
              <div className={`mt-3 flex items-center justify-between px-6 py-5 rounded-xl border-2 ${
                ca3.solde > 0
                  ? "bg-amber-400/8 border-amber-400/35"
                  : ca3.solde < 0
                  ? "bg-emerald-400/8 border-emerald-400/35"
                  : "bg-atlantic-800/30 border-atlantic-600/20"
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-sans font-bold text-gold-400/70">
                      Ligne {ca3.solde >= 0 ? "29" : "28"}
                    </span>
                    <span className={`text-sm font-sans font-bold ${ca3.solde > 0 ? "text-amber-400" : ca3.solde < 0 ? "text-emerald-400" : "text-white"}`}>
                      {ca3.solde > 0 ? "TVA nette due" : ca3.solde < 0 ? "Crédit de TVA" : "Équilibre"}
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-atlantic-200/40">
                    {ca3.solde > 0
                      ? "Montant à saisir sur impots.gouv.fr → Déclarer → TVA → Ligne 29"
                      : ca3.solde < 0
                      ? "Crédit reportable sur la prochaine période ou remboursable → Ligne 28"
                      : "TVA collectée = TVA déductible"}
                  </p>
                </div>
                <p className={`text-3xl font-display font-bold tabular-nums ${ca3.solde > 0 ? "text-amber-400" : ca3.solde < 0 ? "text-emerald-400" : "text-white"}`}>
                  {formatCurrency(Math.abs(ca3.solde))}
                </p>
              </div>

            </div>
          )}
        </GlassCard>

        {/* ── Dépenses ── */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <div>
                <h3 className="text-lg font-display font-semibold">Dépenses — {activeYear}</h3>
                <p className="text-[10px] font-sans text-atlantic-200/40 mt-0.5">Factures fournisseurs • TVA déductible • journal AC du FEC</p>
              </div>
            </div>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/10 border border-gold-400/20 text-gold-400 text-sm font-sans font-medium hover:bg-gold-400/20 hover:border-gold-400/40 transition-all"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Annuler" : "Ajouter"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddDepense} className="mb-6 p-4 rounded-xl bg-atlantic-800/30 border border-atlantic-600/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div><label className={LABEL_CLASS}>Date</label><input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={INPUT_CLASS} /></div>
                <div><label className={LABEL_CLASS}>Fournisseur</label><input type="text" required placeholder="Nom du fournisseur" value={form.fournisseur} onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))} className={INPUT_CLASS} /></div>
                <div>
                  <label className={LABEL_CLASS}>Catégorie comptable</label>
                  <select value={form.categorie_code} onChange={(e) => setForm((f) => ({ ...f, categorie_code: e.target.value }))} className={INPUT_CLASS}>
                    {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.lib}</option>)}
                  </select>
                </div>
                <div><label className={LABEL_CLASS}>Montant HT (€)</label><input type="number" required min="0.01" step="0.01" placeholder="0.00" value={form.montant_ht} onChange={(e) => setForm((f) => ({ ...f, montant_ht: e.target.value }))} className={INPUT_CLASS} /></div>
                <div>
                  <label className={LABEL_CLASS}>Taux TVA</label>
                  <select value={form.tva_rate} onChange={(e) => setForm((f) => ({ ...f, tva_rate: e.target.value }))} className={INPUT_CLASS}>
                    {TVA_RATES.map((r) => <option key={r} value={r}>{r === 0 ? "0% (exonéré)" : `${r}%`}</option>)}
                  </select>
                </div>
                <div><label className={LABEL_CLASS}>Réf. pièce (N° facture)</label><input type="text" placeholder="FA-2024-001" value={form.piece_ref} onChange={(e) => setForm((f) => ({ ...f, piece_ref: e.target.value }))} className={INPUT_CLASS} /></div>
                <div className="md:col-span-2 lg:col-span-3"><label className={LABEL_CLASS}>Description</label><input type="text" placeholder="Détail de la dépense" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={INPUT_CLASS} /></div>
              </div>
              {form.montant_ht && parseFloat(form.montant_ht) > 0 && (
                <div className="flex items-center gap-6 mb-4 px-3 py-2 rounded-lg bg-atlantic-700/30 text-xs font-sans">
                  <span className="text-atlantic-200/50">HT : <span className="text-white font-medium">{formatCurrency(parseFloat(form.montant_ht))}</span></span>
                  <span className="text-atlantic-200/50">TVA : <span className="text-red-400 font-medium">{formatCurrency(Math.round(parseFloat(form.montant_ht) * parseFloat(form.tva_rate)) / 100)}</span></span>
                  <span className="text-atlantic-200/50">TTC : <span className="text-gold-400 font-medium">{formatCurrency(parseFloat(form.montant_ht) * (1 + parseFloat(form.tva_rate) / 100))}</span></span>
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-400/15 border border-gold-400/30 text-gold-400 text-sm font-sans font-medium hover:bg-gold-400/25 transition-all disabled:opacity-40"
                >
                  {saving ? <div className="w-3.5 h-3.5 border border-gold-400/40 border-t-gold-400 rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {yearDepenses.length === 0 ? (
            <div className="text-center py-10">
              <TrendingDown className="w-8 h-8 text-red-400/20 mx-auto mb-3" />
              <p className="text-sm font-sans text-atlantic-200/30">Aucune dépense saisie pour {activeYear}</p>
              <p className="text-xs font-sans text-atlantic-200/20 mt-1">Sans dépenses, TVA déductible = 0 et FEC incomplet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-gold-400/10">
                    {["Date","Fournisseur","Catégorie","HT","TVA","TTC","Pièce",""].map((h) => (
                      <th key={h} className="text-left text-xs text-atlantic-200/40 font-medium pb-3 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearDepenses.map((dep) => (
                    <tr key={dep.id} className="border-b border-atlantic-700/20 hover:bg-atlantic-700/15 transition-colors group">
                      <td className="py-3 text-atlantic-200/60">{formatDateShort(dep.date)}</td>
                      <td className="py-3 text-white">{dep.fournisseur || "—"}</td>
                      <td className="py-3 text-xs"><span className="font-mono text-gold-400/60 mr-1.5">{dep.categorie_code}</span><span className="text-atlantic-200/50">{dep.categorie_lib}</span></td>
                      <td className="py-3 text-right text-white font-medium">{formatCurrency(dep.montant_ht)}</td>
                      <td className="py-3 text-right text-red-400/80">{dep.tva_rate > 0 ? formatCurrency(dep.montant_tva) : <span className="text-atlantic-200/20">—</span>}</td>
                      <td className="py-3 text-right font-bold text-white">{formatCurrency(dep.montant_ttc)}</td>
                      <td className="py-3">
                        {dep.piece_url ? (
                          <button onClick={() => handleViewJustificatif(dep.piece_url!)} className="flex items-center gap-1 text-[10px] text-emerald-400/80 hover:text-emerald-400 transition-colors">
                            <Eye className="w-3 h-3" /> Voir
                          </button>
                        ) : (
                          <label className={`flex items-center gap-1 text-[10px] cursor-pointer transition-colors ${uploadingId === dep.id ? "text-gold-400/60" : "text-atlantic-200/30 hover:text-gold-400/60"}`}>
                            <Paperclip className="w-3 h-3" />
                            {uploadingId === dep.id ? "…" : "Joindre"}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadJustificatif(dep, f); }} />
                          </label>
                        )}
                      </td>
                      <td className="py-3">
                        <button onClick={() => handleDeleteDepense(dep.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-atlantic-200/30 hover:text-red-400 hover:bg-red-400/10"
                        ><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gold-400/20">
                    <td colSpan={3} className="py-3 text-xs font-semibold text-gold-400 uppercase tracking-wider">Total</td>
                    <td className="py-3 text-right font-bold text-gold-400">{formatCurrency(kpis.totalChargesHT)}</td>
                    <td className="py-3 text-right font-bold text-red-400">{formatCurrency(ca3.totalDeductible)}</td>
                    <td className="py-3 text-right font-bold text-white">{formatCurrency(yearDepenses.reduce((s, d) => s + d.montant_ttc, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </GlassCard>

        {/* ── Balance âgée + Top clients ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-lg font-display font-semibold">Balance âgée des créances</h3>
                <p className="text-[10px] font-sans text-atlantic-200/40 mt-0.5">Toutes factures envoyées/validées non encaissées</p>
              </div>
            </div>
            {balanceAgee.total === 0 ? (
              <div className="text-center py-8"><CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" /><p className="text-sm font-sans text-emerald-400/60">Aucune créance en attente</p></div>
            ) : (
              <div className="space-y-3">
                {balanceAgee.buckets.map((b) => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-sans font-semibold ${b.color}`}>{b.label}</span>
                        {b.nb > 0 && <span className="text-[10px] font-sans text-atlantic-200/40">{b.nb} facture{b.nb > 1 ? "s" : ""}</span>}
                      </div>
                      <span className={`text-xs font-sans font-bold ${b.nb > 0 ? b.color : "text-atlantic-200/20"}`}>{b.nb > 0 ? formatCurrency(b.ttc) : "—"}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-atlantic-800/50 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(b.ttc / maxBalTTC) * 100}%`, backgroundColor: b.nb > 0 ? b.bar : "transparent" }} />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-gold-400/10">
                  <span className="text-xs font-sans font-semibold text-gold-400 uppercase tracking-wider">Total créances</span>
                  <span className="text-sm font-bold text-gold-400">{formatCurrency(balanceAgee.total)}</span>
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-5"><Users className="w-5 h-5 text-gold-400" /><h3 className="text-lg font-display font-semibold">Top clients — {activeYear}</h3></div>
            {topClients.length === 0 ? (
              <div className="text-center py-8"><p className="text-sm font-sans text-atlantic-200/30">Aucune donnée pour {activeYear}</p></div>
            ) : (
              <div className="space-y-3">
                {topClients.map((client, i) => {
                  const pct = kpis.caHT > 0 ? (client.ht / kpis.caHT) * 100 : 0;
                  return (
                    <div key={client.name + i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-gold-400/15 text-gold-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                          <span className="text-sm font-sans text-atlantic-200/80 truncate">{client.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-[10px] font-sans text-atlantic-200/40">{client.nb} fact.</span>
                          <span className="text-sm font-sans font-bold text-white">{formatCurrency(client.ht)}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-atlantic-800/50 overflow-hidden">
                        <div className="h-full rounded-full bg-gold-gradient transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Compte de résultat mensuel ── */}
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-5"><BookOpen className="w-5 h-5 text-gold-400" /><h3 className="text-lg font-display font-semibold">Compte de résultat mensuel — {activeYear}</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-gold-400/10">
                  {["Mois","CA HT","TVA","Charges HT","Résultat","Nb","Progression"].map((h, i) => (
                    <th key={h} className={`${i >= 6 ? "text-left pl-4" : i === 0 ? "text-left" : "text-right"} text-xs text-atlantic-200/40 font-medium pb-3 uppercase tracking-wider`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => {
                  const res = row.caHT - row.charges;
                  return (
                    <tr key={row.name} className="border-b border-atlantic-700/20 hover:bg-atlantic-700/15 transition-colors">
                      <td className="py-3 text-atlantic-200/70">{row.name}</td>
                      <td className="py-3 text-right font-medium text-white">{row.caHT > 0 ? formatCurrency(row.caHT) : <span className="text-atlantic-200/30">—</span>}</td>
                      <td className="py-3 text-right text-blue-400/80">{row.tva > 0 ? formatCurrency(row.tva) : <span className="text-atlantic-200/30">—</span>}</td>
                      <td className="py-3 text-right text-red-400/80">{row.charges > 0 ? formatCurrency(row.charges) : <span className="text-atlantic-200/30">—</span>}</td>
                      <td className={`py-3 text-right font-medium ${row.caHT === 0 && row.charges === 0 ? "text-atlantic-200/30" : res >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {row.caHT > 0 || row.charges > 0 ? formatCurrency(res) : "—"}
                      </td>
                      <td className="py-3 text-right text-atlantic-200/50">{row.nb > 0 ? row.nb : <span className="text-atlantic-200/30">—</span>}</td>
                      <td className="py-3 pl-4">
                        <svg width="80" height="16" viewBox="0 0 80 16">
                          <rect x="0" y="4" width="80" height="8" rx="4" fill="rgba(255,255,255,0.04)" />
                          {row.caHT > 0 && <rect x="0" y="4" width={Math.max((row.caHT / maxMonthCA) * 80, 4)} height="8" rx="4" fill="#d4af37" opacity="0.7" />}
                        </svg>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gold-400/20">
                  <td className="py-3 text-xs font-semibold text-gold-400 uppercase tracking-wider">Total</td>
                  <td className="py-3 text-right font-bold text-gold-400">{formatCurrency(kpis.caHT)}</td>
                  <td className="py-3 text-right font-bold text-blue-400">{formatCurrency(ca3.totalCollectee)}</td>
                  <td className="py-3 text-right font-bold text-red-400">{formatCurrency(kpis.totalChargesHT)}</td>
                  <td className={`py-3 text-right font-bold ${kpis.resultatBrut >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(kpis.resultatBrut)}</td>
                  <td className="py-3 text-right font-bold text-violet-400">{kpis.nbPaid}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>

        {/* ── Journal des encaissements ── */}
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-gold-400" /><h3 className="text-lg font-display font-semibold">Journal des encaissements — {activeYear}</h3></div>
          {journal.length === 0 ? (
            <div className="text-center py-10"><p className="text-sm font-sans text-atlantic-200/30">Aucune facture payée pour {activeYear}</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-gold-400/10">
                    {["Date encaiss.","Date fact.","N°","Client","HT","TVA","TTC"].map((h, i) => (
                      <th key={h} className={`${i > 3 ? "text-right" : "text-left"} text-xs text-atlantic-200/40 font-medium pb-3 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {journal.map((doc) => (
                    <tr key={doc.id} className="border-b border-atlantic-700/20 hover:bg-atlantic-700/15 transition-colors">
                      <td className="py-3 text-white font-medium">{formatDateShort(doc.paid_at ?? doc.date)}</td>
                      <td className="py-3 text-atlantic-200/40 text-xs">{doc.paid_at && doc.paid_at !== doc.date ? formatDateShort(doc.date) : <span className="text-atlantic-200/20">—</span>}</td>
                      <td className="py-3 text-atlantic-200/70 font-mono text-xs">{doc.number}</td>
                      <td className="py-3 text-atlantic-200/80">{getClientName(doc.client_id)}</td>
                      <td className="py-3 text-right text-white font-medium">{formatCurrency(doc.total_ht)}</td>
                      <td className="py-3 text-right text-atlantic-200/60">{formatCurrency(doc.total_tva)}</td>
                      <td className="py-3 text-right font-bold text-gold-400">{formatCurrency(doc.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* ── Historique CA3 ── */}
        {declarations.length > 0 && (
          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-5"><FileCheck className="w-5 h-5 text-emerald-400" /><h3 className="text-lg font-display font-semibold">Déclarations archivées</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-gold-400/10">
                    {["Période","CA HT","TVA collectée","TVA déductible","Solde","Statut"].map((h, i) => (
                      <th key={h} className={`${i === 0 ? "text-left" : "text-right"} text-xs text-atlantic-200/40 font-medium pb-3 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((d) => (
                    <tr key={d.id} className="border-b border-atlantic-700/20 hover:bg-atlantic-700/15 transition-colors">
                      <td className="py-3 text-white font-medium">
                        {d.mois ? `${MONTH_NAMES[d.mois - 1]} ${d.annee}` : d.annee}
                      </td>
                      <td className="py-3 text-right text-atlantic-200/70">{formatCurrency(d.ca_ht)}</td>
                      <td className="py-3 text-right text-emerald-400">{formatCurrency(d.tva_collectee)}</td>
                      <td className="py-3 text-right text-red-400">{formatCurrency(d.tva_deductible)}</td>
                      <td className={`py-3 text-right font-bold ${d.solde_tva > 0 ? "text-amber-400" : "text-emerald-400"}`}>{formatCurrency(Math.abs(d.solde_tva))}</td>
                      <td className="py-3 text-right">
                        <span className={`text-[10px] font-sans px-2 py-1 rounded-full border ${d.statut === "deposee" ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" : "bg-atlantic-700/30 border-atlantic-600/20 text-atlantic-200/40"}`}>
                          {d.statut === "deposee" ? "Déposée" : "Simulée"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* ── Export FEC ── */}
        <GlassCard hover={false}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1"><Download className="w-5 h-5 text-gold-400" /><h3 className="text-lg font-display font-semibold">Export FEC — {activeYear}</h3></div>
              <p className="text-sm font-sans text-atlantic-200/50 mb-1">Journaux VT (ventes) + BQ (règlements réels) + AC (achats) — DGFiP</p>
              <div className="flex items-center gap-4 text-[10px] font-sans text-atlantic-200/30">
                <span>{journal.length} factures → {journal.length * 5} lignes VT/BQ</span>
                <span>{yearDepenses.length} dépenses → {yearDepenses.reduce((s, d) => s + (d.montant_tva > 0 ? 3 : 2), 0)} lignes AC</span>
                <span className="text-gold-400/50 font-medium">Total : {fecLignes} lignes</span>
              </div>
            </div>
            <button onClick={exportFEC} disabled={journal.length === 0 && yearDepenses.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-400/10 border border-gold-400/20 text-gold-400 text-sm font-sans font-medium hover:bg-gold-400/20 hover:border-gold-400/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />Télécharger FEC_{activeYear}.txt
            </button>
          </div>
        </GlassCard>

      </div>
    </PageTransition>
  );
}

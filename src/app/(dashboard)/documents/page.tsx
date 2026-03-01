"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { PageTransition } from "@/components/premium/page-transition";
import {
  FileText, Plus, Search, Edit2, Trash2, Eye, Send, Check, X,
  ChevronRight, Receipt, FileCheck, ArrowRight, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, MessageSquare, Clock, Printer, Download, Brain,
  Truck, RotateCcw, ChevronDown,
} from "lucide-react";
import {
  verifyDocument, addDocumentValidation, getDocumentValidations,
  saveDocument as saveDocumentLS,
  deleteDocument as deleteDocumentLS, deleteDocumentLines as deleteDocumentLinesLS,
  getDocumentLines as getDocumentLinesLS,
  getOrganization, getClient,
} from "@/lib/supabase/data";
import type { VerificationResult, LocalValidation } from "@/lib/supabase/data";
import {
  saveDocument as saveDocumentDB,
  deleteDocument as deleteDocumentDB,
  getDocumentLines as getDocumentLinesDB,
  replaceDocumentLines as replaceDocumentLinesDB,
  generateDocumentNumber as generateDocumentNumberDB,
  getOrganization as getOrganizationDB,
} from "@/lib/supabase/data";
import { useAppContext } from "@/lib/context/app-context";
import { downloadInvoicePDF } from "@/components/pdf/invoice-pdf";
import type { Organization } from "@/types/database";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { calculateLineTotals as calcLine } from "@/lib/validators";
import type { Document as Doc, DocumentLine, Client, Product } from "@/types/database";

type ViewMode = "list" | "create" | "detail";
type DocTypeFilter = "all" | "facture" | "devis" | "avoir" | "bon_livraison" | "autres";
type DocType = "facture" | "devis" | "avoir" | "bon_livraison" | "contrat" | "ordre_mission" | "fiche_intervention" | "recu" | "bon_commande";

const AUTRES_TYPES: DocType[] = ["contrat", "ordre_mission", "fiche_intervention", "recu", "bon_commande"];

const DOC_TYPE_CONFIG: Record<DocType, { label: string; labelNew: string; short: string; color: string; dueDateLabel: string; showDueDate: boolean; showPayé: boolean }> = {
  facture:             { label: "Facture",               labelNew: "Nouvelle facture",               short: "FAC", color: "bg-emerald-400/10 text-emerald-400",  dueDateLabel: "Date d'échéance",     showDueDate: true,  showPayé: true  },
  devis:               { label: "Devis",                 labelNew: "Nouveau devis",                  short: "DEV", color: "bg-blue-400/10 text-blue-400",         dueDateLabel: "Validité jusqu'au",    showDueDate: true,  showPayé: false },
  avoir:               { label: "Avoir",                 labelNew: "Nouvel avoir",                   short: "AVO", color: "bg-amber-400/10 text-amber-400",       dueDateLabel: "Date de référence",    showDueDate: false, showPayé: false },
  bon_livraison:       { label: "Bon de livraison",      labelNew: "Nouveau bon de livraison",       short: "BL",  color: "bg-violet-400/10 text-violet-400",     dueDateLabel: "Date de livraison",    showDueDate: true,  showPayé: false },
  contrat:             { label: "Contrat",               labelNew: "Nouveau contrat",                short: "CTR", color: "bg-cyan-400/10 text-cyan-400",         dueDateLabel: "Date de fin",          showDueDate: true,  showPayé: false },
  ordre_mission:       { label: "Ordre de mission",      labelNew: "Nouvel ordre de mission",        short: "OM",  color: "bg-indigo-400/10 text-indigo-400",     dueDateLabel: "Date de fin mission",  showDueDate: true,  showPayé: false },
  fiche_intervention:  { label: "Fiche d'intervention",  labelNew: "Nouvelle fiche d'intervention",  short: "FI",  color: "bg-orange-400/10 text-orange-400",     dueDateLabel: "Date d'intervention",  showDueDate: true,  showPayé: false },
  recu:                { label: "Reçu",                  labelNew: "Nouveau reçu",                   short: "RCU", color: "bg-teal-400/10 text-teal-400",         dueDateLabel: "Date de règlement",    showDueDate: false, showPayé: false },
  bon_commande:        { label: "Bon de commande",        labelNew: "Nouveau bon de commande",        short: "BC",  color: "bg-rose-400/10 text-rose-400",         dueDateLabel: "Date de livraison",    showDueDate: true,  showPayé: false },
};

// ─── SECTEURS MÉTIER ──────────────────────────────────────────────────────────

type SectorGroup = "legal" | "health" | "architecture" | "btp" | "b2b";

interface SectorField {
  key: string;
  label: string;
  placeholder?: string;
  suffix?: string;
  type?: "text" | "select";
  options?: string[];
}

const SECTOR_FIELDS: Record<SectorGroup, { label: string; color: string; fields: SectorField[] }> = {
  legal: {
    label: "⚖️ Profession juridique",
    color: "border-blue-400/20 bg-blue-400/[0.03]",
    fields: [
      { key: "dossier",     label: "Référence dossier",     placeholder: "Ex : DOS-2024-001" },
      { key: "juridiction", label: "Juridiction / Tribunal", placeholder: "Ex : TGI Paris, Cour d'appel..." },
      { key: "mission",     label: "Nature de la mission",   placeholder: "Ex : Rédaction contrat, consultation..." },
      { key: "tva_regime",  label: "Régime TVA", type: "select", options: ["TVA 20%", "Franchise en base de TVA (art. 293 B CGI)"] },
    ],
  },
  health: {
    label: "🏥 Profession de santé",
    color: "border-emerald-400/20 bg-emerald-400/[0.03]",
    fields: [
      { key: "rpps",      label: "N° RPPS / ADELI",       placeholder: "Ex : 10012345678" },
      { key: "acte",      label: "Nature de l'acte / soin", placeholder: "Ex : Consultation, Séance de kinésithérapie..." },
      { key: "tva_note",  label: "Mention TVA",            placeholder: "Exonération TVA — Art. 261-4-1° CGI" },
    ],
  },
  architecture: {
    label: "🏛️ Architecture / Bureau d'études",
    color: "border-amber-400/20 bg-amber-400/[0.03]",
    fields: [
      { key: "dossier", label: "N° de dossier / permis",  placeholder: "Ex : PA-075-2024-001" },
      { key: "phase",   label: "Phase de mission", type: "select", options: ["ESQ — Esquisse", "APS — Avant-Projet Sommaire", "APD — Avant-Projet Définitif", "PRO — Projet", "DCE — Dossier Consultation Entreprises", "ACT — Assistance Contrats Travaux", "DET — Direction Exécution Travaux", "AOR — Assistance Opérations Réception"] },
      { key: "chantier", label: "Référence chantier",     placeholder: "Ex : Réhabilitation 12 rue des Arts" },
      { key: "moa",      label: "Maître d'ouvrage",       placeholder: "Nom du maître d'ouvrage" },
    ],
  },
  btp: {
    label: "🔧 BTP / Artisan",
    color: "border-orange-400/20 bg-orange-400/[0.03]",
    fields: [
      { key: "marche",   label: "N° de marché / chantier", placeholder: "Ex : MRC-2024-042" },
      { key: "adresse_chantier", label: "Adresse du chantier", placeholder: "Ex : 15 rue des Artisans, 75001 Paris" },
      { key: "avancement", label: "% d'avancement",        placeholder: "Ex : 65", suffix: "%" },
      { key: "retenue",    label: "Retenue de garantie",   placeholder: "Ex : 5", suffix: "%" },
    ],
  },
  b2b: {
    label: "📦 Commerce B2B",
    color: "border-violet-400/20 bg-violet-400/[0.03]",
    fields: [
      { key: "ref_commande", label: "Réf. commande client",    placeholder: "Ex : BC-2024-0123" },
      { key: "livraison",    label: "Conditions de livraison", placeholder: "Ex : DDP Paris, franco de port..." },
      { key: "delai",        label: "Délai de livraison",      placeholder: "Ex : 5 jours ouvrés" },
    ],
  },
};

function detectSectorGroup(sector: string | null | undefined): SectorGroup | null {
  if (!sector) return null;
  const s = sector.toLowerCase();
  if (/avocat|notaire|juriste|huissier|juridique|barreau|clerc|greffier/.test(s)) return "legal";
  if (/médecin|docteur|chirurg|infirm|kiné|ostéo|dentiste|santé|psycho|pharmacien|sage.femme|orthophon/.test(s)) return "health";
  if (/architecte|urbaniste|bureau.d.étude|ingénieur.struct|maître.d.œuvre|géomètre/.test(s)) return "architecture";
  if (/électricien|plombier|maçon|charpentier|menuisier|peintre|carreleur|couvreur|bâtiment|travaux|btp|artisan|chauffagiste|serrurier|vitrier|terrassier/.test(s)) return "btp";
  if (/commerce|distribution|grossiste|fournisseur|négoce|import|export|revendeur|détaillant/.test(s)) return "b2b";
  return null;
}

function compileSectorNotes(group: SectorGroup, values: Record<string, string>): string {
  const config = SECTOR_FIELDS[group];
  const lines = config.fields
    .filter((f) => values[f.key]?.trim())
    .map((f) => `${f.label} : ${values[f.key]}${f.suffix || ""}`);
  return lines.length > 0 ? `— ${config.label} —\n${lines.join("\n")}` : "";
}

interface LineForm {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tva_rate: number;
  discount_percent: number;
  product_id: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-atlantic-400/10 text-atlantic-200" },
  valide: { label: "Validé", color: "bg-blue-400/10 text-blue-400" },
  envoye: { label: "Envoyé", color: "bg-amber-400/10 text-amber-400" },
  paye: { label: "Payé", color: "bg-emerald-400/10 text-emerald-400" },
  annule: { label: "Annulé", color: "bg-red-400/10 text-red-400" },
  refuse: { label: "Refusé", color: "bg-red-400/10 text-red-400" },
};

const emptyLine = (): LineForm => ({
  description: "",
  quantity: 1,
  unit: "unité",
  unit_price: 0,
  tva_rate: 20,
  discount_percent: 0,
  product_id: null,
});

export default function DocumentsPage() {
  const { documents, clients, products, dataLoading: loading, refreshDocuments } = useAppContext();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<DocTypeFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [selectedLines, setSelectedLines] = useState<DocumentLine[]>([]);

  // Create form state
  const [docType, setDocType] = useState<DocType>("facture");
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [aiNotesLoading, setAiNotesLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [detectedSector, setDetectedSector] = useState<SectorGroup | null>(null);
  const [sectorValues, setSectorValues] = useState<Record<string, string>>({});
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [previewNumber, setPreviewNumber] = useState("");
  const [numberLoading, setNumberLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return documents
      .filter((d) => {
        const matchType = filterType === "all"
          || (filterType === "autres" ? AUTRES_TYPES.includes(d.type as DocType) : d.type === filterType);
        const matchSearch = !search || d.number.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [documents, search, filterType]);

  const totals = useMemo(() => {
    let ht = 0, tva = 0, ttc = 0;
    lines.forEach((line) => {
      const t = calcLine(line);
      ht += t.total_ht;
      tva += t.total_tva;
      ttc += t.total_ttc;
    });
    const discountAmt = ht * discountPercent / 100;
    const finalHt = ht - discountAmt;
    const finalTva = tva * (1 - discountPercent / 100);
    const finalTtc = finalHt + finalTva;
    return {
      ht: Math.round(ht * 100) / 100,
      tva: Math.round(finalTva * 100) / 100,
      ttc: Math.round(finalTtc * 100) / 100,
      discount: Math.round(discountAmt * 100) / 100,
    };
  }, [lines, discountPercent]);

  // Détection secteur dès qu'un client est sélectionné
  useEffect(() => {
    const client = clients.find((c) => c.id === clientId);
    const group = detectSectorGroup(client?.sector);
    setDetectedSector(group);
    setSectorValues({});
  }, [clientId, clients]);

  function getClientName(clientIdVal: string): string {
    const c = clients.find((cl) => cl.id === clientIdVal);
    if (!c) return "Client inconnu";
    return c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();
  }

  function addLine() {
    setLines([...lines, emptyLine()]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof LineForm, value: string | number) {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      description: product.name + (product.description ? ` - ${product.description}` : ""),
      unit_price: product.unit_price,
      unit: product.unit,
      tva_rate: product.tva_rate,
      product_id: product.id,
    };
    setLines(newLines);
  }

  async function generateAINotes() {
    setAiNotesLoading(true);
    try {
      const client = clients.find((c) => c.id === clientId);
      const clientName = client ? (client.company_name || `${client.first_name || ""} ${client.last_name || ""}`.trim()) : "";
      const lineDescriptions = lines.filter((l) => l.description).map((l) => l.description);
      const res = await fetch("/api/ai-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, clientName, lineDescriptions, docNumber: previewNumber }),
      });
      const data = await res.json();
      if (data.notes) setNotes(data.notes);
    } catch { /* ignore */ } finally {
      setAiNotesLoading(false);
    }
  }

  async function openCreate(type: DocType) {
    setDocType(type);
    setClientId("");
    setDetectedSector(null);
    setSectorValues({});
    setDocDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setNotes("");
    setDiscountPercent(0);
    setLines([emptyLine()]);
    setEditingDocId(null);
    setPreviewNumber("");
    setView("create");
    // Génère et réserve le numéro immédiatement — comme Jira, Sage, etc.
    setNumberLoading(true);
    try {
      const num = await generateDocumentNumberDB(type);
      setPreviewNumber(num);
    } catch {
      setPreviewNumber("");
    } finally {
      setNumberLoading(false);
    }
  }

  function openEdit(doc: Doc, docLines: DocumentLine[]) {
    setDocType(doc.type as DocType);
    setClientId(doc.client_id);
    setDetectedSector(null);
    setSectorValues({});
    setDocDate(doc.date);
    setDueDate(doc.due_date || "");
    setNotes(doc.notes || "");
    setDiscountPercent(doc.discount_percent || 0);
    setLines(docLines.length > 0 ? docLines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unit_price: l.unit_price,
      tva_rate: l.tva_rate,
      discount_percent: l.discount_percent || 0,
      product_id: l.product_id || null,
    })) : [emptyLine()]);
    setEditingDocId(doc.id);
    setPreviewNumber(doc.number);
    setView("create");
  }

  async function handleSaveDocument() {
    if (!clientId) { alert("Sélectionnez un client"); return; }
    if (lines.every((l) => !l.description)) { alert("Ajoutez au moins une ligne"); return; }
    if (dueDate && dueDate < docDate) { alert("La date d'échéance ne peut pas être antérieure à la date de création."); return; }

    setSaving(true);
    setError(null);
    try {
      let number: string;
      if (editingDocId) {
        number = documents.find((d) => d.id === editingDocId)?.number || "";
      } else {
        number = previewNumber || await generateDocumentNumberDB(docType);
      }

      // Compiler les champs secteur dans les notes
      let finalNotes = notes;
      if (detectedSector) {
        const sectorBlock = compileSectorNotes(detectedSector, sectorValues);
        if (sectorBlock) {
          finalNotes = sectorBlock + (notes ? "\n\n" + notes : "");
        }
      }

      const docPayload = {
        id: editingDocId || undefined,
        client_id: clientId,
        type: docType,
        number,
        date: docDate,
        due_date: dueDate || null,
        total_ht: totals.ht,
        total_tva: totals.tva,
        total_ttc: totals.ttc,
        discount_percent: discountPercent,
        discount_amount: totals.discount,
        notes: finalNotes || null,
        status: "brouillon" as const,
      };

      const savedDoc: Doc = await saveDocumentDB(docPayload);

      const docLines = lines
        .filter((l) => l.description)
        .map((line, i) => {
          const t = calcLine(line);
          return {
            document_id: savedDoc.id,
            product_id: line.product_id,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unit_price: line.unit_price,
            tva_rate: line.tva_rate,
            discount_percent: line.discount_percent,
            total_ht: t.total_ht,
            total_tva: t.total_tva,
            total_ttc: t.total_ttc,
            position: i,
          };
        });

      await replaceDocumentLinesDB(savedDoc.id, docLines);
      await refreshDocuments();
      setView("list");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function openDetail(doc: Doc) {
    setSelectedDoc(doc);
    try {
      const linesData = await getDocumentLinesDB(doc.id);
      setSelectedLines(linesData.length > 0 ? linesData : getDocumentLinesLS(doc.id));
    } catch {
      setSelectedLines(getDocumentLinesLS(doc.id));
    }
    setView("detail");
  }

  async function generateRecu(facture: Doc) {
    try {
      const recuNumber = await generateDocumentNumberDB("recu");
      const recu = await saveDocumentDB({
        client_id: facture.client_id,
        type: "recu",
        number: recuNumber,
        date: new Date().toISOString().split("T")[0],
        due_date: null,
        total_ht: facture.total_ht,
        total_tva: facture.total_tva,
        total_ttc: facture.total_ttc,
        discount_percent: facture.discount_percent,
        discount_amount: facture.discount_amount,
        notes: `Reçu pour règlement de la facture ${facture.number}`,
        status: "valide",
      });
      const lines = await getDocumentLinesDB(facture.id);
      if (lines.length > 0) {
        await replaceDocumentLinesDB(recu.id, lines.map((l) => ({ ...l, id: undefined })));
      }
    } catch { /* génération silencieuse */ }
  }

  async function updateStatus(doc: Doc, status: string) {
    const updated = {
      ...doc,
      status: status as Doc["status"],
      ...(status === "paye" ? { paid_at: new Date().toISOString().split("T")[0] } : {}),
    };
    if (selectedDoc?.id === doc.id) setSelectedDoc(updated);
    try {
      await saveDocumentDB(updated);
      if (doc.type === "facture" && status === "paye") {
        await generateRecu(doc);
      }
      await refreshDocuments();
    } catch {
      saveDocumentLS(updated);
    }
  }

  async function handleDeleteDoc(id: string) {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      await deleteDocumentDB(id);
    } catch {
      deleteDocumentLinesLS(id);
      deleteDocumentLS(id);
    }
    await refreshDocuments();
    setView("list");
  }

  return (
    <PageTransition>
      <Topbar title="Documents" subtitle={loading ? "Chargement..." : `${documents.length} document${documents.length > 1 ? "s" : ""}`} />
      <div className="p-6">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm font-sans">
            {error}
          </div>
        )}
        {/* ═══ LIST ═══ */}
        {view === "list" && (
          <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex gap-1 p-1 rounded-lg bg-atlantic-800/30">
                  {([
                    { id: "all", label: "Tous" },
                    { id: "facture", label: "Factures" },
                    { id: "devis", label: "Devis" },
                    { id: "avoir", label: "Avoirs" },
                    { id: "bon_livraison", label: "BL" },
                    { id: "autres", label: "Autres" },
                  ] as const).map((t) => (
                    <button key={t.id} onClick={() => setFilterType(t.id)} className={`px-3 py-1.5 rounded-md text-xs font-sans transition-all ${filterType === t.id ? "bg-gold-400/10 text-gold-400 border border-gold-400/20" : "text-atlantic-200/40 hover:text-white"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlantic-200/30" />
                  <input type="text" placeholder="N° document..." value={search} onChange={(e) => setSearch(e.target.value)} className="premium-input pl-10 text-sm w-44" />
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <PremiumButton variant="outline" size="sm" icon={<FileCheck className="w-4 h-4" />} onClick={() => openCreate("devis")}>Devis</PremiumButton>
                <PremiumButton size="sm" icon={<Receipt className="w-4 h-4" />} onClick={() => openCreate("facture")}>Facture</PremiumButton>
                {/* Menu autres types */}
                <div className="relative">
                  <button
                    onClick={() => setShowTypeMenu(!showTypeMenu)}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-sans text-atlantic-200/50 hover:text-white bg-atlantic-800/30 border border-gold-400/10 hover:border-gold-400/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showTypeMenu && (
                    <div className="absolute right-0 top-full mt-1 z-20 bg-atlantic-900 border border-gold-400/20 rounded-xl shadow-xl overflow-hidden min-w-[220px]">
                      {([
                        { type: "avoir" as DocType, label: "Avoir", icon: RotateCcw },
                        { type: "bon_livraison" as DocType, label: "Bon de livraison", icon: Truck },
                        { type: "bon_commande" as DocType, label: "Bon de commande", icon: FileCheck },
                        { type: "contrat" as DocType, label: "Contrat", icon: FileText },
                        { type: "ordre_mission" as DocType, label: "Ordre de mission", icon: FileCheck },
                        { type: "fiche_intervention" as DocType, label: "Fiche d'intervention", icon: Truck },
                        { type: "recu" as DocType, label: "Reçu manuel", icon: Receipt },
                      ]).map(({ type, label, icon: Icon }) => (
                        <button
                          key={type}
                          onClick={() => { openCreate(type); setShowTypeMenu(false); }}
                          className="w-full flex items-center justify-start gap-2.5 px-4 py-2.5 text-sm font-sans text-left whitespace-nowrap text-atlantic-200/70 hover:text-white hover:bg-atlantic-700/50 transition-colors"
                        >
                          <Icon className="w-4 h-4 text-gold-400/60" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <GlassCard hover={false} className="py-20">
                <div className="text-center">
                  <div className="inline-block animate-float">
                    <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6"><FileText className="w-10 h-10 text-gold-400/40" /></div>
                  </div>
                  <h3 className="text-xl font-display font-semibold text-white mb-2">Aucun document</h3>
                  <p className="text-sm font-sans text-atlantic-200/40">Créez votre première facture ou devis</p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {filtered.map((doc) => {
                  const st = STATUS_LABELS[doc.status] || STATUS_LABELS.brouillon;
                  return (
                    <div key={doc.id} onClick={() => openDetail(doc)} className="flex items-center gap-4 p-4 rounded-xl border border-gold-400/5 bg-atlantic-800/20 hover:border-gold-400/20 hover:bg-atlantic-800/30 transition-all cursor-pointer group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-sans font-bold ${DOC_TYPE_CONFIG[doc.type as DocType]?.color || "bg-atlantic-400/10 text-atlantic-200"}`}>
                        {DOC_TYPE_CONFIG[doc.type as DocType]?.short || doc.type.slice(0, 3).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans font-medium text-white">{doc.number}</p>
                        <p className="text-xs font-sans text-atlantic-200/40">{getClientName(doc.client_id)} • {formatDateShort(doc.date)}</p>
                      </div>
                      <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      <p className="text-sm font-sans font-semibold text-gold-400">{formatCurrency(doc.total_ttc)}</p>
                      <ChevronRight className="w-4 h-4 text-atlantic-200/20 group-hover:text-gold-400/50 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ CREATE / EDIT ═══ */}
        {view === "create" && (
          <div>
            <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm font-sans text-atlantic-200/40 hover:text-gold-400 transition-colors mb-4">← Retour</button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <GlassCard hover={false}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-display font-semibold">
                      {DOC_TYPE_CONFIG[docType]?.labelNew || "Nouveau document"}
                    </h3>
                    <span className="text-sm font-sans font-semibold text-gold-400">
                      {numberLoading ? "Génération..." : previewNumber}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Client *</label>
                      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="premium-input w-full text-sm">
                        <option value="">Sélectionner un client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name || `${c.first_name || ""} ${c.last_name || ""}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <PremiumInput label="Date" type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
                    {DOC_TYPE_CONFIG[docType]?.showDueDate && (
                      <PremiumInput
                        label={DOC_TYPE_CONFIG[docType]?.dueDateLabel || "Échéance"}
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    )}
                    <PremiumInput label="Remise globale (%)" type="number" value={String(discountPercent)} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
                  </div>
                </GlassCard>

                <GlassCard hover={false}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-display font-semibold">Lignes</h3>
                    <PremiumButton variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addLine}>Ligne</PremiumButton>
                  </div>
                  <div className="space-y-3">
                    {lines.map((line, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-atlantic-800/20 border border-gold-400/5 space-y-3">
                        <div className="flex gap-2">
                          {products.length > 0 && (
                            <select value={line.product_id || ""} onChange={(e) => selectProduct(idx, e.target.value)} className="premium-input text-xs w-40">
                              <option value="">Catalogue...</option>
                              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          )}
                          <input type="text" placeholder="Description *" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} className="premium-input text-sm flex-1" />
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(idx)} className="text-atlantic-200/30 hover:text-red-400 transition-colors p-1"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          <input type="number" step="0.001" placeholder="Qté" value={line.quantity || ""} onChange={(e) => updateLine(idx, "quantity", parseFloat(e.target.value) || 0)} className="premium-input text-sm" />
                          <select value={line.unit} onChange={(e) => updateLine(idx, "unit", e.target.value)} className="premium-input text-sm">
                            {["unité","heure","jour","forfait","m²","kg","litre","lot"].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input type="number" step="0.01" placeholder="Prix HT" value={line.unit_price || ""} onChange={(e) => updateLine(idx, "unit_price", parseFloat(e.target.value) || 0)} className="premium-input text-sm" />
                          <select value={line.tva_rate} onChange={(e) => updateLine(idx, "tva_rate", parseFloat(e.target.value))} className="premium-input text-sm">
                            <option value={0}>0%</option><option value={5.5}>5.5%</option><option value={10}>10%</option><option value={20}>20%</option>
                          </select>
                          <div className="text-right text-sm font-sans font-semibold text-gold-400 flex items-center justify-end">
                            {formatCurrency(calcLine(line).total_ttc)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* ─── Champs secteur dynamiques ─── */}
                {detectedSector && (
                  <GlassCard hover={false} className={`!border ${SECTOR_FIELDS[detectedSector].color}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="w-4 h-4 text-gold-400" />
                      <p className="text-sm font-sans font-semibold text-white">
                        {SECTOR_FIELDS[detectedSector].label}
                      </p>
                      <span className="text-xs font-sans text-atlantic-200/40 ml-auto">Champs détectés automatiquement</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SECTOR_FIELDS[detectedSector].fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-sans font-medium text-atlantic-200/60 mb-1.5">
                            {field.label}
                          </label>
                          {field.type === "select" ? (
                            <select
                              value={sectorValues[field.key] || ""}
                              onChange={(e) => setSectorValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                              className="premium-input w-full text-sm"
                            >
                              <option value="">— Sélectionner —</option>
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={field.placeholder}
                                value={sectorValues[field.key] || ""}
                                onChange={(e) => setSectorValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                className="premium-input w-full text-sm"
                              />
                              {field.suffix && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-sans text-atlantic-200/40">
                                  {field.suffix}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-sans font-medium text-gold-300">Notes / Conditions</label>
                    <button
                      onClick={generateAINotes}
                      disabled={aiNotesLoading}
                      className="flex items-center gap-1.5 text-xs font-sans text-gold-400 hover:text-gold-300 px-2.5 py-1 rounded-lg bg-gold-400/10 hover:bg-gold-400/20 border border-gold-400/20 transition-colors disabled:opacity-50"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      {aiNotesLoading ? "Génération..." : "✦ IA"}
                    </button>
                  </div>
                  <textarea
                    placeholder={
                      docType === "facture" ? "Conditions de paiement, pénalités de retard..." :
                      docType === "devis" ? "Durée de validité, conditions d'acceptation..." :
                      docType === "avoir" ? "Référence facture d'origine, motif de l'avoir..." :
                      docType === "bon_commande" ? "Référence fournisseur, conditions de livraison, modalités de paiement..." :
                      docType === "contrat" ? "Durée, obligations des parties, conditions de résiliation..." :
                      docType === "ordre_mission" ? "Périmètre de la mission, durée, tarif journalier, livrables attendus..." :
                      docType === "fiche_intervention" ? "Nature de l'intervention, observations, matériaux utilisés..." :
                      "Conditions de livraison, réserves..."
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="premium-input w-full resize-none"
                  />
                </div>
              </div>

              <div>
                <div className="sticky top-24">
                  <GlassCard hover={false} glow>
                    <h3 className="text-lg font-display font-semibold mb-4">Récapitulatif</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-sans">
                        <span className="text-atlantic-200/50">Total HT</span>
                        <span className="text-white">{formatCurrency(totals.ht)}</span>
                      </div>
                      {totals.discount > 0 && (
                        <div className="flex justify-between text-sm font-sans">
                          <span className="text-atlantic-200/50">Remise ({discountPercent}%)</span>
                          <span className="text-red-400">-{formatCurrency(totals.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-sans">
                        <span className="text-atlantic-200/50">TVA</span>
                        <span className="text-white">{formatCurrency(totals.tva)}</span>
                      </div>
                      <div className="border-t border-gold-400/20 pt-3 flex justify-between">
                        <span className="text-base font-sans font-semibold text-gold-400">Total TTC</span>
                        <span className="text-xl font-display font-bold animated-gold-text">{formatCurrency(totals.ttc)}</span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2">
                      <PremiumButton onClick={handleSaveDocument} loading={saving} className="w-full" icon={<Check className="w-4 h-4" />}>
                        Enregistrer
                      </PremiumButton>
                      <PremiumButton variant="ghost" onClick={() => setView("list")} className="w-full">
                        Annuler
                      </PremiumButton>
                    </div>
                  </GlassCard>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DETAIL ═══ */}
        {view === "detail" && selectedDoc && (
          <DocumentDetail
            doc={selectedDoc}
            lines={selectedLines}
            clients={clients}
            getClientName={getClientName}
            onBack={() => setView("list")}
            onUpdateStatus={(s) => { updateStatus(selectedDoc, s); }}
            onDelete={() => handleDeleteDoc(selectedDoc.id)}
            onRefresh={refreshDocuments}
            onEdit={() => openEdit(selectedDoc, selectedLines)}
          />
        )}
      </div>
    </PageTransition>
  );
}

// ═══════════════════════════════════════════
// Invoice Preview (PDF-like)
// ═══════════════════════════════════════════

function InvoicePreview({ doc, lines, clientName }: { doc: Doc; lines: DocumentLine[]; clientName: string }) {
  const org = getOrganization();
  const client = getClient(doc.client_id);
  const typeLabels: Record<string, string> = { facture: "FACTURE", devis: "DEVIS", avoir: "AVOIR", bon_livraison: "BON DE LIVRAISON", contrat: "CONTRAT", ordre_mission: "ORDRE DE MISSION", fiche_intervention: "FICHE D'INTERVENTION", recu: "REÇU", bon_commande: "BON DE COMMANDE" };

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="flex justify-end mb-3 print:hidden">
        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-sans bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 transition-colors">
          <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
        </button>
      </div>
      <div className="bg-white text-gray-900 rounded-lg p-8 shadow-lg print:shadow-none print:p-0 text-[13px] leading-relaxed" id="invoice-preview">
        <div className="flex justify-between items-start mb-8 border-b-2 border-amber-500 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{org.name || "Votre Entreprise"}</h2>
            {org.address && <p className="text-gray-500 mt-1">{org.address}</p>}
            {(org.postal_code || org.city) && <p className="text-gray-500">{org.postal_code} {org.city}</p>}
            {org.phone && <p className="text-gray-500">Tél : {org.phone}</p>}
            {org.email && <p className="text-gray-500">{org.email}</p>}
            {org.siret && <p className="text-gray-400 text-xs mt-2">SIRET : {org.siret}</p>}
            {org.tva_number && <p className="text-gray-400 text-xs">TVA : {org.tva_number}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-amber-600">{typeLabels[doc.type] || "DOCUMENT"}</h1>
            <p className="text-lg font-semibold mt-1">{doc.number}</p>
            <p className="text-gray-500 mt-2">Date : {formatDateShort(doc.date)}</p>
            {doc.due_date && <p className="text-gray-500">Échéance : {formatDateShort(doc.due_date)}</p>}
          </div>
        </div>

        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Destinataire</p>
          <p className="font-semibold text-gray-900">{clientName}</p>
          {client?.address && <p className="text-gray-600">{client.address}</p>}
          {(client?.postal_code || client?.city) && <p className="text-gray-600">{client?.postal_code} {client?.city}</p>}
          {client?.email && <p className="text-gray-500 text-xs mt-1">{client.email}</p>}
          {client?.siret && <p className="text-gray-400 text-xs">SIRET : {client.siret}</p>}
        </div>

        <table className="w-full mb-6">
          <thead>
            <tr className="bg-gray-800 text-white text-xs uppercase">
              <th className="text-left py-2.5 px-3 rounded-tl-lg">Description</th>
              <th className="text-right py-2.5 px-3">Qté</th>
              <th className="text-right py-2.5 px-3">P.U. HT</th>
              <th className="text-right py-2.5 px-3">TVA</th>
              <th className="text-right py-2.5 px-3 rounded-tr-lg">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={line.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-2.5 px-3 text-gray-900">{line.description}</td>
                <td className="py-2.5 px-3 text-right text-gray-600">{line.quantity} {line.unit}</td>
                <td className="py-2.5 px-3 text-right text-gray-600">{formatCurrency(line.unit_price)}</td>
                <td className="py-2.5 px-3 text-right text-gray-600">{line.tva_rate}%</td>
                <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{formatCurrency(line.total_ht)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-1.5 text-gray-600"><span>Total HT</span><span>{formatCurrency(doc.total_ht)}</span></div>
            {doc.discount_amount > 0 && <div className="flex justify-between py-1.5 text-red-600"><span>Remise ({doc.discount_percent}%)</span><span>-{formatCurrency(doc.discount_amount)}</span></div>}
            <div className="flex justify-between py-1.5 text-gray-600"><span>TVA</span><span>{formatCurrency(doc.total_tva)}</span></div>
            <div className="flex justify-between py-2.5 border-t-2 border-amber-500 mt-2 text-lg font-bold text-gray-900">
              <span>Total TTC</span><span>{formatCurrency(doc.total_ttc)}</span>
            </div>
          </div>
        </div>

        {doc.notes && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Notes / Conditions</p>
            <p className="text-gray-600 whitespace-pre-line">{doc.notes}</p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-gray-200 text-[10px] text-gray-400 text-center space-y-0.5">
          {org.name && <p>{org.name}{org.legal_form ? ` - ${org.legal_form}` : ""}{org.capital ? ` au capital de ${org.capital}€` : ""}</p>}
          {org.rcs && <p>RCS {org.rcs}</p>}
          {org.siret && <p>SIRET {org.siret} — TVA {org.tva_number || "N/A"}</p>}
          {(org.rib_iban || org.rib_bic) && <p>IBAN : {org.rib_iban || "—"} — BIC : {org.rib_bic || "—"}</p>}
          <p className="mt-2">En cas de retard de paiement, une pénalité de 3x le taux d&apos;intérêt légal sera appliquée, ainsi qu&apos;une indemnité forfaitaire de 40€ pour frais de recouvrement.</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Document Detail with Validation N+1
// ═══════════════════════════════════════════

function DocumentDetail({ doc, lines, clients, getClientName, onBack, onUpdateStatus, onDelete, onRefresh, onEdit }: {
  doc: Doc;
  lines: DocumentLine[];
  clients: Client[];
  getClientName: (id: string) => string;
  onBack: () => void;
  onUpdateStatus: (status: string) => void;
  onDelete: () => void;
  onRefresh: () => void;
  onEdit: () => void;
}) {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [validations, setValidations] = useState<LocalValidation[]>([]);
  const [validationComment, setValidationComment] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getOrganizationDB().then(setOrganization);
  }, []);

  useEffect(() => {
    setVerification(verifyDocument(doc));
    setValidations(getDocumentValidations(doc.id));
  }, [doc.id, doc.status]);

  async function handleDownloadPDF() {
    if (!organization) return;
    const client = clients.find((c) => c.id === doc.client_id) || null;
    setPdfLoading(true);
    try {
      await downloadInvoicePDF({ doc, lines, organization, client });
    } finally {
      setPdfLoading(false);
    }
  }

  function handleValidate(action: "approve" | "reject" | "request_changes") {
    addDocumentValidation(doc.id, { passed: action === "approve", checks: [] });
    setValidationComment("");
    setShowValidation(false);
    setValidations(getDocumentValidations(doc.id));
    if (action === "approve") onUpdateStatus("valide");
    onRefresh();
  }

  const st = STATUS_LABELS[doc.status] || STATUS_LABELS.brouillon;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-sans text-atlantic-200/40 hover:text-gold-400 transition-colors mb-4">← Retour</button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard hover={false}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-display font-bold text-white">{doc.number}</h3>
                  <span className={`text-xs font-sans px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                </div>
                <p className="text-sm font-sans text-atlantic-200/40">
                  {getClientName(doc.client_id)} • {formatDateShort(doc.date)}
                  {doc.due_date && ` • Échéance : ${formatDateShort(doc.due_date)}`}
                </p>
              </div>
              <div className="flex gap-2">
                {doc.status === "brouillon" && (
                  <PremiumButton size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />} onClick={() => setShowValidation(true)}>
                    Demander validation
                  </PremiumButton>
                )}
                {doc.status === "valide" && doc.type !== "recu" && (
                  <PremiumButton size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("envoye")}>
                    {doc.type === "bon_livraison" ? "Livré" :
                     doc.type === "contrat" ? "Envoyer pour signature" :
                     doc.type === "fiche_intervention" ? "Démarrer" :
                     "Envoyer"}
                  </PremiumButton>
                )}
                {doc.status === "envoye" && doc.type === "facture" && (
                  <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("paye")}>Payé</PremiumButton>
                )}
                {doc.status === "envoye" && doc.type === "devis" && (
                  <>
                    <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("paye")}>Accepté</PremiumButton>
                    <button onClick={() => onUpdateStatus("refuse")} className="px-3 py-1.5 rounded-lg text-xs font-sans bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">
                      Refusé
                    </button>
                  </>
                )}
                {doc.status === "envoye" && doc.type === "contrat" && (
                  <>
                    <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("paye")}>Signé</PremiumButton>
                    <button onClick={() => onUpdateStatus("refuse")} className="px-3 py-1.5 rounded-lg text-xs font-sans bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">
                      Refusé
                    </button>
                  </>
                )}
                {doc.status === "envoye" && doc.type === "ordre_mission" && (
                  <>
                    <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("paye")}>Accepté</PremiumButton>
                    <button onClick={() => onUpdateStatus("refuse")} className="px-3 py-1.5 rounded-lg text-xs font-sans bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">
                      Refusé
                    </button>
                  </>
                )}
                {doc.status === "envoye" && doc.type === "fiche_intervention" && (
                  <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("paye")}>Terminée</PremiumButton>
                )}
                {doc.status === "envoye" && doc.type === "bon_commande" && (
                  <>
                    <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => onUpdateStatus("paye")}>Réceptionné</PremiumButton>
                    <button onClick={() => onUpdateStatus("refuse")} className="px-3 py-1.5 rounded-lg text-xs font-sans bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">
                      Refusé
                    </button>
                  </>
                )}
                <PremiumButton variant="outline" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={onEdit}>
                  Modifier
                </PremiumButton>
                <PremiumButton variant="outline" size="sm" icon={<Printer className="w-3.5 h-3.5" />} onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? "Données" : "Aperçu"}
                </PremiumButton>
                <PremiumButton variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={handleDownloadPDF} loading={pdfLoading} disabled={!organization}>
                  PDF
                </PremiumButton>
                <PremiumButton variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:bg-red-400/10"><Trash2 className="w-3.5 h-3.5" /></PremiumButton>
              </div>
            </div>

            {showPreview ? (
              <InvoicePreview doc={doc} lines={lines} clientName={getClientName(doc.client_id)} />
            ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="text-atlantic-200/40 text-xs uppercase tracking-wider border-b border-gold-400/10">
                    <th className="text-left py-3 pr-4">Description</th>
                    <th className="text-right py-3 px-2">Qté</th>
                    <th className="text-right py-3 px-2">Prix HT</th>
                    <th className="text-right py-3 px-2">TVA</th>
                    <th className="text-right py-3 pl-2">Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-b border-gold-400/5">
                      <td className="py-3 pr-4 text-white">{line.description}</td>
                      <td className="py-3 px-2 text-right text-atlantic-200/60">{line.quantity} {line.unit}</td>
                      <td className="py-3 px-2 text-right text-atlantic-200/60">{formatCurrency(line.unit_price)}</td>
                      <td className="py-3 px-2 text-right text-atlantic-200/60">{line.tva_rate}%</td>
                      <td className="py-3 pl-2 text-right font-semibold text-gold-400">{formatCurrency(line.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-atlantic-200/50">Total HT</span><span>{formatCurrency(doc.total_ht)}</span></div>
                {doc.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-atlantic-200/50">Remise</span><span className="text-red-400">-{formatCurrency(doc.discount_amount)}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-atlantic-200/50">TVA</span><span>{formatCurrency(doc.total_tva)}</span></div>
                <div className="border-t border-gold-400/20 pt-2 flex justify-between"><span className="font-semibold text-gold-400">Total TTC</span><span className="text-lg font-display font-bold animated-gold-text">{formatCurrency(doc.total_ttc)}</span></div>
              </div>
            </div>

            {doc.notes && (
              <div className="mt-6 pt-4 border-t border-gold-400/10">
                <p className="text-xs font-sans text-atlantic-200/30 mb-1">Notes</p>
                <p className="text-sm font-sans text-atlantic-200/60">{doc.notes}</p>
              </div>
            )}
            </>
            )}
          </GlassCard>
        </div>

        <div className="space-y-4">
          {verification && (
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-4">
                {verification.passed ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <h4 className="text-sm font-sans font-semibold text-white">Vérification auto</h4>
              </div>
              <div className="space-y-2">
                {verification.checks.map((check, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {check.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-xs font-sans ${check.ok ? "text-atlantic-200/60" : "text-red-400"}`}>{check.label}</p>
                      {check.detail && <p className="text-[10px] font-sans text-atlantic-200/30">{check.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`mt-3 p-2 rounded-lg text-center text-xs font-sans ${verification.passed ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                {verification.passed ? "Toutes les vérifications passent" : "Corrections nécessaires"}
              </div>
            </GlassCard>
          )}

          {showValidation && (
            <GlassCard hover={false} glow>
              <h4 className="text-sm font-sans font-semibold text-gold-400 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Validation N+1
              </h4>
              <textarea
                placeholder="Commentaire (optionnel)..."
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                rows={2}
                className="premium-input w-full text-sm resize-none mb-3"
              />
              <div className="flex gap-2">
                <PremiumButton size="sm" onClick={() => handleValidate("approve")} icon={<CheckCircle2 className="w-3.5 h-3.5" />} className="flex-1">
                  Approuver
                </PremiumButton>
                <button onClick={() => handleValidate("reject")} className="flex-1 px-3 py-2 rounded-lg text-xs font-sans bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors">
                  Rejeter
                </button>
              </div>
              <button onClick={() => handleValidate("request_changes")} className="w-full mt-2 px-3 py-2 rounded-lg text-xs font-sans text-atlantic-200/50 hover:text-amber-400 hover:bg-amber-400/10 transition-colors">
                Demander des modifications
              </button>
            </GlassCard>
          )}

          {validations.length > 0 && (
            <GlassCard hover={false}>
              <h4 className="text-sm font-sans font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-400" /> Historique validations
              </h4>
              <div className="space-y-3">
                {validations.map((v) => (
                  <div key={v.id} className="flex items-start gap-2">
                    {v.action === "approve" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5" />}
                    {v.action === "reject" && <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
                    {v.action === "request_changes" && <MessageSquare className="w-3.5 h-3.5 text-amber-400 mt-0.5" />}
                    <div>
                      <p className="text-xs font-sans text-white">
                        {v.user_name} - {v.action === "approve" ? "Approuvé" : v.action === "reject" ? "Rejeté" : "Modifications demandées"}
                      </p>
                      {v.comment && <p className="text-[10px] font-sans text-atlantic-200/40 italic">{v.comment}</p>}
                      <p className="text-[10px] font-sans text-atlantic-200/30">{new Date(v.created_at).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

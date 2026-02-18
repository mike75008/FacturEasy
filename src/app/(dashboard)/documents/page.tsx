"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { PageTransition } from "@/components/premium/page-transition";
import {
  FileText, Plus, Search, Edit2, Trash2, Eye, Send, Check, X,
  ChevronRight, Receipt, FileCheck, ArrowRight,
} from "lucide-react";
import {
  getDocuments, saveDocument, deleteDocument, deleteDocumentLines,
  getDocumentLines, saveDocumentLine, deleteDocumentLine,
  getClients, getProducts, generateDocumentNumber,
} from "@/lib/local-storage";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { calculateLineTotals as calcLine } from "@/lib/validators";
import type { Document as Doc, DocumentLine, Client, Product } from "@/types/database";

type ViewMode = "list" | "create" | "detail";
type DocTypeFilter = "all" | "facture" | "devis" | "avoir";

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
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [clients, setClientsState] = useState<Client[]>([]);
  const [products, setProductsState] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<DocTypeFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [selectedLines, setSelectedLines] = useState<DocumentLine[]>([]);

  // Create form state
  const [docType, setDocType] = useState<"facture" | "devis">("facture");
  const [clientId, setClientId] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  useEffect(() => {
    setDocuments(getDocuments());
    setClientsState(getClients());
    setProductsState(getProducts());
  }, []);

  const filtered = useMemo(() => {
    return documents
      .filter((d) => {
        const matchType = filterType === "all" || d.type === filterType;
        const matchSearch = !search || d.number.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [documents, search, filterType]);

  // Totals calculation
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
    (newLines[index] as Record<string, unknown>)[field] = value;
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

  function openCreate(type: "facture" | "devis") {
    setDocType(type);
    setClientId("");
    setDocDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setNotes("");
    setDiscountPercent(0);
    setLines([emptyLine()]);
    setEditingDocId(null);
    setView("create");
  }

  function handleSaveDocument() {
    if (!clientId) { alert("Sélectionnez un client"); return; }
    if (lines.every((l) => !l.description)) { alert("Ajoutez au moins une ligne"); return; }

    const number = editingDocId ? documents.find((d) => d.id === editingDocId)?.number || "" : generateDocumentNumber(docType);

    const doc = saveDocument({
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
      notes: notes || null,
      status: "brouillon",
    });

    // Save lines
    if (editingDocId) deleteDocumentLines(editingDocId);
    lines.forEach((line, i) => {
      if (!line.description) return;
      const t = calcLine(line);
      saveDocumentLine({
        document_id: doc.id,
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
      });
    });

    setDocuments(getDocuments());
    setView("list");
  }

  function openDetail(doc: Doc) {
    setSelectedDoc(doc);
    setSelectedLines(getDocumentLines(doc.id));
    setView("detail");
  }

  function updateStatus(doc: Doc, status: string) {
    saveDocument({ ...doc, status: status as Doc["status"] });
    setDocuments(getDocuments());
    if (selectedDoc?.id === doc.id) {
      setSelectedDoc({ ...doc, status: status as Doc["status"] });
    }
  }

  function handleDeleteDoc(id: string) {
    if (!confirm("Supprimer ce document ?")) return;
    deleteDocumentLines(id);
    deleteDocument(id);
    setDocuments(getDocuments());
    setView("list");
  }

  return (
    <PageTransition>
      <Topbar title="Documents" subtitle={`${documents.length} document${documents.length > 1 ? "s" : ""}`} />
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* ═══ LIST ═══ */}
          {view === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 p-1 rounded-lg bg-atlantic-800/30">
                    {(["all", "facture", "devis", "avoir"] as const).map((t) => (
                      <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-md text-xs font-sans transition-all ${filterType === t ? "bg-gold-400/10 text-gold-400 border border-gold-400/20" : "text-atlantic-200/40 hover:text-white"}`}>
                        {t === "all" ? "Tous" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlantic-200/30" />
                    <input type="text" placeholder="N° document..." value={search} onChange={(e) => setSearch(e.target.value)} className="premium-input pl-10 text-sm w-44" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <PremiumButton variant="outline" size="sm" icon={<FileCheck className="w-4 h-4" />} onClick={() => openCreate("devis")}>Devis</PremiumButton>
                  <PremiumButton size="sm" icon={<Receipt className="w-4 h-4" />} onClick={() => openCreate("facture")}>Facture</PremiumButton>
                </div>
              </div>

              {filtered.length === 0 ? (
                <GlassCard hover={false} className="py-20">
                  <div className="text-center">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="inline-block">
                      <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6"><FileText className="w-10 h-10 text-gold-400/40" /></div>
                    </motion.div>
                    <h3 className="text-xl font-display font-semibold text-white mb-2">Aucun document</h3>
                    <p className="text-sm font-sans text-atlantic-200/40">Créez votre première facture ou devis</p>
                  </div>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {filtered.map((doc, i) => {
                    const st = STATUS_LABELS[doc.status] || STATUS_LABELS.brouillon;
                    return (
                      <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => openDetail(doc)} className="flex items-center gap-4 p-4 rounded-xl border border-gold-400/5 bg-atlantic-800/20 hover:border-gold-400/20 hover:bg-atlantic-800/30 transition-all cursor-pointer group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-sans font-bold ${doc.type === "facture" ? "bg-emerald-400/10 text-emerald-400" : doc.type === "devis" ? "bg-blue-400/10 text-blue-400" : "bg-amber-400/10 text-amber-400"}`}>
                          {doc.type === "facture" ? "FAC" : doc.type === "devis" ? "DEV" : "AVO"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-sans font-medium text-white">{doc.number}</p>
                          <p className="text-xs font-sans text-atlantic-200/40">{getClientName(doc.client_id)} • {formatDateShort(doc.date)}</p>
                        </div>
                        <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                        <p className="text-sm font-sans font-semibold text-gold-400">{formatCurrency(doc.total_ttc)}</p>
                        <ChevronRight className="w-4 h-4 text-atlantic-200/20 group-hover:text-gold-400/50 transition-colors" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ CREATE / EDIT ═══ */}
          {view === "create" && (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm font-sans text-atlantic-200/40 hover:text-gold-400 transition-colors mb-4">← Retour</button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main form */}
                <div className="lg:col-span-2 space-y-4">
                  <GlassCard hover={false}>
                    <h3 className="text-lg font-display font-semibold mb-4">
                      {docType === "facture" ? "Nouvelle facture" : "Nouveau devis"}
                    </h3>
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
                      <PremiumInput label="Échéance" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      <PremiumInput label="Remise globale (%)" type="number" value={String(discountPercent)} onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} />
                    </div>
                  </GlassCard>

                  {/* Lines */}
                  <GlassCard hover={false}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-display font-semibold">Lignes</h3>
                      <PremiumButton variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={addLine}>Ligne</PremiumButton>
                    </div>
                    <div className="space-y-3">
                      {lines.map((line, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-atlantic-800/20 border border-gold-400/5 space-y-3">
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
                        </motion.div>
                      ))}
                    </div>
                  </GlassCard>

                  <div className="mt-4">
                    <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Notes / Conditions</label>
                    <textarea placeholder="Conditions de paiement, mentions particulières..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="premium-input w-full resize-none" />
                  </div>
                </div>

                {/* Sidebar totals */}
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
                        <PremiumButton onClick={handleSaveDocument} className="w-full" icon={<Check className="w-4 h-4" />}>
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
            </motion.div>
          )}

          {/* ═══ DETAIL ═══ */}
          {view === "detail" && selectedDoc && (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm font-sans text-atlantic-200/40 hover:text-gold-400 transition-colors mb-4">← Retour</button>

              <GlassCard hover={false}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-display font-bold text-white">{selectedDoc.number}</h3>
                      <span className={`text-xs font-sans px-2 py-0.5 rounded-full ${(STATUS_LABELS[selectedDoc.status] || STATUS_LABELS.brouillon).color}`}>
                        {(STATUS_LABELS[selectedDoc.status] || STATUS_LABELS.brouillon).label}
                      </span>
                    </div>
                    <p className="text-sm font-sans text-atlantic-200/40">
                      {getClientName(selectedDoc.client_id)} • {formatDateShort(selectedDoc.date)}
                      {selectedDoc.due_date && ` • Échéance : ${formatDateShort(selectedDoc.due_date)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {selectedDoc.status === "brouillon" && (
                      <PremiumButton size="sm" icon={<Send className="w-3.5 h-3.5" />} onClick={() => updateStatus(selectedDoc, "envoye")}>Envoyer</PremiumButton>
                    )}
                    {selectedDoc.status === "envoye" && (
                      <PremiumButton size="sm" icon={<Check className="w-3.5 h-3.5" />} onClick={() => updateStatus(selectedDoc, "paye")}>Marquer payé</PremiumButton>
                    )}
                    <PremiumButton variant="ghost" size="sm" onClick={() => handleDeleteDoc(selectedDoc.id)} className="text-red-400 hover:bg-red-400/10"><Trash2 className="w-3.5 h-3.5" /></PremiumButton>
                  </div>
                </div>

                {/* Lines table */}
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
                      {selectedLines.map((line) => (
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

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-atlantic-200/50">Total HT</span><span>{formatCurrency(selectedDoc.total_ht)}</span></div>
                    {selectedDoc.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-atlantic-200/50">Remise</span><span className="text-red-400">-{formatCurrency(selectedDoc.discount_amount)}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-atlantic-200/50">TVA</span><span>{formatCurrency(selectedDoc.total_tva)}</span></div>
                    <div className="border-t border-gold-400/20 pt-2 flex justify-between"><span className="font-semibold text-gold-400">Total TTC</span><span className="text-lg font-display font-bold animated-gold-text">{formatCurrency(selectedDoc.total_ttc)}</span></div>
                  </div>
                </div>

                {selectedDoc.notes && (
                  <div className="mt-6 pt-4 border-t border-gold-400/10">
                    <p className="text-xs font-sans text-atlantic-200/30 mb-1">Notes</p>
                    <p className="text-sm font-sans text-atlantic-200/60">{selectedDoc.notes}</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

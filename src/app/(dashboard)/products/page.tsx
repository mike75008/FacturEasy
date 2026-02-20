"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Package, Plus, Search, Edit2, Trash2, Tag, Check, X,
} from "lucide-react";
import { getProducts, saveProduct, deleteProduct } from "@/lib/local-storage";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/database";

const UNITS = [
  "unité", "heure", "jour", "forfait", "m²", "m³", "ml", "kg", "tonne", "litre", "lot", "page", "mot",
];

const TVA_RATES = [
  { value: 0, label: "0% (Exonéré)" },
  { value: 5.5, label: "5.5% (Réduit)" },
  { value: 10, label: "10% (Intermédiaire)" },
  { value: 20, label: "20% (Normal)" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const filtered = useMemo(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  function openNew() {
    setEditing({ unit: "unité", tva_rate: 20, unit_price: 0, is_active: true });
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditing({ ...product });
    setShowForm(true);
  }

  function handleSave() {
    if (!editing || !editing.name) return;
    saveProduct(editing);
    setProducts(getProducts());
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce produit ?")) return;
    deleteProduct(id);
    setProducts(getProducts());
  }

  return (
    <PageTransition>
      <Topbar title="Produits & Services" subtitle={`${products.length} produit${products.length > 1 ? "s" : ""}`} />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlantic-200/30" />
            <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="premium-input w-full pl-10 text-sm" />
          </div>
          <PremiumButton size="sm" icon={<Plus className="w-4 h-4" />} onClick={openNew}>
            Nouveau produit
          </PremiumButton>
        </div>

        {/* Form modal */}
        {showForm && editing && (
          <div className="mb-6">
            <GlassCard hover={false}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-display font-semibold">
                  {editing.id ? "Modifier le produit" : "Nouveau produit / service"}
                </h3>
                <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-atlantic-200/30 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PremiumInput label="Nom *" placeholder="Consultation" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="lg:col-span-2" />
                <PremiumInput label="Catégorie" placeholder="Service, Matériel..." value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                <div>
                  <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Unité</label>
                  <select value={editing.unit || "unité"} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} className="premium-input w-full text-sm">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <PremiumInput label="Prix unitaire HT (€) *" type="number" step="0.01" placeholder="0.00" value={String(editing.unit_price || "")} onChange={(e) => setEditing({ ...editing, unit_price: parseFloat(e.target.value) || 0 })} />
                <div>
                  <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Taux TVA</label>
                  <select value={editing.tva_rate ?? 20} onChange={(e) => setEditing({ ...editing, tva_rate: parseFloat(e.target.value) })} className="premium-input w-full text-sm">
                    {TVA_RATES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <PremiumInput label="Description" placeholder="Description détaillée..." value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="lg:col-span-2" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <PremiumButton variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Annuler</PremiumButton>
                <PremiumButton onClick={handleSave} icon={<Check className="w-4 h-4" />}>
                  {editing.id ? "Mettre à jour" : "Créer"}
                </PremiumButton>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Product list */}
        {filtered.length === 0 && !showForm ? (
          <GlassCard hover={false} className="py-20">
            <div className="text-center">
              <div className="inline-block animate-float">
                <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-gold-400/40" />
                </div>
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">
                {search ? "Aucun résultat" : "Catalogue vide"}
              </h3>
              <p className="text-sm font-sans text-atlantic-200/40">
                {search ? "Essayez un autre terme" : "Ajoutez vos produits et services"}
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-gold-400/5 bg-atlantic-800/20 hover:border-gold-400/20 hover:bg-atlantic-800/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-gold-400/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-sans font-medium text-white truncate">{product.name}</p>
                    {product.category && (
                      <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-atlantic-600/30 text-atlantic-200/50">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-sans text-atlantic-200/40">
                    {product.unit} • TVA {product.tva_rate}%
                    {product.description && ` • ${product.description}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-sans font-semibold text-gold-400">
                    {formatCurrency(product.unit_price)}
                  </p>
                  <p className="text-[10px] font-sans text-atlantic-200/30">HT / {product.unit}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-gold-400/10 text-atlantic-200/30 hover:text-gold-400 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg hover:bg-red-400/10 text-atlantic-200/30 hover:text-red-400 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

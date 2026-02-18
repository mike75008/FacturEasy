"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PremiumButton } from "@/components/premium/premium-button";
import { PremiumInput } from "@/components/premium/premium-input";
import { PageTransition } from "@/components/premium/page-transition";
import {
  Users, Plus, Search, UserPlus, Building2, Star, Edit2, Trash2,
  Phone, Mail, MapPin, X, ChevronRight, Filter,
} from "lucide-react";
import { getClients, saveClient, deleteClient } from "@/lib/local-storage";
import type { Client } from "@/types/database";

type ViewMode = "list" | "form" | "detail";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "particulier" | "professionnel">("all");
  const [view, setView] = useState<ViewMode>("list");
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    setClients(getClients());
  }, []);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const name = (c.company_name || `${c.first_name || ""} ${c.last_name || ""}`).toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || (c.email || "").toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || c.type === filterType;
      return matchSearch && matchType;
    });
  }, [clients, search, filterType]);

  function openNewClient(type: "particulier" | "professionnel") {
    setEditingClient({ type, country: "FR" });
    setView("form");
  }

  function openEditClient(client: Client) {
    setEditingClient({ ...client });
    setView("form");
  }

  function openDetailClient(client: Client) {
    setSelectedClient(client);
    setView("detail");
  }

  function handleSave() {
    if (!editingClient) return;
    saveClient(editingClient);
    setClients(getClients());
    setView("list");
    setEditingClient(null);
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce client ?")) return;
    deleteClient(id);
    setClients(getClients());
    setView("list");
    setSelectedClient(null);
  }

  function updateField(field: keyof Client, value: string) {
    setEditingClient((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function getClientName(c: Client): string {
    return c.company_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Sans nom";
  }

  return (
    <PageTransition>
      <Topbar title="Clients" subtitle={`${clients.length} client${clients.length > 1 ? "s" : ""}`} />
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* ═══ LIST VIEW ═══ */}
          {view === "list" && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Toolbar */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-atlantic-200/30" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="premium-input w-full pl-10 text-sm"
                    />
                  </div>
                  <div className="flex gap-1 p-1 rounded-lg bg-atlantic-800/30">
                    {(["all", "professionnel", "particulier"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`px-3 py-1.5 rounded-md text-xs font-sans transition-all ${
                          filterType === t
                            ? "bg-gold-400/10 text-gold-400 border border-gold-400/20"
                            : "text-atlantic-200/40 hover:text-white"
                        }`}
                      >
                        {t === "all" ? "Tous" : t === "professionnel" ? "Pro" : "Particulier"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <PremiumButton variant="outline" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => openNewClient("particulier")}>
                    Particulier
                  </PremiumButton>
                  <PremiumButton size="sm" icon={<Building2 className="w-4 h-4" />} onClick={() => openNewClient("professionnel")}>
                    Entreprise
                  </PremiumButton>
                </div>
              </div>

              {/* Client list or empty state */}
              {filtered.length === 0 ? (
                <GlassCard hover={false} className="py-20">
                  <div className="text-center">
                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="inline-block">
                      <div className="w-20 h-20 rounded-2xl bg-gold-400/10 flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-gold-400/40" />
                      </div>
                    </motion.div>
                    <h3 className="text-xl font-display font-semibold text-white mb-2">
                      {search ? "Aucun résultat" : "Votre portefeuille clients est vide"}
                    </h3>
                    <p className="text-sm font-sans text-atlantic-200/40 max-w-md mx-auto">
                      {search ? "Essayez un autre terme de recherche" : "Ajoutez votre premier client pour commencer"}
                    </p>
                  </div>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {filtered.map((client, i) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => openDetailClient(client)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-gold-400/5 bg-atlantic-800/20 hover:border-gold-400/20 hover:bg-atlantic-800/30 transition-all cursor-pointer group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-sans font-bold ${
                        client.type === "professionnel"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-violet-400/10 text-violet-400"
                      }`}>
                        {client.type === "professionnel"
                          ? (client.company_name || "?")[0].toUpperCase()
                          : (client.first_name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans font-medium text-white truncate">
                          {getClientName(client)}
                        </p>
                        <p className="text-xs font-sans text-atlantic-200/40 truncate">
                          {client.email || "Pas d'email"} {client.city ? `• ${client.city}` : ""}
                        </p>
                      </div>
                      <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${
                        client.type === "professionnel"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-violet-400/10 text-violet-400"
                      }`}>
                        {client.type === "professionnel" ? "PRO" : "PART"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-atlantic-200/20 group-hover:text-gold-400/50 transition-colors" />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ FORM VIEW ═══ */}
          {view === "form" && editingClient && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => { setView("list"); setEditingClient(null); }} className="flex items-center gap-1 text-sm font-sans text-atlantic-200/40 hover:text-gold-400 transition-colors mb-4">
                ← Retour à la liste
              </button>
              <GlassCard hover={false}>
                <h3 className="text-xl font-display font-semibold mb-6">
                  {editingClient.id ? "Modifier le client" : `Nouveau client ${editingClient.type === "professionnel" ? "professionnel" : "particulier"}`}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {editingClient.type === "professionnel" && (
                    <>
                      <PremiumInput label="Raison sociale *" placeholder="Nom de l'entreprise" value={editingClient.company_name || ""} onChange={(e) => updateField("company_name", e.target.value)} className="md:col-span-2" />
                      <PremiumInput label="SIRET" placeholder="123 456 789 00012" value={editingClient.siret || ""} onChange={(e) => updateField("siret", e.target.value)} />
                      <PremiumInput label="N° TVA" placeholder="FR12345678901" value={editingClient.tva_number || ""} onChange={(e) => updateField("tva_number", e.target.value)} />
                    </>
                  )}
                  <PremiumInput label="Prénom" placeholder="Jean" value={editingClient.first_name || ""} onChange={(e) => updateField("first_name", e.target.value)} />
                  <PremiumInput label="Nom" placeholder="Dupont" value={editingClient.last_name || ""} onChange={(e) => updateField("last_name", e.target.value)} />
                  <PremiumInput label="Email" type="email" placeholder="client@email.com" value={editingClient.email || ""} onChange={(e) => updateField("email", e.target.value)} />
                  <PremiumInput label="Téléphone" placeholder="+33 6 12 34 56 78" value={editingClient.phone || ""} onChange={(e) => updateField("phone", e.target.value)} />
                  <PremiumInput label="Adresse" placeholder="123 rue Example" value={editingClient.address || ""} onChange={(e) => updateField("address", e.target.value)} className="md:col-span-2" />
                  <PremiumInput label="Code postal" placeholder="75001" value={editingClient.postal_code || ""} onChange={(e) => updateField("postal_code", e.target.value)} />
                  <PremiumInput label="Ville" placeholder="Paris" value={editingClient.city || ""} onChange={(e) => updateField("city", e.target.value)} />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-sans font-medium text-gold-300 mb-2">Notes</label>
                  <textarea
                    placeholder="Notes internes sur ce client..."
                    value={editingClient.notes || ""}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    className="premium-input w-full resize-none"
                  />
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <PremiumButton variant="ghost" onClick={() => { setView("list"); setEditingClient(null); }}>
                    Annuler
                  </PremiumButton>
                  <PremiumButton onClick={handleSave} icon={<Plus className="w-4 h-4" />}>
                    {editingClient.id ? "Mettre à jour" : "Créer le client"}
                  </PremiumButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ═══ DETAIL VIEW ═══ */}
          {view === "detail" && selectedClient && (
            <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <button onClick={() => { setView("list"); setSelectedClient(null); }} className="flex items-center gap-1 text-sm font-sans text-atlantic-200/40 hover:text-gold-400 transition-colors mb-4">
                ← Retour à la liste
              </button>
              <GlassCard hover={false}>
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-display font-bold ${
                      selectedClient.type === "professionnel"
                        ? "bg-blue-400/10 text-blue-400"
                        : "bg-violet-400/10 text-violet-400"
                    }`}>
                      {selectedClient.type === "professionnel"
                        ? (selectedClient.company_name || "?")[0].toUpperCase()
                        : (selectedClient.first_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-semibold text-white">
                        {getClientName(selectedClient)}
                      </h3>
                      <span className={`text-xs font-sans px-2 py-0.5 rounded-full ${
                        selectedClient.type === "professionnel"
                          ? "bg-blue-400/10 text-blue-400"
                          : "bg-violet-400/10 text-violet-400"
                      }`}>
                        {selectedClient.type === "professionnel" ? "Professionnel" : "Particulier"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <PremiumButton variant="outline" size="sm" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openEditClient(selectedClient)}>
                      Modifier
                    </PremiumButton>
                    <PremiumButton variant="ghost" size="sm" onClick={() => handleDelete(selectedClient.id)} className="text-red-400 hover:bg-red-400/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </PremiumButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-sans font-semibold text-gold-400/80 uppercase tracking-wider">Contact</h4>
                    {selectedClient.email && (
                      <div className="flex items-center gap-3 text-sm font-sans text-atlantic-200/70">
                        <Mail className="w-4 h-4 text-atlantic-200/30" /> {selectedClient.email}
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div className="flex items-center gap-3 text-sm font-sans text-atlantic-200/70">
                        <Phone className="w-4 h-4 text-atlantic-200/30" /> {selectedClient.phone}
                      </div>
                    )}
                    {(selectedClient.address || selectedClient.city) && (
                      <div className="flex items-center gap-3 text-sm font-sans text-atlantic-200/70">
                        <MapPin className="w-4 h-4 text-atlantic-200/30" />
                        {[selectedClient.address, selectedClient.postal_code, selectedClient.city].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-sans font-semibold text-gold-400/80 uppercase tracking-wider">Informations</h4>
                    {selectedClient.siret && (
                      <p className="text-sm font-sans text-atlantic-200/70">SIRET : <span className="text-white font-mono">{selectedClient.siret}</span></p>
                    )}
                    {selectedClient.tva_number && (
                      <p className="text-sm font-sans text-atlantic-200/70">TVA : <span className="text-white font-mono">{selectedClient.tva_number}</span></p>
                    )}
                    {selectedClient.notes && (
                      <div>
                        <p className="text-xs font-sans text-atlantic-200/40 mb-1">Notes :</p>
                        <p className="text-sm font-sans text-atlantic-200/70">{selectedClient.notes}</p>
                      </div>
                    )}
                    <p className="text-xs font-sans text-atlantic-200/30">
                      Créé le {new Date(selectedClient.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

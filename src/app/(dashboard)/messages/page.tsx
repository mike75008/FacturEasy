"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { GlassCard } from "@/components/premium/glass-card";
import { PageTransition } from "@/components/premium/page-transition";
import { CheckCircle2, Inbox, Plus, Trash2, Send, X, AlertCircle } from "lucide-react";
import {
  getTickets, markTicketRead, resolveTicket, deleteTicket,
  addTicketActivity, createTicket,
} from "@/lib/tickets";
import type { Ticket, TicketActivity, TicketPriority } from "@/lib/tickets";

function formatDatetime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

const STATUS_CONFIG = {
  open:     { bg: "bg-violet-400/10 text-violet-400",   label: "Ouvert", dot: "bg-violet-400"  },
  resolved: { bg: "bg-emerald-400/10 text-emerald-400", label: "Résolu", dot: "bg-emerald-400" },
};

const INCIDENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  bug:         { label: "Bug",         color: "bg-red-400/10 text-red-400"              },
  data:        { label: "Données",     color: "bg-blue-400/10 text-blue-400"            },
  facturation: { label: "Facturation", color: "bg-amber-400/10 text-amber-400"          },
  compte:      { label: "Compte",      color: "bg-violet-400/10 text-violet-400"        },
  performance: { label: "Performance", color: "bg-orange-400/10 text-orange-400"        },
  autre:       { label: "Autre",       color: "bg-atlantic-400/10 text-atlantic-200/60" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; sla: string; color: string; border: string; dot: string }> = {
  critical: { label: "Critique", sla: "< 4h",  color: "bg-red-400/10 text-red-400",    border: "border-red-400/40",    dot: "bg-red-400"    },
  high:     { label: "Haute",    sla: "< 24h", color: "bg-orange-400/10 text-orange-400", border: "border-orange-400/40", dot: "bg-orange-400" },
  normal:   { label: "Normale",  sla: "< 72h", color: "bg-amber-400/10 text-amber-400",  border: "border-amber-400/40",  dot: "bg-amber-400"  },
  low:      { label: "Basse",    sla: "< 7j",  color: "bg-blue-400/10 text-blue-400",    border: "border-blue-400/40",   dot: "bg-blue-400"   },
};

const ACTIVITY_CONFIG: Record<string, { label: string; dot: string }> = {
  created:  { label: "Ticket créé",   dot: "bg-violet-400"  },
  resolved: { label: "Marqué résolu", dot: "bg-emerald-400" },
  note:     { label: "Note ajoutée",  dot: "bg-gold-400"    },
  reopened: { label: "Réouvert",      dot: "bg-orange-400"  },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setTickets(getTickets());
  }, []);

  function refresh(selectId?: string) {
    const updated = getTickets();
    setTickets(updated);
    if (selectId !== undefined) {
      setSelected(updated.find((t) => t.id === selectId) ?? null);
    }
  }

  function handleSelect(ticket: Ticket) {
    setShowForm(false);
    markTicketRead(ticket.id);
    refresh(ticket.id);
  }

  function handleResolve(id: string) {
    resolveTicket(id);
    refresh(id);
  }

  function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce ticket définitivement ?")) return;
    deleteTicket(id);
    setSelected(null);
    refresh();
  }

  function handleAddActivity(id: string, note: string) {
    addTicketActivity(id, "note", note);
    refresh(id);
  }

  function handleFormSubmit(ticket: Ticket) {
    refresh(ticket.id);
    setShowForm(false);
  }

  function seedTestTicket() {
    createTicket(
      "Bouton 'Générer un avoir' absent sur facture Envoyée",
      "J'ai envoyé une facture avec le mauvais montant. Je ne trouve pas le bouton pour créer un avoir — la facture est en statut Envoyée.",
      [
        { role: "user", content: "J'ai envoyé une facture avec le mauvais montant, comment je fais ?" },
        { role: "assistant", content: "Tu veux corriger une facture déjà envoyée — c'est une situation courante. En droit français, une facture émise ne peut pas être modifiée directement. Tu dois émettre un avoir pour annuler la facture incorrecte, puis créer une nouvelle facture avec le bon montant." },
        { role: "user", content: "Oui mais dans l'appli je ne trouve pas le bouton avoir" },
        { role: "assistant", content: "Dans la page Documents, ouvre la facture concernée — en bas à gauche tu devrais voir un bouton \"Générer un avoir\". Quel est le statut actuel de ta facture ?" },
        { role: "user", content: "Je ne vois toujours pas le bouton, la facture est en statut Envoyée" },
        { role: "assistant", content: "Je ne parviens pas à identifier pourquoi le bouton n'apparaît pas — je préfère escalader ce point au support." },
      ],
      {
        natureIncident: "Le bouton 'Générer un avoir' n'apparaît pas sur une facture en statut Envoyée",
        commentArrive: "En ouvrant la facture FAC-2024-0087 depuis la page Documents, aucun bouton avoir visible nulle part",
        depuisQuand: "aujourd'hui",
        nbPersonnesImpactees: 1,
        testsRealises: "Recherche visuelle complète, scroll haut et bas, vérification du menu contextuel",
        testsCroises: "Chrome + Firefox",
        rebootTente: true,
        typeIncident: "bug",
        priority: "high",
      }
    );
    refresh();
  }

  const open = tickets.filter((t) => t.status === "open");
  const resolved = tickets.filter((t) => t.status === "resolved");

  return (
    <PageTransition>
      <div className="flex flex-col h-screen">
        <Topbar
          title="Messages"
          subtitle="File de support — escalades Helena"
          rightExtra={
            <button
              onClick={seedTestTicket}
              className="text-[10px] font-sans px-3 py-1.5 rounded-lg border border-dashed border-atlantic-200/20 text-atlantic-200/40 hover:text-gold-400 hover:border-gold-400/30 transition-all"
            >
              ⚙ Simuler un ticket
            </button>
          }
        />

        <div className="flex flex-1 overflow-hidden">

          {/* ── Liste gauche ── */}
          <div className="w-[380px] flex-shrink-0 border-r border-gold-400/10 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gold-400/10 flex items-center justify-between">
              <p className="text-xs font-sans font-semibold text-white">Tickets support</p>
              <button
                onClick={() => { setShowForm(true); setSelected(null); }}
                className="flex items-center gap-1 text-[10px] font-sans px-2.5 py-1 rounded-lg bg-violet-400/10 text-violet-300 hover:bg-violet-400/20 transition-all"
              >
                <Plus className="w-3 h-3" />
                Nouveau ticket
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-atlantic-800/60 flex items-center justify-center">
                    <Inbox className="w-6 h-6 text-atlantic-200/30" />
                  </div>
                  <div>
                    <p className="text-xs font-sans font-semibold text-white mb-1">Aucun ticket</p>
                    <p className="text-[10px] font-sans text-atlantic-200/40">
                      Helena escalade ici les problèmes qu&apos;elle ne peut pas résoudre seule.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  {open.length > 0 && (
                    <div>
                      <div className="px-4 py-2">
                        <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest">
                          En attente · {open.length}
                        </p>
                      </div>
                      {open.map((t) => (
                        <TicketRow key={t.id} ticket={t} isSelected={selected?.id === t.id && !showForm} onClick={() => handleSelect(t)} />
                      ))}
                    </div>
                  )}
                  {resolved.length > 0 && (
                    <div className={open.length > 0 ? "mt-4" : ""}>
                      <div className="px-4 py-2">
                        <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest">
                          Résolus · {resolved.length}
                        </p>
                      </div>
                      {resolved.map((t) => (
                        <TicketRow key={t.id} ticket={t} isSelected={selected?.id === t.id && !showForm} onClick={() => handleSelect(t)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Panneau droit ── */}
          <div className="flex-1 overflow-y-auto">
            {showForm ? (
              <NewTicketForm
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
            ) : selected ? (
              <TicketDetail
                ticket={selected}
                onResolve={() => handleResolve(selected.id)}
                onDelete={() => handleDelete(selected.id)}
                onAddActivity={(note) => handleAddActivity(selected.id, note)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-atlantic-800/60 flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-atlantic-200/30" />
                </div>
                <div>
                  <p className="text-sm font-sans font-semibold text-white mb-1">Sélectionnez un ticket</p>
                  <p className="text-xs font-sans text-atlantic-200/40">
                    Cliquez sur un ticket pour afficher sa fiche, ou créez-en un nouveau.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}

// ── Ligne liste ────────────────────────────────────────────────────────────

function TicketRow({ ticket, isSelected, onClick }: {
  ticket: Ticket; isSelected: boolean; onClick: () => void;
}) {
  const isOpen = ticket.status === "open";
  const cfg = isOpen ? STATUS_CONFIG.open : STATUS_CONFIG.resolved;
  const pCfg = PRIORITY_CONFIG[ticket.priority ?? "normal"];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all ${
        isSelected ? "bg-violet-400/[0.08] border-r-2 border-violet-400" : "hover:bg-atlantic-800/30"
      }`}
    >
      {/* Badge TKT avec barre priorité */}
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-sans font-bold ${
          isOpen ? "bg-violet-400/10 text-violet-300" : "bg-emerald-400/10 text-emerald-300"
        }`}>
          TKT
        </div>
        {/* Indicateur priorité en bas à droite */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-atlantic-900 ${pCfg.dot}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {/* Numéro de ticket — lisible */}
          <span className="text-[10px] font-sans font-bold text-atlantic-200/60 tracking-wide">{ticket.id}</span>
          <span className={`text-[9px] font-sans px-1.5 py-0.5 rounded-full ${cfg.bg}`}>{cfg.label}</span>
          {!ticket.read && isOpen && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot} animate-pulse`} />}
        </div>
        <p className="text-xs font-sans font-semibold text-white leading-snug line-clamp-1">{ticket.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[9px] font-sans font-semibold ${pCfg.color.split(" ")[1]}`}>
            {pCfg.label} · {pCfg.sla}
          </span>
          <span className="text-[9px] font-sans text-atlantic-200/30">·</span>
          <span className="text-[9px] font-sans text-atlantic-200/40">{formatDatetime(ticket.createdAt)}</span>
        </div>
        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
          <p className="text-[9px] font-sans text-gold-400/50 mt-0.5">modifié {formatDatetime(ticket.updatedAt)}</p>
        )}
      </div>
    </button>
  );
}

// ── Formulaire nouveau ticket ──────────────────────────────────────────────

function NewTicketForm({ onSubmit, onCancel }: {
  onSubmit: (ticket: Ticket) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [typeIncident, setTypeIncident] = useState<Ticket["typeIncident"]>(null);
  const [natureIncident, setNatureIncident] = useState("");
  const [commentArrive, setCommentArrive] = useState("");
  const [depuisQuand, setDepuisQuand] = useState("");
  const [nbPersonnesImpactees, setNbPersonnesImpactees] = useState<string>("");
  const [testsCroises, setTestsCroises] = useState("");
  const [rebootTente, setRebootTente] = useState<"" | "true" | "false">("");
  const [testsRealises, setTestsRealises] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isValid = title.trim() && typeIncident && natureIncident.trim();

  function handleSubmit() {
    setSubmitted(true);
    if (!isValid) return;
    const ticket = createTicket(title.trim(), natureIncident.trim(), [], {
      priority,
      typeIncident,
      natureIncident: natureIncident.trim(),
      commentArrive: commentArrive.trim() || null,
      depuisQuand: depuisQuand.trim() || null,
      nbPersonnesImpactees: nbPersonnesImpactees ? parseInt(nbPersonnesImpactees, 10) : null,
      testsCroises: testsCroises.trim() || null,
      rebootTente: rebootTente === "true" ? true : rebootTente === "false" ? false : null,
      testsRealises: testsRealises.trim() || null,
    });
    onSubmit(ticket);
  }

  function fieldError(val: string | null | undefined) {
    return submitted && !val?.toString().trim()
      ? "border-red-400/40 focus:border-red-400/60"
      : "border-white/5 focus:border-violet-400/30";
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-sans font-bold text-white">Nouveau ticket support</h2>
          <p className="text-xs font-sans text-atlantic-200/40 mt-0.5">
            Les champs marqués <span className="text-red-400">*</span> sont obligatoires
          </p>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-atlantic-200/30 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section Identification */}
      <GlassCard hover={false}>
        <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest mb-3">
          Identification
        </p>
        <div className="space-y-3">

          {/* Titre */}
          <div>
            <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
              Titre du ticket <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Résumé court du problème"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-atlantic-800/40 border rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none transition-colors ${fieldError(title)}`}
            />
            {submitted && !title.trim() && (
              <p className="text-[10px] font-sans text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Champ obligatoire
              </p>
            )}
          </div>

          {/* Priorité */}
          <div>
            <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
              Priorité <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["critical", "high", "normal", "low"] as const).map((p) => {
                const pCfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl text-center transition-all border ${
                      priority === p
                        ? `${pCfg.color} ${pCfg.border}`
                        : "text-atlantic-200/40 border-white/5 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${priority === p ? pCfg.dot : "bg-atlantic-200/20"}`} />
                    <span className="text-[10px] font-sans font-bold leading-tight">{pCfg.label}</span>
                    <span className="text-[9px] font-sans opacity-70">{pCfg.sla}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type d'incident */}
          <div>
            <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
              Type d&apos;incident <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(["bug", "facturation", "compte", "data", "performance", "autre"] as const).map((type) => {
                const cfg = INCIDENT_TYPE_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => setTypeIncident(type)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-sans font-medium transition-all border ${
                      typeIncident === type
                        ? `${cfg.color} border-current`
                        : "text-atlantic-200/40 border-white/5 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            {submitted && !typeIncident && (
              <p className="text-[10px] font-sans text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Sélectionnez un type
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Section Description incident */}
      <GlassCard hover={false}>
        <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest mb-3">
          Description de l&apos;incident
        </p>
        <div className="space-y-3">

          <div>
            <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
              Nature du problème — ce qui se passe exactement <span className="text-red-400">*</span>
            </label>
            <textarea
              placeholder="Décrivez précisément ce qui se passe, ce que l'utilisateur voit ou ne voit pas…"
              value={natureIncident}
              onChange={(e) => setNatureIncident(e.target.value)}
              rows={3}
              className={`w-full bg-atlantic-800/40 border rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none transition-colors resize-none ${fieldError(natureIncident)}`}
            />
            {submitted && !natureIncident.trim() && (
              <p className="text-[10px] font-sans text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Champ obligatoire
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
              Comment c&apos;est arrivé — étapes pour reproduire
            </label>
            <textarea
              placeholder="Quelles actions ont précédé le problème ? Sur quelle page ? Après quelle manipulation ?"
              value={commentArrive}
              onChange={(e) => setCommentArrive(e.target.value)}
              rows={2}
              className="w-full bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none focus:border-violet-400/30 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
                Depuis quand
              </label>
              <input
                type="text"
                placeholder="ex : ce matin, depuis hier soir…"
                value={depuisQuand}
                onChange={(e) => setDepuisQuand(e.target.value)}
                className="w-full bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none focus:border-violet-400/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
                Personnes impactées
              </label>
              <input
                type="number"
                min="1"
                placeholder="Nombre"
                value={nbPersonnesImpactees}
                onChange={(e) => setNbPersonnesImpactees(e.target.value)}
                className="w-full bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none focus:border-violet-400/30 transition-colors"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Section Tests */}
      <GlassCard hover={false}>
        <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest mb-3">
          Tests réalisés
        </p>
        <div className="space-y-3">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
                Testé sur autre navigateur / appareil
              </label>
              <input
                type="text"
                placeholder="ex : Chrome + Firefox, iPhone Safari…"
                value={testsCroises}
                onChange={(e) => setTestsCroises(e.target.value)}
                className="w-full bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none focus:border-violet-400/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
                Rechargement de page tenté
              </label>
              <select
                value={rebootTente}
                onChange={(e) => setRebootTente(e.target.value as "" | "true" | "false")}
                className="w-full bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-sans text-white focus:outline-none focus:border-violet-400/30 transition-colors"
              >
                <option value="">— Non renseigné</option>
                <option value="true">✅ Oui</option>
                <option value="false">⚠ Non</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold text-atlantic-200/50 mb-1.5">
              Actions déjà tentées par l&apos;utilisateur
            </label>
            <textarea
              placeholder="Ce que l'utilisateur a déjà essayé de faire pour résoudre le problème…"
              value={testsRealises}
              onChange={(e) => setTestsRealises(e.target.value)}
              rows={2}
              className="w-full bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-sm font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none focus:border-violet-400/30 transition-colors resize-none"
            />
          </div>
        </div>
      </GlassCard>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-400/15 text-violet-300 hover:bg-violet-400/25 text-sm font-sans font-semibold transition-all border border-violet-400/20"
        >
          <Plus className="w-4 h-4" />
          Créer le ticket
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-sans text-atlantic-200/40 hover:text-white border border-white/5 hover:border-white/15 transition-all"
        >
          Annuler
        </button>
      </div>

    </div>
  );
}

// ── Fiche détail ───────────────────────────────────────────────────────────

function TicketDetail({ ticket, onResolve, onDelete, onAddActivity }: {
  ticket: Ticket;
  onResolve: () => void;
  onDelete: () => void;
  onAddActivity: (note: string) => void;
}) {
  const [noteInput, setNoteInput] = useState("");
  const isOpen = ticket.status === "open";
  const cfg = isOpen ? STATUS_CONFIG.open : STATUS_CONFIG.resolved;
  const pCfg = PRIORITY_CONFIG[ticket.priority ?? "normal"];
  const incidentType = ticket.typeIncident ? INCIDENT_TYPE_CONFIG[ticket.typeIncident] : null;
  const activities: TicketActivity[] = ticket.activities ?? [];

  const hasIncidentFields =
    ticket.natureIncident || ticket.commentArrive || ticket.depuisQuand ||
    ticket.nbPersonnesImpactees != null || ticket.testsCroises != null ||
    ticket.rebootTente != null || ticket.testsRealises;

  function submitNote() {
    const note = noteInput.trim();
    if (!note) return;
    onAddActivity(note);
    setNoteInput("");
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">

      {/* En-tête */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[11px] font-sans font-bold flex-shrink-0 ${
          isOpen ? "bg-violet-400/10 text-violet-300" : "bg-emerald-400/10 text-emerald-300"
        }`}>
          TKT
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {/* Numéro de ticket — bien visible */}
            <span className="text-sm font-sans font-bold text-white tracking-wide">{ticket.id}</span>
            <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${cfg.bg}`}>{cfg.label}</span>
            <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full font-semibold ${pCfg.color}`}>
              {pCfg.label} · {pCfg.sla}
            </span>
            {incidentType && (
              <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${incidentType.color}`}>
                {incidentType.label}
              </span>
            )}
          </div>
          <h2 className="text-base font-sans font-bold text-white leading-snug">{ticket.title}</h2>
          <p className="text-xs font-sans text-atlantic-200/50 mt-0.5">Créé le {formatDatetime(ticket.createdAt)}</p>
          {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
            <p className="text-[10px] font-sans text-gold-400/60 mt-0.5">
              Dernière modification : {formatDatetime(ticket.updatedAt)}
            </p>
          )}
          {ticket.resolvedAt && (
            <p className="text-xs font-sans text-emerald-400 mt-0.5">Résolu le {formatDatetime(ticket.resolvedAt)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOpen && (
            <button
              onClick={onResolve}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 text-xs font-sans font-medium transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Résolu ✓
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-atlantic-200/30 hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Supprimer ce ticket"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fiche incident */}
      {hasIncidentFields && (
        <GlassCard hover={false}>
          <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest mb-3">
            Fiche incident
          </p>
          <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2.5">
            {ticket.natureIncident && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Nature</span>
                <span className="text-[11px] font-sans text-atlantic-200/80">{ticket.natureIncident}</span>
              </>
            )}
            {ticket.commentArrive && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Comment</span>
                <span className="text-[11px] font-sans text-atlantic-200/80">{ticket.commentArrive}</span>
              </>
            )}
            {ticket.depuisQuand && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Depuis</span>
                <span className="text-[11px] font-sans text-white font-medium">{ticket.depuisQuand}</span>
              </>
            )}
            {ticket.nbPersonnesImpactees != null && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Impactés</span>
                <span className="text-[11px] font-sans text-white font-medium">{ticket.nbPersonnesImpactees} pers.</span>
              </>
            )}
            {ticket.testsCroises != null && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Autre nav.</span>
                <span className="text-[11px] font-sans text-atlantic-200/80">{ticket.testsCroises}</span>
              </>
            )}
            {ticket.rebootTente != null && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Rechargé</span>
                <span className={`text-[11px] font-sans font-medium ${ticket.rebootTente ? "text-emerald-400" : "text-orange-400"}`}>
                  {ticket.rebootTente ? "✅ Oui" : "⚠ Non"}
                </span>
              </>
            )}
            {ticket.testsRealises && (
              <>
                <span className="text-[10px] font-sans text-atlantic-200/40 pt-0.5">Tests réalisés</span>
                <span className="text-[11px] font-sans text-atlantic-200/80">{ticket.testsRealises}</span>
              </>
            )}
          </div>
        </GlassCard>
      )}

      {/* Conversation Helena */}
      {ticket.helenaConversation.length > 0 && (
        <GlassCard hover={false}>
          <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest mb-3">
            Conversation Helena
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {ticket.helenaConversation.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 rounded-md bg-violet-400/20 border border-violet-400/30 flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0 text-[8px] font-bold text-violet-300">H</div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-[11px] font-sans leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gold-400/10 text-white rounded-tr-sm border border-gold-400/10"
                    : "bg-atlantic-800/60 text-atlantic-200/70 rounded-tl-sm"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Historique */}
      <GlassCard hover={false}>
        <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest mb-4">
          Historique
        </p>
        <div className="relative space-y-0">
          {activities.length > 1 && (
            <div className="absolute left-[5px] top-2 bottom-6 w-px bg-white/5" />
          )}
          {activities.map((act, i) => {
            const aCfg = ACTIVITY_CONFIG[act.action] ?? ACTIVITY_CONFIG.note;
            return (
              <div key={i} className="flex gap-3 pb-4 relative">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 z-10 ${aCfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-sans font-semibold text-white">{aCfg.label}</span>
                    <span className="text-[9px] font-sans text-atlantic-200/40">{formatDatetime(act.timestamp)}</span>
                  </div>
                  {act.note && (
                    <p className="text-[11px] font-sans text-atlantic-200/60 mt-0.5 leading-relaxed">{act.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-white/5 pt-3 flex gap-2">
          <textarea
            placeholder="Ajouter une note — action effectuée, retour client, prochaine étape…"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitNote(); } }}
            rows={2}
            className="flex-1 bg-atlantic-800/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-sans text-white placeholder:text-atlantic-200/25 focus:outline-none focus:border-gold-400/20 transition-colors resize-none"
          />
          <button
            onClick={submitNote}
            disabled={!noteInput.trim()}
            className="px-3 rounded-lg bg-gold-400/10 text-gold-400 hover:bg-gold-400/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </GlassCard>

    </div>
  );
}

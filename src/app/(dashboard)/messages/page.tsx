"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import { PageTransition } from "@/components/premium/page-transition";
import { MessageSquare, CheckCircle2, Clock, ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { getTickets, markTicketRead, resolveTicket, createTicket } from "@/lib/tickets";
import type { Ticket } from "@/lib/tickets";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `il y a ${d}j`;
  if (h > 0) return `il y a ${h}h`;
  if (min > 0) return `il y a ${min}min`;
  return "à l'instant";
}

export default function MessagesPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setTickets(getTickets());
  }, []);

  function handleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
    markTicketRead(id);
    setTickets(getTickets());
  }

  function handleResolve(id: string) {
    resolveTicket(id);
    setTickets(getTickets());
  }

  function seedTestTicket() {
    createTicket(
      "Bouton 'Générer un avoir' absent sur facture Envoyée",
      "J'ai envoyé une facture avec le mauvais montant. Je ne trouve pas le bouton pour créer un avoir — la facture est en statut Envoyée.",
      [
        { role: "user", content: "J'ai envoyé une facture avec le mauvais montant, comment je fais ?" },
        { role: "assistant", content: "Tu veux corriger une facture déjà envoyée — c'est une situation courante. En droit français, une facture émise ne peut pas être modifiée directement. Tu dois émettre un avoir pour annuler la facture incorrecte, puis créer une nouvelle facture avec le bon montant. Point de vigilance : l'avoir doit reprendre le même numéro de facture en référence (Art. L. 441-9 du Code de commerce). Tu veux que je t'explique comment créer un avoir dans l'appli ?" },
        { role: "user", content: "Oui mais dans l'appli je ne trouve pas le bouton avoir" },
        { role: "assistant", content: "Dans la page Documents, ouvre la facture concernée — en bas à gauche tu devrais voir un bouton \"Générer un avoir\". Si ce bouton n'apparaît pas, c'est peut-être lié au statut de la facture. Quel est le statut actuel de ta facture ?" },
        { role: "user", content: "Je ne vois toujours pas le bouton, la facture est en statut Envoyée" },
        { role: "assistant", content: "Je ne parviens pas à identifier pourquoi le bouton n'apparaît pas pour une facture en statut Envoyée — normalement il devrait être visible. Je préfère escalader ce point au support plutôt que de te donner une mauvaise manipulation." },
      ],
      {
        natureIncident: "Le bouton 'Générer un avoir' n'apparaît pas sur une facture en statut Envoyée",
        commentArrive: "En ouvrant la facture FAC-2024-0087 depuis la page Documents, aucun bouton avoir visible nulle part — ni en bas, ni dans le menu contextuel",
        depuisQuand: "aujourd'hui",
        nbPersonnesImpactees: 1,
        testsRealises: "Recherche visuelle complète dans la page facture, scroll haut et bas, vérification du menu contextuel",
        testsCroises: true,
        rebootTente: true,
      }
    );
    setTickets(getTickets());
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

        <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">

          {tickets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-atlantic-800/60 flex items-center justify-center">
                <Inbox className="w-7 h-7 text-atlantic-200/30" />
              </div>
              <div>
                <p className="text-sm font-sans font-semibold text-white mb-1">Aucun ticket</p>
                <p className="text-xs font-sans text-atlantic-200/40">
                  Helena escalade ici les problèmes qu'elle ne peut pas résoudre seule.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Tickets ouverts */}
              {open.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest">
                    En attente · {open.length}
                  </p>
                  {open.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      expanded={expanded === ticket.id}
                      onExpand={() => handleExpand(ticket.id)}
                      onResolve={() => handleResolve(ticket.id)}
                    />
                  ))}
                </div>
              )}

              {/* Tickets résolus */}
              {resolved.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest">
                    Résolus · {resolved.length}
                  </p>
                  {resolved.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      expanded={expanded === ticket.id}
                      onExpand={() => handleExpand(ticket.id)}
                      onResolve={() => handleResolve(ticket.id)}
                    />
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function TicketCard({
  ticket, expanded, onExpand, onResolve,
}: {
  ticket: Ticket;
  expanded: boolean;
  onExpand: () => void;
  onResolve: () => void;
}) {
  const isOpen = ticket.status === "open";

  return (
    <div className={`rounded-xl border transition-colors ${
      isOpen
        ? ticket.read ? "border-gold-400/10 bg-atlantic-800/20" : "border-violet-400/20 bg-violet-400/[0.03]"
        : "border-white/5 bg-atlantic-800/10 opacity-60"
    }`}>
      <button
        onClick={onExpand}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
          isOpen ? (ticket.read ? "bg-gold-400/40" : "bg-violet-400 animate-pulse") : "bg-emerald-400/40"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-sans font-bold text-atlantic-200/40">{ticket.id}</span>
            <span className="text-[9px] font-sans text-atlantic-200/30">{timeAgo(ticket.createdAt)}</span>
            {!ticket.read && isOpen && (
              <span className="text-[8px] font-sans px-1.5 py-0.5 rounded-full bg-violet-400/20 text-violet-300 font-bold">Nouveau</span>
            )}
          </div>
          <p className="text-sm font-sans font-semibold text-white leading-snug">{ticket.title}</p>
          <p className="text-[11px] font-sans text-atlantic-200/50 mt-0.5 line-clamp-1">{ticket.userDescription}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOpen ? (
            <Clock className="w-3.5 h-3.5 text-orange-400/60" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60" />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-atlantic-200/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-atlantic-200/30" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">

          {/* Fiche incident — champs structurés */}
          {(ticket.natureIncident || ticket.commentArrive || ticket.depuisQuand || ticket.nbPersonnesImpactees != null) && (
            <div className="space-y-2">
              <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest">
                Fiche incident
              </p>
              <div className="rounded-lg bg-atlantic-800/30 border border-white/5 px-3 py-2.5 space-y-2">
                {ticket.natureIncident && (
                  <div>
                    <span className="text-[9px] font-sans font-semibold text-atlantic-200/30 uppercase tracking-wider">Nature</span>
                    <p className="text-[11px] font-sans text-atlantic-200/70 mt-0.5">{ticket.natureIncident}</p>
                  </div>
                )}
                {ticket.commentArrive && (
                  <div>
                    <span className="text-[9px] font-sans font-semibold text-atlantic-200/30 uppercase tracking-wider">Comment c'est arrivé</span>
                    <p className="text-[11px] font-sans text-atlantic-200/70 mt-0.5">{ticket.commentArrive}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-0.5">
                  {ticket.depuisQuand && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-sans text-atlantic-200/30">Depuis</span>
                      <span className="text-[10px] font-sans font-medium text-white">{ticket.depuisQuand}</span>
                    </div>
                  )}
                  {ticket.nbPersonnesImpactees != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-sans text-atlantic-200/30">Impactés</span>
                      <span className="text-[10px] font-sans font-medium text-white">{ticket.nbPersonnesImpactees} pers.</span>
                    </div>
                  )}
                  {ticket.testsCroises != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-sans text-atlantic-200/30">Autre nav.</span>
                      <span className={`text-[10px] font-sans font-medium ${ticket.testsCroises ? "text-emerald-400" : "text-orange-400"}`}>
                        {ticket.testsCroises ? "Oui" : "Non"}
                      </span>
                    </div>
                  )}
                  {ticket.rebootTente != null && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-sans text-atlantic-200/30">Rechargé</span>
                      <span className={`text-[10px] font-sans font-medium ${ticket.rebootTente ? "text-emerald-400" : "text-orange-400"}`}>
                        {ticket.rebootTente ? "Oui" : "Non"}
                      </span>
                    </div>
                  )}
                </div>
                {ticket.testsRealises && (
                  <div>
                    <span className="text-[9px] font-sans font-semibold text-atlantic-200/30 uppercase tracking-wider">Tests réalisés</span>
                    <p className="text-[11px] font-sans text-atlantic-200/70 mt-0.5">{ticket.testsRealises}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversation Helena */}
          <div className="space-y-2">
            <p className="text-[9px] font-sans font-semibold text-atlantic-200/40 uppercase tracking-widest">
              Conversation Helena
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ticket.helenaConversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-4 h-4 rounded-md bg-violet-400/20 flex items-center justify-center mr-1.5 mt-0.5 flex-shrink-0 text-[8px] font-bold text-violet-300">
                      H
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[10px] font-sans leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gold-400/10 text-white rounded-tr-sm border border-gold-400/10"
                      : "bg-atlantic-800/60 text-atlantic-200/70 rounded-tl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date résolution si résolu */}
          {ticket.resolvedAt && (
            <p className="text-[10px] font-sans text-emerald-400/50">
              Résolu {timeAgo(ticket.resolvedAt)}
            </p>
          )}

          {/* Action */}
          {isOpen && (
            <button
              onClick={onResolve}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 text-xs font-sans font-medium transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marquer comme résolu
            </button>
          )}
        </div>
      )}
    </div>
  );
}

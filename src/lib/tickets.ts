// ─── Gestion des tickets support ──────────────────────────────────────────────
// Stockage localStorage — fondation extensible vers Supabase.

export type TicketActivityAction = "created" | "resolved" | "note" | "reopened";

export interface TicketActivity {
  timestamp: string;
  action: TicketActivityAction;
  note: string | null;
}

export interface Ticket {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "open" | "in_progress" | "resolved";

  // ── Identification ─────────────────────────────────────────────────────────
  title: string;
  userDescription: string;

  // ── Nature de l'incident ───────────────────────────────────────────────────
  natureIncident: string | null;       // Description de ce qui se passe
  commentArrive: string | null;        // Comment le bug est survenu
  depuisQuand: string | null;          // Depuis quand (ex: "ce matin", "hier soir")
  nbPersonnesImpactees: number | null; // Combien d'utilisateurs affectés

  // ── Tests réalisés ─────────────────────────────────────────────────────────
  testsRealises: string | null;        // Ce que l'utilisateur a déjà essayé
  testsCroises: string | null;         // Testé sur un autre navigateur / appareil (ex: "Chrome + Firefox")
  rebootTente: boolean | null;         // Rechargement de la page tenté

  // ── Catégorie ──────────────────────────────────────────────────────────────
  typeIncident: "bug" | "data" | "facturation" | "compte" | "performance" | "autre" | null;

  // ── Contexte technique ─────────────────────────────────────────────────────
  helenaConversation: { role: "user" | "assistant"; content: string }[];

  // ── Suivi ──────────────────────────────────────────────────────────────────
  read: boolean;
  resolvedAt: string | null;
  supportNotes: string | null;         // Notes internes du support

  // ── Journal d'activité ─────────────────────────────────────────────────────
  activities: TicketActivity[];        // Historique chronologique des actions
}

const KEY = "factureasy_tickets";

export function getTickets(): Ticket[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function createTicket(
  title: string,
  userDescription: string,
  conversation: { role: "user" | "assistant"; content: string }[],
  extra?: Partial<Pick<Ticket,
    "natureIncident" | "commentArrive" | "depuisQuand" |
    "nbPersonnesImpactees" | "testsRealises" | "testsCroises" | "rebootTente" | "typeIncident"
  >>
): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: `TKT-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    status: "open",
    title,
    userDescription,
    natureIncident: extra?.natureIncident ?? null,
    commentArrive: extra?.commentArrive ?? null,
    depuisQuand: extra?.depuisQuand ?? null,
    nbPersonnesImpactees: extra?.nbPersonnesImpactees ?? null,
    testsRealises: extra?.testsRealises ?? null,
    testsCroises: extra?.testsCroises ?? null,
    rebootTente: extra?.rebootTente ?? null,
    typeIncident: extra?.typeIncident ?? null,
    helenaConversation: conversation,
    read: false,
    resolvedAt: null,
    supportNotes: null,
    activities: [{ timestamp: now, action: "created", note: null }],
  };
  const existing = getTickets();
  localStorage.setItem(KEY, JSON.stringify([ticket, ...existing]));
  return ticket;
}

export function markTicketRead(id: string): void {
  const tickets = getTickets().map((t) =>
    t.id === id ? { ...t, read: true } : t
  );
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

export function resolveTicket(id: string): void {
  const now = new Date().toISOString();
  const tickets = getTickets().map((t) => {
    if (t.id !== id) return t;
    return {
      ...t,
      status: "resolved" as const,
      read: true,
      resolvedAt: now,
      updatedAt: now,
      activities: [...(t.activities ?? []), { timestamp: now, action: "resolved" as const, note: null }],
    };
  });
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

export function deleteTicket(id: string): void {
  const tickets = getTickets().filter((t) => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

export function addTicketActivity(id: string, action: TicketActivityAction, note?: string): void {
  const now = new Date().toISOString();
  const tickets = getTickets().map((t) => {
    if (t.id !== id) return t;
    return {
      ...t,
      updatedAt: now,
      activities: [...(t.activities ?? []), { timestamp: now, action, note: note ?? null }],
    };
  });
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

export function getUnreadCount(): number {
  return getTickets().filter((t) => !t.read && t.status === "open").length;
}

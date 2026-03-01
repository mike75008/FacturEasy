// ─── Gestion des tickets support ──────────────────────────────────────────────
// Stockage localStorage — fondation extensible vers Supabase.

export interface Ticket {
  id: string;
  createdAt: string;
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
  testsCroises: boolean | null;        // Testé sur un autre navigateur / appareil
  rebootTente: boolean | null;         // Rechargement de la page tenté

  // ── Contexte technique ─────────────────────────────────────────────────────
  helenaConversation: { role: "user" | "assistant"; content: string }[];

  // ── Suivi ──────────────────────────────────────────────────────────────────
  read: boolean;
  resolvedAt: string | null;
  supportNotes: string | null;         // Notes internes du support
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
    "nbPersonnesImpactees" | "testsRealises" | "testsCroises" | "rebootTente"
  >>
): Ticket {
  const ticket: Ticket = {
    id: `TKT-${Date.now()}`,
    createdAt: new Date().toISOString(),
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
    helenaConversation: conversation,
    read: false,
    resolvedAt: null,
    supportNotes: null,
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
  const tickets = getTickets().map((t) =>
    t.id === id
      ? { ...t, status: "resolved" as const, read: true, resolvedAt: new Date().toISOString() }
      : t
  );
  localStorage.setItem(KEY, JSON.stringify(tickets));
}

export function getUnreadCount(): number {
  return getTickets().filter((t) => !t.read && t.status === "open").length;
}

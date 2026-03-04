// ─── Gestion des tickets support ──────────────────────────────────────────────
// Stockage localStorage — fondation extensible vers Supabase.

export type TicketActivityAction = "created" | "resolved" | "note" | "reopened";

export interface TicketActivity {
  timestamp: string;
  action: TicketActivityAction;
  note: string | null;
}

export type TicketPriority = "critical" | "high" | "normal" | "low";

export interface Ticket {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "open" | "in_progress" | "resolved";
  priority: TicketPriority;

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
  testsCroises: string | null;         // Testé sur un autre navigateur / appareil
  rebootTente: boolean | null;         // Rechargement de la page tenté

  // ── Catégorie ──────────────────────────────────────────────────────────────
  typeIncident: "bug" | "data" | "facturation" | "compte" | "performance" | "autre" | null;

  // ── Contexte technique ─────────────────────────────────────────────────────
  helenaConversation: { role: "user" | "assistant"; content: string }[];

  // ── Suivi ──────────────────────────────────────────────────────────────────
  read: boolean;
  resolvedAt: string | null;
  supportNotes: string | null;
  scheduledCheckAt: string | null; // Date de vérification auto après clôture

  // ── Auto-relance ───────────────────────────────────────────────────────────
  autoRelance: boolean;
  autoRelanceDelay: number; // jours

  // ── Relance — ton et étape ─────────────────────────────────────────────────
  relanceTone: "amical" | "ferme" | "mise en demeure";
  relanceStep: number; // 0 = pas encore relancé, 1/2/3 = étape atteinte

  // ── Journal d'activité ─────────────────────────────────────────────────────
  activities: TicketActivity[];
}

// ── ID affiché à l'utilisateur — Child1-TKT-0001 si rouvert ─────────────────
export function getDisplayId(ticket: Ticket): string {
  const reopens = (ticket.activities ?? []).filter((a) => a.action === "reopened").length;
  return reopens === 0 ? ticket.id : `Child${reopens}-${ticket.id}`;
}

const KEY = "factureasy_tickets";
const COUNTER_KEY = "factureasy_ticket_counter";

// Notifie la sidebar (et tout autre écouteur) qu'un ticket a changé
function dispatch(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tickets-updated"));
  }
}

function nextTicketId(): string {
  const n = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(n));
  return `TKT-${String(n).padStart(4, "0")}`;
}

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
    "natureIncident" | "commentArrive" | "depuisQuand" | "priority" |
    "nbPersonnesImpactees" | "testsRealises" | "testsCroises" | "rebootTente" | "typeIncident"
  >>
): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: nextTicketId(),
    createdAt: now,
    updatedAt: now,
    status: "open",
    priority: extra?.priority ?? "normal",
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
    scheduledCheckAt: null,
    autoRelance: false,
    autoRelanceDelay: 7,
    relanceTone: "amical",
    relanceStep: 0,
    activities: [{ timestamp: now, action: "created", note: null }],
  };
  localStorage.setItem(KEY, JSON.stringify([ticket, ...getTickets()]));
  dispatch();
  return ticket;
}

export function markTicketRead(id: string): void {
  const tickets = getTickets().map((t) =>
    t.id === id ? { ...t, read: true } : t
  );
  localStorage.setItem(KEY, JSON.stringify(tickets));
  dispatch();
}

export function resolveTicket(id: string): void {
  const now = new Date().toISOString();
  const tickets = getTickets().map((t) => {
    if (t.id !== id) return t;
    const delay = t.autoRelanceDelay ?? 7;
    const scheduledCheckAt = (t.autoRelance ?? false)
      ? new Date(Date.now() + delay * 86_400_000).toISOString()
      : null;
    return {
      ...t,
      status: "resolved" as const,
      read: true,
      resolvedAt: now,
      scheduledCheckAt,
      updatedAt: now,
      activities: [...(t.activities ?? []), { timestamp: now, action: "resolved" as const, note: null }],
    };
  });
  localStorage.setItem(KEY, JSON.stringify(tickets));
  dispatch();
}

export function reopenTicket(id: string): void {
  const now = new Date().toISOString();
  const tickets = getTickets().map((t) => {
    if (t.id !== id) return t;
    return {
      ...t,
      status: "open" as const,
      read: true,
      resolvedAt: null,
      scheduledCheckAt: null,
      updatedAt: now,
      activities: [...(t.activities ?? []), { timestamp: now, action: "reopened" as const, note: null }],
    };
  });
  localStorage.setItem(KEY, JSON.stringify(tickets));
  dispatch();
}

export function deleteTicket(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getTickets().filter((t) => t.id !== id)));
  dispatch();
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
  dispatch();
}

export function updateTicketAutoRelance(id: string, enabled: boolean, delay: number): void {
  const tickets = getTickets().map((t) =>
    t.id === id ? { ...t, autoRelance: enabled, autoRelanceDelay: delay } : t
  );
  localStorage.setItem(KEY, JSON.stringify(tickets));
  dispatch();
}

export function getUnreadCount(): number {
  return getTickets().filter((t) => !t.read && t.status === "open").length;
}

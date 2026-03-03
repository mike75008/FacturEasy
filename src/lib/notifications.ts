// Store de notifications — localStorage + événement custom pour le badge sidebar

const STORAGE_KEY = "facturepro_notifications";

export type NotificationCategory = "paiement" | "commercial" | "relance" | "alerte";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  samVoice: string;
  docId?: string;
  docNumber?: string;
  read: boolean;
  createdAt: string;
}

export function pushNotification(n: Omit<AppNotification, "id" | "read" | "createdAt">): void {
  if (typeof window === "undefined") return;
  const all = getNotifications();
  const notif: AppNotification = {
    ...n,
    id: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  all.unshift(notif);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 100)));
  window.dispatchEvent(new Event("notifications-updated"));
}

export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function getUnreadNotifCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

export function markNotifRead(id: string): void {
  if (typeof window === "undefined") return;
  const all = getNotifications().map((n) => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("notifications-updated"));
}

export function markAllNotifsRead(): void {
  if (typeof window === "undefined") return;
  const all = getNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("notifications-updated"));
}

// ─── Helpers Sam — push depuis n'importe où ───────────────────────────────────

export function notifyFacturePaid(docNumber: string, amount: string, clientName: string, docId: string) {
  pushNotification({
    category: "paiement",
    title: `Paiement reçu — ${docNumber}`,
    body: `${clientName} a réglé ${amount}.`,
    samVoice: `Nickel. ${amount} encaissés sur ${docNumber}. La trésorerie avance.`,
    docId,
    docNumber,
  });
}

export function notifyDevisAccepted(docNumber: string, clientName: string, docId: string) {
  pushNotification({
    category: "commercial",
    title: `Devis accepté — ${docNumber}`,
    body: `${clientName} a accepté le devis.`,
    samVoice: `${clientName} est partant. Convertis ce devis en facture pour enclencher le cycle.`,
    docId,
    docNumber,
  });
}

export function notifyDevisConverted(devisNumber: string, factureNumber: string, docId: string) {
  pushNotification({
    category: "commercial",
    title: `Devis converti — ${factureNumber}`,
    body: `${devisNumber} converti en facture ${factureNumber}.`,
    samVoice: `Le cycle commercial est bouclé. La facture ${factureNumber} est en brouillon, pense à l'envoyer.`,
    docId,
    docNumber: factureNumber,
  });
}

export function notifyRelanceSent(docNumber: string, clientName: string, tone: string, docId: string) {
  const toneLabel = { amical: "amicale", ferme: "ferme", "mise en demeure": "de mise en demeure" }[tone] ?? tone;
  pushNotification({
    category: "relance",
    title: `Relance envoyée — ${docNumber}`,
    body: `Relance ${toneLabel} à ${clientName}.`,
    samVoice: `Relance ${toneLabel} partie à ${clientName}. Je surveille la suite.`,
    docId,
    docNumber,
  });
}

export function notifyContentieux(docNumber: string, clientName: string, docId: string) {
  pushNotification({
    category: "alerte",
    title: `Contentieux — ${docNumber}`,
    body: `${clientName} n'a pas répondu après 3 relances.`,
    samVoice: `3 relances sans réponse de ${clientName} sur ${docNumber}. C'est le moment de passer par un professionnel du recouvrement.`,
    docId,
    docNumber,
  });
}

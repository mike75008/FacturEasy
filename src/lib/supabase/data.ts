// Supabase data service — remplace les appels localStorage
// Chaque fonction utilise le client browser avec RLS automatique

import { createClient } from "./client";
import { getDocuments as getDocumentsLS } from "@/lib/local-storage";
import type { Client, Product, Organization, NumberingSequence, Reminder, Document as DocRecord, DocumentLine } from "@/types/database";

// ─── Helper : récupère l'org_id de l'utilisateur connecté ───────────────────

async function getCurrentOrgId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_id", user.id)
    .single();

  return data?.organization_id ?? null;
}

// ─── CLIENTS ────────────────────────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveClient(client: Partial<Client>): Promise<Client> {
  const supabase = createClient();

  if (client.id) {
    // Mise à jour
    const { data, error } = await supabase
      .from("clients")
      .update({
        type: client.type,
        company_name: client.company_name ?? null,
        first_name: client.first_name ?? null,
        last_name: client.last_name ?? null,
        email: client.email ?? null,
        phone: client.phone ?? null,
        address: client.address ?? null,
        city: client.city ?? null,
        postal_code: client.postal_code ?? null,
        country: client.country ?? "FR",
        siret: client.siret ?? null,
        tva_number: client.tva_number ?? null,
        notes: client.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Création — on récupère l'org_id
    const orgId = await getCurrentOrgId();
    if (!orgId) throw new Error("Utilisateur non authentifié");

    const { data, error } = await supabase
      .from("clients")
      .insert({
        organization_id: orgId,
        type: client.type ?? "professionnel",
        company_name: client.company_name ?? null,
        first_name: client.first_name ?? null,
        last_name: client.last_name ?? null,
        email: client.email ?? null,
        phone: client.phone ?? null,
        address: client.address ?? null,
        city: client.city ?? null,
        postal_code: client.postal_code ?? null,
        country: client.country ?? "FR",
        siret: client.siret ?? null,
        tva_number: client.tva_number ?? null,
        notes: client.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// ─── PRODUCTS ───────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function saveProduct(product: Partial<Product>): Promise<Product> {
  const supabase = createClient();

  if (product.id) {
    // Mise à jour
    const { data, error } = await supabase
      .from("products")
      .update({
        name: product.name ?? "",
        description: product.description ?? null,
        unit_price: product.unit_price ?? 0,
        unit: product.unit ?? "unité",
        tva_rate: product.tva_rate ?? 20,
        category: product.category ?? null,
        is_active: product.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Création
    const orgId = await getCurrentOrgId();
    if (!orgId) throw new Error("Utilisateur non authentifié");

    const { data, error } = await supabase
      .from("products")
      .insert({
        organization_id: orgId,
        name: product.name ?? "",
        description: product.description ?? null,
        unit_price: product.unit_price ?? 0,
        unit: product.unit ?? "unité",
        tva_rate: product.tva_rate ?? 20,
        category: product.category ?? null,
        is_active: product.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ─── ORGANISATION ────────────────────────────────────────────────────────────

export async function getOrganization(): Promise<Organization | null> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function saveOrganization(org: Partial<Organization>): Promise<Organization> {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Utilisateur non authentifié");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: org.name ?? "",
      siret: org.siret ?? null,
      tva_number: org.tva_number ?? null,
      address: org.address ?? null,
      city: org.city ?? null,
      postal_code: org.postal_code ?? null,
      country: org.country ?? "FR",
      phone: org.phone ?? null,
      email: org.email ?? null,
      website: org.website ?? null,
      rib_iban: org.rib_iban ?? null,
      rib_bic: org.rib_bic ?? null,
      rib_bank: org.rib_bank ?? null,
      default_payment_terms: org.default_payment_terms ?? 30,
      default_tva_rate: org.default_tva_rate ?? 20,
      legal_form: org.legal_form ?? null,
      capital: org.capital ?? null,
      rcs: org.rcs ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── SÉQUENCES DE NUMÉROTATION ───────────────────────────────────────────────

export async function getSequences(): Promise<NumberingSequence[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("numbering_sequences")
    .select("*")
    .order("document_type", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateSequencePrefix(documentType: string, prefix: string): Promise<void> {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Utilisateur non authentifié");

  const supabase = createClient();
  const { error } = await supabase
    .from("numbering_sequences")
    .update({ prefix })
    .eq("organization_id", orgId)
    .eq("document_type", documentType);

  if (error) throw error;
}

// ─── RELANCES ────────────────────────────────────────────────────────────────

export async function getReminders(): Promise<Reminder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveReminder(reminder: Partial<Reminder>): Promise<Reminder> {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Utilisateur non authentifié");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      organization_id: orgId,
      document_id: reminder.document_id ?? "",
      channel: reminder.channel ?? "email",
      priority: reminder.priority ?? "medium",
      content: reminder.content ?? "",
      ai_generated: reminder.ai_generated ?? false,
      sent_at: null,
      scheduled_for: reminder.scheduled_for ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markReminderSent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<DocRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveDocument(doc: Partial<DocRecord>): Promise<DocRecord> {
  const supabase = createClient();

  if (doc.id) {
    const { data, error } = await supabase
      .from("documents")
      .update({
        client_id: doc.client_id,
        type: doc.type,
        status: doc.status,
        number: doc.number,
        date: doc.date,
        due_date: doc.due_date ?? null,
        total_ht: doc.total_ht ?? 0,
        total_tva: doc.total_tva ?? 0,
        total_ttc: doc.total_ttc ?? 0,
        discount_percent: doc.discount_percent ?? 0,
        discount_amount: doc.discount_amount ?? 0,
        notes: doc.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const orgId = await getCurrentOrgId();
    if (!orgId) throw new Error("Utilisateur non authentifié");

    const { data, error } = await supabase
      .from("documents")
      .insert({
        organization_id: orgId,
        client_id: doc.client_id ?? "",
        type: doc.type ?? "facture",
        status: doc.status ?? "brouillon",
        number: doc.number ?? "",
        date: doc.date ?? new Date().toISOString().split("T")[0],
        due_date: doc.due_date ?? null,
        total_ht: doc.total_ht ?? 0,
        total_tva: doc.total_tva ?? 0,
        total_ttc: doc.total_ttc ?? 0,
        discount_percent: doc.discount_percent ?? 0,
        discount_amount: doc.discount_amount ?? 0,
        notes: doc.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function getDocumentLines(documentId: string): Promise<DocumentLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_lines")
    .select("*")
    .eq("document_id", documentId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function replaceDocumentLines(
  documentId: string,
  lines: Partial<DocumentLine>[]
): Promise<void> {
  const supabase = createClient();

  const { error: delError } = await supabase
    .from("document_lines")
    .delete()
    .eq("document_id", documentId);
  if (delError) throw delError;

  if (lines.length === 0) return;

  const { error: insError } = await supabase
    .from("document_lines")
    .insert(
      lines.map((l, i) => ({
        document_id: documentId,
        product_id: l.product_id ?? null,
        description: l.description ?? "",
        quantity: l.quantity ?? 1,
        unit: l.unit ?? "unité",
        unit_price: l.unit_price ?? 0,
        tva_rate: l.tva_rate ?? 20,
        discount_percent: l.discount_percent ?? 0,
        total_ht: l.total_ht ?? 0,
        total_tva: l.total_tva ?? 0,
        total_ttc: l.total_ttc ?? 0,
        position: l.position ?? i,
      }))
    );
  if (insError) throw insError;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export type NotificationColor = "green" | "red" | "orange" | "blue" | "yellow" | "pink";

export interface AppNotification {
  id: string;
  color: NotificationColor;
  title: string;
  message: string;
  documentId?: string;
  documentNumber?: string;
}

export async function computeNotifications(): Promise<AppNotification[]> {
  let documents = await getDocuments();
  if (documents.length === 0) documents = getDocumentsLS() as unknown as DocRecord[];
  const notifications: AppNotification[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 🔴 Rouge — Factures en retard
  documents
    .filter((d) => d.type === "facture" && d.status === "envoye" && d.due_date && new Date(d.due_date) < today)
    .forEach((d) => {
      const days = Math.floor((today.getTime() - new Date(d.due_date!).getTime()) / 86400000);
      notifications.push({
        id: `late-${d.id}`,
        color: "red",
        title: "Facture en retard",
        message: `${d.number} — en retard de ${days} jour${days > 1 ? "s" : ""}`,
        documentId: d.id,
        documentNumber: d.number,
      });
    });

  // 🟠 Orange — Échéance dans moins de 7 jours
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  documents
    .filter((d) => d.type === "facture" && d.status === "envoye" && d.due_date &&
      new Date(d.due_date) >= today && new Date(d.due_date) <= in7Days)
    .forEach((d) => {
      const days = Math.floor((new Date(d.due_date!).getTime() - today.getTime()) / 86400000);
      notifications.push({
        id: `soon-${d.id}`,
        color: "orange",
        title: "Échéance proche",
        message: `${d.number} — échéance dans ${days} jour${days > 1 ? "s" : ""}`,
        documentId: d.id,
        documentNumber: d.number,
      });
    });

  // 🔵 Bleu — Facture validée non envoyée depuis 3+ jours
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  documents
    .filter((d) => d.type === "facture" && d.status === "valide" && new Date(d.date) <= threeDaysAgo)
    .forEach((d) => {
      const days = Math.floor((today.getTime() - new Date(d.date).getTime()) / 86400000);
      notifications.push({
        id: `notsent-${d.id}`,
        color: "blue",
        title: "Facture non envoyée",
        message: `${d.number} — validée mais non envoyée depuis ${days} jour${days > 1 ? "s" : ""}`,
        documentId: d.id,
        documentNumber: d.number,
      });
    });

  // 🟡 Jaune — Devis sans réponse depuis 30j+
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  documents
    .filter((d) => d.type === "devis" && (d.status === "envoye" || d.status === "brouillon") && new Date(d.date) <= thirtyDaysAgo)
    .forEach((d) => {
      const days = Math.floor((today.getTime() - new Date(d.date).getTime()) / 86400000);
      notifications.push({
        id: `oldquote-${d.id}`,
        color: "yellow",
        title: "Devis sans réponse",
        message: `${d.number} — sans réponse depuis ${days} jours`,
        documentId: d.id,
        documentNumber: d.number,
      });
    });

  // Rose — Aucune facture ce mois-ci
  const hasInvoiceThisMonth = documents.some((d) => {
    const date = new Date(d.date);
    return d.type === "facture" && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  });
  if (!hasInvoiceThisMonth) {
    notifications.push({
      id: "no-invoice-month",
      color: "pink",
      title: "Aucune facture ce mois-ci",
      message: "Vous n'avez pas encore facturé ce mois-ci",
    });
  }

  // 🟢 Vert — Tout va bien (aucune autre alerte)
  if (notifications.length === 0) {
    notifications.push({
      id: "all-good",
      color: "green",
      title: "Tout va bien",
      message: "Votre activité est en bonne santé",
    });
  }

  return notifications;
}

export async function generateDocumentNumber(type: string): Promise<string> {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Utilisateur non authentifié");

  const supabase = createClient();
  const { data: seq, error } = await supabase
    .from("numbering_sequences")
    .select("*")
    .eq("organization_id", orgId)
    .eq("document_type", type)
    .single();

  if (error || !seq) {
    const year = new Date().getFullYear();
    const prefix = type.slice(0, 3).toUpperCase();
    return `${prefix}-${year}-00001`;
  }

  const nextNum = seq.current_number + 1;

  await supabase
    .from("numbering_sequences")
    .update({ current_number: nextNum, updated_at: new Date().toISOString() })
    .eq("id", seq.id);

  return `${seq.prefix}-${seq.fiscal_year}-${String(nextNum).padStart(5, "0")}`;
}

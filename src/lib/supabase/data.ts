// Supabase data service — remplace les appels localStorage
// Chaque fonction utilise le client browser avec RLS automatique

import { createClient } from "./client";
import { getDocuments as getDocumentsLS } from "@/lib/local-storage";
import type { Client, Product, Organization, NumberingSequence, Reminder, Document as DocRecord, DocumentLine } from "@/types/database";

// ─── Helper : s'assurer que le compte est initialisé avant les opérations RLS ─
// Appelé avant toute insertion dans document_lines pour éviter les erreurs RLS
// dues à une ligne manquante dans public.users.
async function ensureAccountReady(): Promise<void> {
  try {
    // Import dynamique pour éviter la dépendance circulaire au module client
    const { accountSetupReady } = await import("@/components/dashboard/account-setup");
    await accountSetupReady;
  } catch {
    // Si l'import échoue (ex: SSR), on continue sans bloquer
  }
}

// ─── Helper : détecter une erreur RLS ─────────────────────────────────────────
function isRLSError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42501" ||
    (error.message?.includes("row-level security") ?? false) ||
    (error.message?.includes("violates row-level security policy") ?? false)
  );
}

// ─── Helper : forcer le setup si RLS échoue ───────────────────────────────────
async function runSetupAndRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (!isRLSError(error)) throw err;

    // Erreur RLS détectée — la ligne public.users n'existe probablement pas encore
    console.warn("[data.ts] Erreur RLS détectée, tentative de setup_new_account...");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error: setupErr } = await supabase.rpc("setup_new_account", {
        p_auth_id: user.id,
        p_email: user.email ?? "",
        p_full_name: user.user_metadata?.full_name ?? user.email ?? "",
        p_company_name: user.user_metadata?.company_name ?? "Mon Entreprise",
      });

      if (setupErr) {
        console.error("[data.ts] setup_new_account échoué:", setupErr.message, setupErr);
      } else {
        console.log("[data.ts] setup_new_account réussi, retry de l'opération...");
        // Retry l'opération originale
        return await fn();
      }
    }

    // On relance l'erreur originale si le setup a échoué
    throw err;
  }
}

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

// ─── Helper : récupère userId + orgId depuis public.users ────────────────────

async function getCurrentUserRow(): Promise<{ userId: string; orgId: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, organization_id")
    .eq("auth_id", user.id)
    .single();

  return data ? { userId: data.id, orgId: data.organization_id } : null;
}

// ─── Helper : enregistre une entrée dans audit_logs (fire-and-forget) ────────

async function logAudit(
  action: "create" | "update" | "delete",
  entityType: string,
  entityId: string,
  newValues?: Record<string, unknown>,
  oldValues?: Record<string, unknown>
): Promise<void> {
  try {
    const userRow = await getCurrentUserRow();
    if (!userRow) return;

    const supabase = createClient();
    await supabase.from("audit_logs").insert({
      organization_id: userRow.orgId,
      user_id: userRow.userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues ?? null,
      new_values: newValues ?? null,
    });
  } catch {
    // Ne jamais bloquer l'opération principale
  }
}

// ─── CLIENTS ────────────────────────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
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

    if (error) throw new Error(error.message);
    logAudit("update", "client", client.id, data as Record<string, unknown>).catch(() => {});
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

    if (error) throw new Error(error.message);
    logAudit("create", "client", data.id, data as Record<string, unknown>).catch(() => {});
    return data;
  }
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  logAudit("delete", "client", id).catch(() => {});
}

// ─── PRODUCTS ───────────────────────────────────────────────────────────────

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
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

    if (error) throw new Error(error.message);
    logAudit("update", "product", product.id, data as Record<string, unknown>).catch(() => {});
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

    if (error) throw new Error(error.message);
    logAudit("create", "product", data.id, data as Record<string, unknown>).catch(() => {});
    return data;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  logAudit("delete", "product", id).catch(() => {});
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  return data;
}

// ─── SÉQUENCES DE NUMÉROTATION ───────────────────────────────────────────────

export async function getSequences(): Promise<NumberingSequence[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("numbering_sequences")
    .select("*")
    .order("document_type", { ascending: true });

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
}

// ─── RELANCES ────────────────────────────────────────────────────────────────

export async function getReminders(): Promise<Reminder[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  return data;
}

export async function markReminderSent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<DocRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveDocument(doc: Partial<DocRecord>): Promise<DocRecord> {
  return runSetupAndRetry(async () => {
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

      if (error) throw new Error(error.message);
      logAudit("update", "document", doc.id, data as Record<string, unknown>).catch(() => {});
      return data;
    } else {
      const orgId = await getCurrentOrgId();
      if (!orgId) throw new Error("Utilisateur non authentifié");

      const { data: { user } } = await supabase.auth.getUser();
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user?.id ?? "")
        .single();

      const { data, error } = await supabase
        .from("documents")
        .insert({
          organization_id: orgId,
          created_by: userRow?.id ?? null,
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

      if (error) {
        console.error("[saveDocument] ERREUR:", error.message);
        throw new Error(error.message);
      }
      console.log("[saveDocument] SUCCÈS:", data?.id);
      logAudit("create", "document", data.id, data as Record<string, unknown>).catch(() => {});
      return data;
    }
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  logAudit("delete", "document", id).catch(() => {});
}

export async function getDocumentLines(documentId: string): Promise<DocumentLine[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_lines")
    .select("*")
    .eq("document_id", documentId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function replaceDocumentLines(
  documentId: string,
  lines: Partial<DocumentLine>[]
): Promise<void> {
  // Attendre que le compte soit initialisé (public.users existe) avant d'écrire
  await ensureAccountReady();

  await runSetupAndRetry(async () => {
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
  });
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

// ─── TYPES DE VALIDATION ─────────────────────────────────────────────────────

export interface VerificationCheck {
  ok: boolean;
  label: string;
  detail?: string;
}

export interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
}

export interface LocalValidation {
  id: string;
  documentId: string;
  checkedAt: string;
  result: VerificationResult;
}

export function verifyDocument(doc: Partial<DocRecord>): VerificationResult {
  const checks: VerificationCheck[] = [
    { ok: !!doc.client_id, label: "Client renseigné", detail: doc.client_id ? undefined : "Aucun client sélectionné" },
    { ok: !!doc.date, label: "Date renseignée", detail: doc.date ? undefined : "Date manquante" },
    { ok: !!doc.number, label: "Numéro de document", detail: doc.number ? undefined : "Numéro manquant" },
    { ok: (doc.total_ttc ?? 0) > 0, label: "Montant non nul", detail: (doc.total_ttc ?? 0) > 0 ? undefined : "Montant total à zéro" },
    { ok: doc.type !== "facture" || !!doc.due_date, label: "Date d'échéance", detail: doc.type === "facture" && !doc.due_date ? "Non définie" : undefined },
  ];
  return { passed: checks.every((c) => c.ok), checks };
}

const _validations: LocalValidation[] = [];

export function addDocumentValidation(documentId: string, result: VerificationResult): LocalValidation {
  const v: LocalValidation = { id: `val-${Date.now()}`, documentId, checkedAt: new Date().toISOString(), result };
  _validations.push(v);
  return v;
}

export function getDocumentValidations(documentId: string): LocalValidation[] {
  return _validations.filter((v) => v.documentId === documentId);
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function deleteDocumentLines(documentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("document_lines").delete().eq("document_id", documentId);
  if (error) throw new Error(error.message);
}

export async function saveDocumentLine(line: Partial<DocumentLine> & { document_id: string }): Promise<DocumentLine> {
  // Attendre que le compte soit initialisé (public.users existe) avant d'écrire
  await ensureAccountReady();

  return runSetupAndRetry(async () => {
    const supabase = createClient();
    if (line.id) {
      const { data, error } = await supabase.from("document_lines").update({
        product_id: line.product_id ?? null, description: line.description ?? "",
        quantity: line.quantity ?? 1, unit: line.unit ?? "unité", unit_price: line.unit_price ?? 0,
        tva_rate: line.tva_rate ?? 20, discount_percent: line.discount_percent ?? 0,
        total_ht: line.total_ht ?? 0, total_tva: line.total_tva ?? 0, total_ttc: line.total_ttc ?? 0,
        position: line.position ?? 0,
      }).eq("id", line.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    } else {
      const { data, error } = await supabase.from("document_lines").insert({
        document_id: line.document_id, product_id: line.product_id ?? null,
        description: line.description ?? "", quantity: line.quantity ?? 1,
        unit: line.unit ?? "unité", unit_price: line.unit_price ?? 0, tva_rate: line.tva_rate ?? 20,
        discount_percent: line.discount_percent ?? 0, total_ht: line.total_ht ?? 0,
        total_tva: line.total_tva ?? 0, total_ttc: line.total_ttc ?? 0, position: line.position ?? 0,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
  });
}

// ─── NUMÉROTATION ─────────────────────────────────────────────────────────────

export async function generateDocumentNumber(type: string): Promise<string> {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("Utilisateur non authentifié");

  const supabase = createClient();
  const year = new Date().getFullYear();

  const { data: seq, error: seqError } = await supabase
    .from("numbering_sequences")
    .select("*")
    .eq("organization_id", orgId)
    .eq("document_type", type)
    .eq("fiscal_year", year)
    .maybeSingle();

  if (seqError) throw new Error(seqError.message);

  const prefix =
    type === "facture" ? "FAC" :
    type === "devis"   ? "DEV" :
    type === "avoir"   ? "AVO" :
    type === "bon_livraison" ? "BL" :
    type.slice(0, 3).toUpperCase();

  if (!seq) {
    // Aucune séquence → on l'insère avec current_number = 1
    const { error: insertError } = await supabase
      .from("numbering_sequences")
      .insert({
        organization_id: orgId,
        document_type: type,
        prefix,
        current_number: 1,
        fiscal_year: year,
      });

    if (insertError) throw new Error(insertError.message);
    return `${prefix}-${year}-00001`;
  }

  const nextNum = seq.current_number + 1;

  const { error: updateError } = await supabase
    .from("numbering_sequences")
    .update({ current_number: nextNum })
    .eq("id", seq.id);

  if (updateError) throw new Error(updateError.message);

  return `${prefix}-${year}-${String(nextNum).padStart(5, "0")}`;
}

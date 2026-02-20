// Supabase data service — remplace les appels localStorage
// Chaque fonction utilise le client browser avec RLS automatique

import { createClient } from "./client";
import type { Client, Product, Organization, NumberingSequence, Reminder } from "@/types/database";

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

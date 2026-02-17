import { z } from "zod";

// SIRET validation (Luhn algorithm)
export function validateSIRET(siret: string): boolean {
  const clean = siret.replace(/\s/g, "");
  if (clean.length !== 14 || !/^\d+$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(clean[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// TVA intracommunautaire FR validation
export function validateTVANumber(tva: string): boolean {
  if (!/^FR\d{11}$/.test(tva.replace(/\s/g, ""))) return false;
  return true;
}

// IBAN validation (basic)
export function validateIBAN(iban: string): boolean {
  const clean = iban.replace(/\s/g, "").toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;
  return true;
}

// Document legal mentions checker
export function checkDocumentMentions(doc: {
  type: string;
  organization: {
    name?: string;
    siret?: string | null;
    tva_number?: string | null;
    address?: string | null;
    rcs?: string | null;
  };
  client: {
    company_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    address?: string | null;
  };
  number?: string;
  date?: string;
  due_date?: string | null;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
}): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Vendor info
  if (!doc.organization.name) missing.push("Raison sociale du vendeur");
  if (!doc.organization.siret) missing.push("SIRET du vendeur");
  if (!doc.organization.address) missing.push("Adresse du vendeur");

  // Client info
  const clientName = doc.client.company_name || `${doc.client.first_name || ""} ${doc.client.last_name || ""}`.trim();
  if (!clientName) missing.push("Nom/raison sociale du client");
  if (!doc.client.address) missing.push("Adresse du client");

  // Document info
  if (!doc.number) missing.push("Numéro de document");
  if (!doc.date) missing.push("Date d'émission");

  // Invoice specific
  if (doc.type === "facture") {
    if (!doc.due_date) missing.push("Date d'échéance");
    if (!doc.organization.tva_number) missing.push("N° TVA intracommunautaire");
    if (doc.total_ht === undefined) missing.push("Total HT");
    if (doc.total_tva === undefined) missing.push("Total TVA");
    if (doc.total_ttc === undefined) missing.push("Total TTC");
  }

  return { valid: missing.length === 0, missing };
}

// Zod schemas for form validation
export const organizationSchema = z.object({
  name: z.string().min(1, "La raison sociale est requise"),
  siret: z.string().optional().refine(
    (val) => !val || validateSIRET(val),
    "SIRET invalide"
  ),
  tva_number: z.string().optional().refine(
    (val) => !val || validateTVANumber(val),
    "N° TVA invalide"
  ),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  website: z.string().url("URL invalide").optional().or(z.literal("")),
  rib_iban: z.string().optional().refine(
    (val) => !val || validateIBAN(val),
    "IBAN invalide"
  ),
  rib_bic: z.string().optional(),
  rib_bank: z.string().optional(),
  default_payment_terms: z.number().min(0).max(365).default(30),
  default_tva_rate: z.number().min(0).max(100).default(20),
});

export const clientSchema = z.object({
  type: z.enum(["particulier", "professionnel"]),
  company_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default("FR"),
  siret: z.string().optional(),
  tva_number: z.string().optional(),
  notes: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  unit_price: z.number().min(0, "Le prix doit être positif"),
  unit: z.string().min(1, "L'unité est requise"),
  tva_rate: z.number().min(0).max(100),
  category: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const documentLineSchema = z.object({
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().min(0.001, "La quantité doit être positive"),
  unit: z.string().min(1),
  unit_price: z.number().min(0),
  tva_rate: z.number().min(0).max(100),
  discount_percent: z.number().min(0).max(100).default(0),
});

// TVA calculation with proper rounding
export function calculateLineTotals(line: {
  quantity: number;
  unit_price: number;
  tva_rate: number;
  discount_percent?: number;
}) {
  const subtotal = line.quantity * line.unit_price;
  const discount = subtotal * (line.discount_percent || 0) / 100;
  const total_ht = Math.round((subtotal - discount) * 100) / 100;
  const total_tva = Math.round(total_ht * line.tva_rate / 100 * 100) / 100;
  const total_ttc = Math.round((total_ht + total_tva) * 100) / 100;

  return { total_ht, total_tva, total_ttc };
}

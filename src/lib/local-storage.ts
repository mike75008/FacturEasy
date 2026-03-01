// Local storage service - simulates Supabase operations
// Will be swapped for real Supabase calls later

import type {
  Organization,
  User,
  Client,
  Product,
  Document,
  DocumentLine,
  Payment,
  Reminder,
  NumberingSequence,
  ClientInteraction,
  GamificationScore,
} from "@/types/database";

const PREFIX = "facturepro_";

function getStore<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PREFIX + key);
  return raw ? JSON.parse(raw) : [];
}

function setStore<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + key, JSON.stringify(data));
}

function getSingle<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PREFIX + key);
  return raw ? JSON.parse(raw) : null;
}

function setSingle<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + key, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ═══════════════════════════════════
// ORGANIZATION
// ═══════════════════════════════════

const DEFAULT_ORG: Organization = {
  id: "org-default",
  name: "",
  siret: null,
  tva_number: null,
  address: null,
  city: null,
  postal_code: null,
  country: "FR",
  phone: null,
  email: null,
  website: null,
  logo_url: null,
  rib_iban: null,
  rib_bic: null,
  rib_bank: null,
  default_payment_terms: 30,
  default_tva_rate: 20,
  legal_form: null,
  capital: null,
  rcs: null,
  created_at: now(),
  updated_at: now(),
};

export function getOrganization(): Organization {
  return getSingle<Organization>("organization") || { ...DEFAULT_ORG };
}

export function saveOrganization(data: Partial<Organization>): Organization {
  const current = getOrganization();
  const updated = { ...current, ...data, updated_at: now() };
  setSingle("organization", updated);
  return updated;
}

// ═══════════════════════════════════
// LOGO (stored as base64 data URL)
// ═══════════════════════════════════

export function saveLogo(dataUrl: string): void {
  setSingle("logo", dataUrl);
  saveOrganization({ logo_url: "local" });
}

export function getLogo(): string | null {
  return getSingle<string>("logo");
}

// ═══════════════════════════════════
// NUMBERING SEQUENCES
// ═══════════════════════════════════

export function getSequences(): NumberingSequence[] {
  const stored = getStore<NumberingSequence>("sequences");
  if (stored.length > 0) return stored;

  // Initialize defaults
  const year = new Date().getFullYear();
  const defaults: NumberingSequence[] = [
    { id: generateId(), organization_id: "org-default", document_type: "facture",            prefix: "FAC", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "devis",              prefix: "DEV", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "avoir",              prefix: "AVO", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "bon_livraison",      prefix: "BL",  current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "contrat",            prefix: "CTR", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "ordre_mission",      prefix: "OM",  current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "fiche_intervention", prefix: "FI",  current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "recu",               prefix: "RCU", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "bon_commande",       prefix: "BC",  current_number: 0, fiscal_year: year, created_at: now() },
  ];
  setStore("sequences", defaults);
  return defaults;
}

export function updateSequencePrefix(documentType: string, prefix: string): void {
  const sequences = getSequences();
  const idx = sequences.findIndex((s) => s.document_type === documentType);
  if (idx >= 0) {
    sequences[idx].prefix = prefix;
    setStore("sequences", sequences);
  }
}

export function generateDocumentNumber(documentType: string): string {
  const sequences = getSequences();
  const year = new Date().getFullYear();
  const idx = sequences.findIndex(
    (s) => s.document_type === documentType && s.fiscal_year === year
  );

  if (idx < 0) return `DOC-${year}-00001`;

  sequences[idx].current_number += 1;
  setStore("sequences", sequences);

  const num = String(sequences[idx].current_number).padStart(5, "0");
  return `${sequences[idx].prefix}-${year}-${num}`;
}

// ═══════════════════════════════════
// CLIENTS
// ═══════════════════════════════════

export function getClients(): Client[] {
  return getStore<Client>("clients");
}

export function getClient(id: string): Client | undefined {
  return getClients().find((c) => c.id === id);
}

export function saveClient(data: Partial<Client> & { id?: string }): Client {
  const clients = getClients();
  if (data.id) {
    const idx = clients.findIndex((c) => c.id === data.id);
    if (idx >= 0) {
      clients[idx] = { ...clients[idx], ...data, updated_at: now() };
      setStore("clients", clients);
      return clients[idx];
    }
  }

  const newClient: Client = {
    organization_id: "org-default",
    type: "professionnel",
    company_name: null,
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    address: null,
    city: null,
    postal_code: null,
    country: "FR",
    siret: null,
    tva_number: null,
    payment_behavior: null,
    notes: null,
    created_at: now(),
    updated_at: now(),
    ...data,
    id: generateId(),
  };
  clients.push(newClient);
  setStore("clients", clients);
  return newClient;
}

export function deleteClient(id: string): void {
  setStore("clients", getClients().filter((c) => c.id !== id));
}

// ═══════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════

export function getProducts(): Product[] {
  return getStore<Product>("products");
}

export function getProduct(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function saveProduct(data: Partial<Product> & { id?: string }): Product {
  const products = getProducts();
  if (data.id) {
    const idx = products.findIndex((p) => p.id === data.id);
    if (idx >= 0) {
      products[idx] = { ...products[idx], ...data, updated_at: now() };
      setStore("products", products);
      return products[idx];
    }
  }

  const newProduct: Product = {
    organization_id: "org-default",
    name: "",
    description: null,
    unit_price: 0,
    unit: "unité",
    tva_rate: 20,
    category: null,
    is_active: true,
    created_at: now(),
    updated_at: now(),
    ...data,
    id: generateId(),
  };
  products.push(newProduct);
  setStore("products", products);
  return newProduct;
}

export function deleteProduct(id: string): void {
  setStore("products", getProducts().filter((p) => p.id !== id));
}

// ═══════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════

export function getDocuments(): Document[] {
  return getStore<Document>("documents");
}

export function getDocument(id: string): Document | undefined {
  return getDocuments().find((d) => d.id === id);
}

export function saveDocument(data: Partial<Document> & { id?: string }): Document {
  const documents = getDocuments();
  if (data.id) {
    const idx = documents.findIndex((d) => d.id === data.id);
    if (idx >= 0) {
      documents[idx] = { ...documents[idx], ...data, updated_at: now() };
      setStore("documents", documents);
      return documents[idx];
    }
  }

  const newDoc: Document = {
    organization_id: "org-default",
    client_id: "",
    type: "facture",
    number: "",
    status: "brouillon",
    date: new Date().toISOString().split("T")[0],
    due_date: null,
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
    discount_percent: 0,
    discount_amount: 0,
    notes: null,
    payment_terms: null,
    source_document_id: null,
    validated_by: null,
    validated_at: null,
    pdf_url: null,
    created_by: "user-default",
    created_at: now(),
    updated_at: now(),
    ...data,
    id: generateId(),
  };
  documents.push(newDoc);
  setStore("documents", documents);
  return newDoc;
}

export function deleteDocument(id: string): void {
  setStore("documents", getDocuments().filter((d) => d.id !== id));
}

// ═══════════════════════════════════
// DOCUMENT LINES
// ═══════════════════════════════════

export function getDocumentLines(documentId: string): DocumentLine[] {
  return getStore<DocumentLine>("document_lines").filter(
    (l) => l.document_id === documentId
  );
}

export function saveDocumentLine(data: Partial<DocumentLine> & { document_id: string }): DocumentLine {
  const lines = getStore<DocumentLine>("document_lines");
  if (data.id) {
    const idx = lines.findIndex((l) => l.id === data.id);
    if (idx >= 0) {
      lines[idx] = { ...lines[idx], ...data };
      setStore("document_lines", lines);
      return lines[idx];
    }
  }

  const newLine: DocumentLine = {
    product_id: null,
    description: "",
    quantity: 1,
    unit: "unité",
    unit_price: 0,
    tva_rate: 20,
    discount_percent: 0,
    total_ht: 0,
    total_tva: 0,
    total_ttc: 0,
    position: 0,
    created_at: now(),
    ...data,
    id: generateId(),
  };
  lines.push(newLine);
  setStore("document_lines", lines);
  return newLine;
}

export function deleteDocumentLine(id: string): void {
  setStore(
    "document_lines",
    getStore<DocumentLine>("document_lines").filter((l) => l.id !== id)
  );
}

export function deleteDocumentLines(documentId: string): void {
  setStore(
    "document_lines",
    getStore<DocumentLine>("document_lines").filter((l) => l.document_id !== documentId)
  );
}

// ═══════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════

export function getPayments(documentId?: string): Payment[] {
  const all = getStore<Payment>("payments");
  return documentId ? all.filter((p) => p.document_id === documentId) : all;
}

export function savePayment(data: Partial<Payment>): Payment {
  const payments = getStore<Payment>("payments");
  const newPayment: Payment = {
    document_id: "",
    organization_id: "org-default",
    amount: 0,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "virement",
    reference: null,
    notes: null,
    created_at: now(),
    ...data,
    id: generateId(),
  };
  payments.push(newPayment);
  setStore("payments", payments);
  return newPayment;
}

// ═══════════════════════════════════
// CLIENT INTERACTIONS
// ═══════════════════════════════════

export function getClientInteractions(clientId: string): ClientInteraction[] {
  return getStore<ClientInteraction>("interactions").filter(
    (i) => i.client_id === clientId
  );
}

export function addClientInteraction(data: {
  client_id: string;
  type: string;
  description: string;
}): ClientInteraction {
  const interactions = getStore<ClientInteraction>("interactions");
  const entry: ClientInteraction = {
    id: generateId(),
    organization_id: "org-default",
    created_at: now(),
    ...data,
  };
  interactions.push(entry);
  setStore("interactions", interactions);
  return entry;
}

// ═══════════════════════════════════
// REMINDERS
// ═══════════════════════════════════

export function getReminders(): Reminder[] {
  return getStore<Reminder>("reminders");
}

export function saveReminder(data: Partial<Reminder>): Reminder {
  const reminders = getStore<Reminder>("reminders");
  const entry: Reminder = {
    document_id: "",
    organization_id: "org-default",
    channel: "email",
    priority: "medium",
    content: "",
    ai_generated: false,
    sent_at: null,
    scheduled_for: null,
    created_at: now(),
    ...data,
    id: generateId(),
  };
  reminders.push(entry);
  setStore("reminders", reminders);
  return entry;
}

// ═══════════════════════════════════
// GAMIFICATION
// ═══════════════════════════════════

export function getGamificationScore(clientId: string): GamificationScore | null {
  return getStore<GamificationScore>("gamification").find(
    (g) => g.client_id === clientId
  ) || null;
}

// ═══════════════════════════════════
// DOCUMENT VALIDATIONS
// ═══════════════════════════════════

export interface LocalValidation {
  id: string;
  document_id: string;
  action: "approve" | "reject" | "request_changes";
  comment: string | null;
  user_name: string;
  created_at: string;
}

export function getDocumentValidations(documentId: string): LocalValidation[] {
  return getStore<LocalValidation>("validations").filter(
    (v) => v.document_id === documentId
  );
}

export function addDocumentValidation(data: {
  document_id: string;
  action: "approve" | "reject" | "request_changes";
  comment?: string;
}): LocalValidation {
  const validations = getStore<LocalValidation>("validations");
  const entry: LocalValidation = {
    id: generateId(),
    document_id: data.document_id,
    action: data.action,
    comment: data.comment || null,
    user_name: "Validateur N+1",
    created_at: now(),
  };
  validations.push(entry);
  setStore("validations", validations);

  // Auto-update document status
  const doc = getDocument(data.document_id);
  if (doc) {
    if (data.action === "approve") {
      saveDocument({ ...doc, status: "valide", validated_by: "user-validator", validated_at: now() });
    } else if (data.action === "reject") {
      saveDocument({ ...doc, status: "refuse" });
    }
  }

  addAuditLog({
    action: `document_${data.action}`,
    entity_type: "document",
    entity_id: data.document_id,
    new_values: { action: data.action, comment: data.comment },
  });

  return entry;
}

// ═══════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════

export interface LocalAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  user_name: string;
  created_at: string;
}

export function getAuditLogs(entityType?: string, entityId?: string): LocalAuditLog[] {
  const all = getStore<LocalAuditLog>("audit_logs");
  if (entityType && entityId) {
    return all.filter((l) => l.entity_type === entityType && l.entity_id === entityId);
  }
  if (entityType) {
    return all.filter((l) => l.entity_type === entityType);
  }
  return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addAuditLog(data: {
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}): void {
  const logs = getStore<LocalAuditLog>("audit_logs");
  logs.push({
    id: generateId(),
    action: data.action,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    old_values: data.old_values || null,
    new_values: data.new_values || null,
    user_name: "Utilisateur",
    created_at: now(),
  });
  setStore("audit_logs", logs);
}

// ═══════════════════════════════════
// DOCUMENT AUTO-VERIFICATION
// ═══════════════════════════════════

export interface VerificationResult {
  passed: boolean;
  checks: { label: string; ok: boolean; detail?: string }[];
}

export function verifyDocument(documentId: string): VerificationResult {
  const doc = getDocument(documentId);
  if (!doc) return { passed: false, checks: [{ label: "Document existe", ok: false }] };

  const lines = getDocumentLines(documentId);
  const org = getOrganization();
  const client = getClient(doc.client_id);
  const checks: { label: string; ok: boolean; detail?: string }[] = [];

  // 1. Has lines
  checks.push({ label: "Au moins une ligne", ok: lines.length > 0, detail: lines.length === 0 ? "Le document n'a aucune ligne" : undefined });

  // 2. Totals match
  let calcHt = 0, calcTva = 0;
  lines.forEach((l) => { calcHt += l.total_ht; calcTva += l.total_tva; });
  const discountAmt = calcHt * doc.discount_percent / 100;
  const expectedHt = Math.round((calcHt - discountAmt) * 100) / 100;
  // Allow small rounding diff
  const htMatch = Math.abs(doc.total_ht - calcHt) < 0.02 || Math.abs(doc.total_ht - expectedHt) < 0.02;
  checks.push({ label: "Totaux HT cohérents", ok: htMatch, detail: htMatch ? undefined : `Attendu ~${calcHt}€, trouvé ${doc.total_ht}€` });

  // 3. TVA rates valid
  const validRates = [0, 5.5, 10, 20];
  const allRatesValid = lines.every((l) => validRates.includes(l.tva_rate));
  checks.push({ label: "Taux TVA valides", ok: allRatesValid, detail: allRatesValid ? undefined : "Taux non standard détecté" });

  // 4. Document number exists
  checks.push({ label: "Numéro de document", ok: !!doc.number, detail: !doc.number ? "Numéro manquant" : undefined });

  // 5. Client assigned
  checks.push({ label: "Client assigné", ok: !!client, detail: !client ? "Aucun client" : undefined });

  // 6. Vendor info
  checks.push({ label: "Raison sociale vendeur", ok: !!org.name, detail: !org.name ? "Manquante dans Paramètres" : undefined });

  // 7. Date present
  checks.push({ label: "Date d'émission", ok: !!doc.date });

  // 8. Due date for invoices
  if (doc.type === "facture") {
    checks.push({ label: "Date d'échéance", ok: !!doc.due_date, detail: !doc.due_date ? "Obligatoire pour les factures" : undefined });
  }

  // 9. No negative amounts
  const noNeg = lines.every((l) => l.total_ht >= 0 && l.unit_price >= 0);
  checks.push({ label: "Montants positifs", ok: noNeg });

  // 10. Sequential number format
  const numFormat = /^[A-Z]+-\d{4}-\d{5}$/.test(doc.number);
  checks.push({ label: "Format numérotation", ok: numFormat, detail: numFormat ? undefined : "Format attendu: XXX-YYYY-NNNNN" });

  return { passed: checks.every((c) => c.ok), checks };
}

// ═══════════════════════════════════
// STATS helpers
// ═══════════════════════════════════

export function getDashboardStats() {
  const documents = getDocuments();
  const clients = getClients();
  const payments = getPayments();
  const reminders = getReminders();

  const invoices = documents.filter((d) => d.type === "facture");
  const quotes = documents.filter((d) => d.type === "devis");
  const totalCA = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInvoiced = invoices.reduce((sum, d) => sum + d.total_ttc, 0);
  const pendingInvoices = invoices.filter((d) => d.status === "envoye" || d.status === "valide");
  const overdueInvoices = invoices.filter((d) => {
    if (!d.due_date || d.status === "paye" || d.status === "annule") return false;
    return new Date(d.due_date) < new Date();
  });
  const paidInvoices = invoices.filter((d) => d.status === "paye");
  const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;
  const overdueTotal = overdueInvoices.reduce((s, d) => s + d.total_ttc, 0);
  const pendingTotal = pendingInvoices.reduce((s, d) => s + d.total_ttc, 0);
  const sentReminders = reminders.filter((r) => r.sent_at).length;

  // Monthly CA data (last 12 months)
  const monthlyCA: number[] = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const monthPayments = payments.filter((p) => {
      const d = new Date(p.payment_date);
      return d >= month && d <= monthEnd;
    });
    monthlyCA.push(monthPayments.reduce((s, p) => s + p.amount, 0));
  }

  // Recent activity from audit logs
  const auditLogs = getAuditLogs().slice(0, 10);

  // Accepted quotes
  const acceptedQuotes = quotes.filter((d) => d.status === "valide" || d.status === "paye").length;
  const quoteConversion = quotes.length > 0 ? (acceptedQuotes / quotes.length) * 100 : 0;

  return {
    totalCA,
    totalInvoiced,
    invoiceCount: invoices.length,
    quoteCount: quotes.length,
    pendingCount: pendingInvoices.length,
    pendingTotal,
    overdueCount: overdueInvoices.length,
    overdueTotal,
    clientCount: clients.length,
    productCount: getProducts().length,
    paymentRate: Math.round(paymentRate * 10) / 10,
    quoteConversion: Math.round(quoteConversion * 10) / 10,
    reminderCount: reminders.length,
    sentReminders,
    monthlyCA,
    recentAuditLogs: auditLogs,
  };
}

// ═══════════════════════════════════
// ANOMALY DETECTION
// ═══════════════════════════════════

export interface LocalAnomaly {
  id: string;
  type: "montant_anormal" | "doublon" | "retard_paiement" | "degradation" | "sequence_gap";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  document_id: string | null;
  client_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export function getAnomalies(): LocalAnomaly[] {
  return getStore<LocalAnomaly>("anomalies");
}

export function resolveAnomaly(id: string): void {
  const anomalies = getAnomalies();
  const idx = anomalies.findIndex((a) => a.id === id);
  if (idx >= 0) {
    anomalies[idx].resolved = true;
    anomalies[idx].resolved_at = now();
    setStore("anomalies", anomalies);
  }
}

export function runAnomalyDetection(): LocalAnomaly[] {
  const documents = getDocuments();
  const clients = getClients();
  const existing = getAnomalies();
  const newAnomalies: LocalAnomaly[] = [];

  const invoices = documents.filter((d) => d.type === "facture");
  if (invoices.length === 0) return existing;

  // 1. Detect abnormal amounts (>3x average)
  const avgAmount = invoices.reduce((s, d) => s + d.total_ttc, 0) / invoices.length;
  invoices.forEach((inv) => {
    if (inv.total_ttc > avgAmount * 3 && avgAmount > 0) {
      const alreadyExists = existing.some((e) => e.document_id === inv.id && e.type === "montant_anormal");
      if (!alreadyExists) {
        newAnomalies.push({
          id: generateId(),
          type: "montant_anormal",
          severity: "warning",
          title: `Montant anormalement élevé`,
          description: `La facture ${inv.number} (${inv.total_ttc.toFixed(2)}€) est ${(inv.total_ttc / avgAmount).toFixed(1)}x supérieure à la moyenne (${avgAmount.toFixed(2)}€).`,
          document_id: inv.id,
          client_id: inv.client_id,
          resolved: false,
          resolved_at: null,
          created_at: now(),
        });
      }
    }
  });

  // 2. Detect duplicate amounts to same client
  invoices.forEach((inv, i) => {
    for (let j = i + 1; j < invoices.length; j++) {
      const other = invoices[j];
      if (inv.client_id === other.client_id && inv.total_ttc === other.total_ttc && inv.total_ttc > 0) {
        const daysDiff = Math.abs(new Date(inv.date).getTime() - new Date(other.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) {
          const alreadyExists = existing.some(
            (e) => e.type === "doublon" && (e.document_id === inv.id || e.document_id === other.id)
          );
          if (!alreadyExists) {
            newAnomalies.push({
              id: generateId(),
              type: "doublon",
              severity: "critical",
              title: `Doublon potentiel détecté`,
              description: `${inv.number} et ${other.number} ont le même montant (${inv.total_ttc.toFixed(2)}€) pour le même client, à ${daysDiff.toFixed(0)} jour(s) d'écart.`,
              document_id: inv.id,
              client_id: inv.client_id,
              resolved: false,
              resolved_at: null,
              created_at: now(),
            });
          }
        }
      }
    }
  });

  // 3. Detect payment degradation per client
  clients.forEach((client) => {
    const clientInvoices = invoices.filter((d) => d.client_id === client.id);
    const overdueCount = clientInvoices.filter((d) => {
      if (!d.due_date || d.status === "paye" || d.status === "annule") return false;
      return new Date(d.due_date) < new Date();
    }).length;
    if (overdueCount >= 3) {
      const clientName = client.company_name || `${client.first_name || ""} ${client.last_name || ""}`.trim();
      const alreadyExists = existing.some((e) => e.client_id === client.id && e.type === "degradation");
      if (!alreadyExists) {
        newAnomalies.push({
          id: generateId(),
          type: "degradation",
          severity: "warning",
          title: `Dégradation de paiement`,
          description: `${clientName} a ${overdueCount} factures en retard. Risque d'impayé croissant.`,
          document_id: null,
          client_id: client.id,
          resolved: false,
          resolved_at: null,
          created_at: now(),
        });
      }
    }
  });

  // 4. Detect long overdue (>30 days)
  invoices.forEach((inv) => {
    if (!inv.due_date || inv.status === "paye" || inv.status === "annule") return;
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 30) {
      const alreadyExists = existing.some((e) => e.document_id === inv.id && e.type === "retard_paiement");
      if (!alreadyExists) {
        newAnomalies.push({
          id: generateId(),
          type: "retard_paiement",
          severity: daysOverdue > 60 ? "critical" : "warning",
          title: `Retard de paiement critique`,
          description: `La facture ${inv.number} (${inv.total_ttc.toFixed(2)}€) a ${daysOverdue} jours de retard. Action requise.`,
          document_id: inv.id,
          client_id: inv.client_id,
          resolved: false,
          resolved_at: null,
          created_at: now(),
        });
      }
    }
  });

  if (newAnomalies.length > 0) {
    setStore("anomalies", [...existing, ...newAnomalies]);
  }

  return [...existing, ...newAnomalies];
}

// ═══════════════════════════════════
// GAMIFICATION ENGINE
// ═══════════════════════════════════

export interface UserGamification {
  points: number;
  level: "bronze" | "argent" | "or" | "platine" | "diamant";
  badges: Badge[];
  streak: number;
  nextLevelPoints: number;
  progress: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

const LEVEL_THRESHOLDS = {
  bronze: 0,
  argent: 500,
  or: 1500,
  platine: 3500,
  diamant: 7000,
};

const ALL_BADGES: Omit<Badge, "earned" | "earned_at">[] = [
  { id: "first_invoice", name: "Première facture", description: "Créer votre première facture", icon: "FileText" },
  { id: "speed_demon", name: "Rapidité", description: "Créer 5 factures en une journée", icon: "Zap" },
  { id: "client_king", name: "Roi des clients", description: "Avoir 10+ clients actifs", icon: "Crown" },
  { id: "payment_master", name: "Maître paiement", description: "Taux de paiement > 90%", icon: "Trophy" },
  { id: "catalog_pro", name: "Catalogue pro", description: "Avoir 20+ produits/services", icon: "Package" },
  { id: "reminder_guru", name: "Guru des relances", description: "Envoyer 10+ relances", icon: "Bell" },
  { id: "zero_overdue", name: "Zéro retard", description: "Aucune facture en retard", icon: "Shield" },
  { id: "revenue_10k", name: "10K€ de CA", description: "Atteindre 10 000€ de CA", icon: "TrendingUp" },
  { id: "revenue_50k", name: "50K€ de CA", description: "Atteindre 50 000€ de CA", icon: "Rocket" },
  { id: "perfect_docs", name: "Documents parfaits", description: "10 documents vérifiés sans erreur", icon: "CheckCircle" },
];

export function getUserGamification(): UserGamification {
  const stored = getSingle<UserGamification>("gamification_user");
  if (stored) return recalculateGamification(stored);
  return recalculateGamification({
    points: 0,
    level: "bronze",
    badges: [],
    streak: 0,
    nextLevelPoints: 500,
    progress: 0,
  });
}

function recalculateGamification(current: UserGamification): UserGamification {
  const stats = getDashboardStats();
  const reminders = getReminders();
  const documents = getDocuments();

  // Calculate points
  let points = 0;
  points += documents.length * 10; // 10pts per document
  points += stats.clientCount * 25; // 25pts per client
  points += stats.sentReminders * 15; // 15pts per sent reminder
  points += Math.floor(stats.totalCA / 100) * 5; // 5pts per 100€ CA
  points += documents.filter((d) => d.status === "paye").length * 20; // 20pts per paid invoice

  // Determine level
  let level: UserGamification["level"] = "bronze";
  if (points >= LEVEL_THRESHOLDS.diamant) level = "diamant";
  else if (points >= LEVEL_THRESHOLDS.platine) level = "platine";
  else if (points >= LEVEL_THRESHOLDS.or) level = "or";
  else if (points >= LEVEL_THRESHOLDS.argent) level = "argent";

  // Next level
  const levels: UserGamification["level"][] = ["bronze", "argent", "or", "platine", "diamant"];
  const currentIdx = levels.indexOf(level);
  const nextLevel = currentIdx < levels.length - 1 ? levels[currentIdx + 1] : level;
  const nextLevelPoints = LEVEL_THRESHOLDS[nextLevel];
  const currentLevelPoints = LEVEL_THRESHOLDS[level];
  const progress = nextLevelPoints > currentLevelPoints
    ? ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100
    : 100;

  // Calculate badges
  const badges: Badge[] = ALL_BADGES.map((b) => {
    let earned = false;
    const n = now();
    switch (b.id) {
      case "first_invoice": earned = documents.some((d) => d.type === "facture"); break;
      case "client_king": earned = stats.clientCount >= 10; break;
      case "payment_master": earned = stats.paymentRate >= 90 && stats.invoiceCount > 0; break;
      case "catalog_pro": earned = stats.productCount >= 20; break;
      case "reminder_guru": earned = stats.sentReminders >= 10; break;
      case "zero_overdue": earned = stats.overdueCount === 0 && stats.invoiceCount > 0; break;
      case "revenue_10k": earned = stats.totalCA >= 10000; break;
      case "revenue_50k": earned = stats.totalCA >= 50000; break;
      case "speed_demon": {
        const today = new Date().toISOString().split("T")[0];
        earned = documents.filter((d) => d.type === "facture" && d.created_at.startsWith(today)).length >= 5;
        break;
      }
      case "perfect_docs": earned = documents.length >= 10; break;
    }
    return { ...b, earned, earned_at: earned ? n : null };
  });

  const result: UserGamification = {
    points,
    level,
    badges,
    streak: current.streak,
    nextLevelPoints,
    progress: Math.min(Math.round(progress * 10) / 10, 100),
  };

  setSingle("gamification_user", result);
  return result;
}

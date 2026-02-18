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
    { id: generateId(), organization_id: "org-default", document_type: "facture", prefix: "FAC", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "devis", prefix: "DEV", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "avoir", prefix: "AVO", current_number: 0, fiscal_year: year, created_at: now() },
    { id: generateId(), organization_id: "org-default", document_type: "bon_livraison", prefix: "BL", current_number: 0, fiscal_year: year, created_at: now() },
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
    id: generateId(),
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
    id: generateId(),
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
    id: generateId(),
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
    id: generateId(),
    document_id: data.document_id,
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
    id: generateId(),
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
    id: generateId(),
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
// STATS helpers
// ═══════════════════════════════════

export function getDashboardStats() {
  const documents = getDocuments();
  const clients = getClients();
  const payments = getPayments();

  const invoices = documents.filter((d) => d.type === "facture");
  const totalCA = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingInvoices = invoices.filter((d) => d.status === "envoye");
  const overdueInvoices = invoices.filter((d) => {
    if (!d.due_date || d.status === "paye") return false;
    return new Date(d.due_date) < new Date();
  });
  const paidInvoices = invoices.filter((d) => d.status === "paye");
  const paymentRate = invoices.length > 0 ? (paidInvoices.length / invoices.length) * 100 : 0;

  return {
    totalCA,
    invoiceCount: invoices.length,
    pendingCount: pendingInvoices.length,
    overdueCount: overdueInvoices.length,
    clientCount: clients.length,
    paymentRate: Math.round(paymentRate * 10) / 10,
  };
}

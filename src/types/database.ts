// Supabase Database Types

export type UserRole = "owner" | "admin" | "accountant" | "viewer";
export type ClientType = "particulier" | "professionnel";
export type DocumentType = "facture" | "devis" | "avoir" | "bon_livraison";
export type DocumentStatus = "brouillon" | "valide" | "envoye" | "paye" | "annule" | "refuse";
export type ReminderChannel = "email" | "sms" | "appel";
export type ReminderPriority = "low" | "medium" | "high" | "critical";
export type GamificationLevel = "bronze" | "argent" | "or" | "platine" | "diamant";
export type AlertSeverity = "info" | "warning" | "critical";
export type ValidationAction = "approve" | "reject" | "request_changes";

export interface Organization {
  id: string;
  name: string;
  siret: string | null;
  tva_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  rib_iban: string | null;
  rib_bic: string | null;
  rib_bank: string | null;
  default_payment_terms: number;
  default_tva_rate: number;
  legal_form: string | null;
  capital: string | null;
  rcs: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  auth_id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  type: ClientType;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  siret: string | null;
  tva_number: string | null;
  sector: string | null;
  payment_behavior: "excellent" | "bon" | "moyen" | "mauvais" | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string;
  tva_rate: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  client_id: string;
  type: DocumentType;
  number: string;
  status: DocumentStatus;
  date: string;
  due_date: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  discount_percent: number;
  discount_amount: number;
  notes: string | null;
  payment_terms: string | null;
  source_document_id: string | null;
  validated_by: string | null;
  validated_at: string | null;
  pdf_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentLine {
  id: string;
  document_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  tva_rate: number;
  discount_percent: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  position: number;
  created_at: string;
}

export interface Payment {
  id: string;
  document_id: string;
  organization_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  document_id: string;
  organization_id: string;
  channel: ReminderChannel;
  priority: ReminderPriority;
  content: string;
  ai_generated: boolean;
  sent_at: string | null;
  scheduled_for: string | null;
  created_at: string;
}

export interface NumberingSequence {
  id: string;
  organization_id: string;
  document_type: DocumentType;
  prefix: string;
  current_number: number;
  fiscal_year: number;
  created_at: string;
}

export interface DocumentValidation {
  id: string;
  document_id: string;
  user_id: string;
  action: ValidationAction;
  comment: string | null;
  created_at: string;
}

export interface ClientInteraction {
  id: string;
  client_id: string;
  organization_id: string;
  type: string;
  description: string;
  created_at: string;
}

export interface GamificationScore {
  id: string;
  client_id: string;
  organization_id: string;
  points: number;
  level: GamificationLevel;
  badges: string[];
  updated_at: string;
}

export interface AnomalyAlert {
  id: string;
  organization_id: string;
  document_id: string | null;
  type: string;
  severity: AlertSeverity;
  description: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface AILog {
  id: string;
  organization_id: string;
  feature: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

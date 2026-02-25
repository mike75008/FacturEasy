-- ============================================================
-- FACTURATION UNIVERSELLE - Schema initial
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  siret VARCHAR(14),
  tva_number VARCHAR(20),
  address TEXT,
  city TEXT,
  postal_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'FR',
  phone VARCHAR(20),
  email TEXT,
  website TEXT,
  logo_url TEXT,
  rib_iban VARCHAR(34),
  rib_bic VARCHAR(11),
  rib_bank TEXT,
  default_payment_terms INTEGER DEFAULT 30,
  default_tva_rate NUMERIC(5,2) DEFAULT 20.00,
  legal_form TEXT,
  capital TEXT,
  rcs TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'professionnel' CHECK (type IN ('particulier', 'professionnel')),
  company_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone VARCHAR(20),
  address TEXT,
  city TEXT,
  postal_code VARCHAR(10),
  country VARCHAR(2) DEFAULT 'FR',
  siret VARCHAR(14),
  tva_number VARCHAR(20),
  payment_behavior TEXT CHECK (payment_behavior IN ('excellent', 'bon', 'moyen', 'mauvais')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unité',
  tva_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NUMBERING SEQUENCES
-- ============================================================
CREATE TABLE numbering_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('facture', 'devis', 'avoir', 'bon_livraison')),
  prefix TEXT NOT NULL DEFAULT 'FAC',
  current_number INTEGER NOT NULL DEFAULT 0,
  fiscal_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, document_type, fiscal_year)
);

-- ============================================================
-- DOCUMENTS (factures, devis, avoirs, bons de livraison)
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('facture', 'devis', 'avoir', 'bon_livraison')),
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'valide', 'envoye', 'paye', 'annule', 'refuse')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  payment_terms TEXT,
  source_document_id UUID REFERENCES documents(id),
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, number)
);

-- ============================================================
-- DOCUMENT LINES
-- ============================================================
CREATE TABLE document_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'unité',
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'virement',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'appel')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  content TEXT NOT NULL,
  ai_generated BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENT VALIDATIONS (double contrôle N+1)
-- ============================================================
CREATE TABLE document_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'request_changes')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENT INTERACTIONS (timeline)
-- ============================================================
CREATE TABLE client_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GAMIFICATION SCORES
-- ============================================================
CREATE TABLE gamification_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'argent', 'or', 'platine', 'diamant')),
  badges JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANOMALY ALERTS
-- ============================================================
CREATE TABLE anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  description TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI LOGS
-- ============================================================
CREATE TABLE ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNCTION: Generate document number (atomic, no gaps)
-- ============================================================
CREATE OR REPLACE FUNCTION generate_document_number(
  p_organization_id UUID,
  p_document_type TEXT,
  p_fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())
)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_next_number INTEGER;
  v_result TEXT;
BEGIN
  -- Insert or get sequence with lock
  INSERT INTO numbering_sequences (organization_id, document_type, prefix, current_number, fiscal_year)
  VALUES (
    p_organization_id,
    p_document_type,
    CASE p_document_type
      WHEN 'facture' THEN 'FAC'
      WHEN 'devis' THEN 'DEV'
      WHEN 'avoir' THEN 'AVO'
      WHEN 'bon_livraison' THEN 'BL'
    END,
    0,
    p_fiscal_year
  )
  ON CONFLICT (organization_id, document_type, fiscal_year) DO NOTHING;

  -- Lock and increment atomically
  UPDATE numbering_sequences
  SET current_number = current_number + 1
  WHERE organization_id = p_organization_id
    AND document_type = p_document_type
    AND fiscal_year = p_fiscal_year
  RETURNING prefix, current_number INTO v_prefix, v_next_number;

  -- Format: PREFIX-YEAR-00001
  v_result := v_prefix || '-' || p_fiscal_year::TEXT || '-' || LPAD(v_next_number::TEXT, 5, '0');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE numbering_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's organization
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: users can only see their own org
CREATE POLICY "org_select" ON organizations FOR SELECT USING (id = get_user_org_id());
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (id = get_user_org_id());

-- Users: see users in same org
CREATE POLICY "users_select" ON users FOR SELECT USING (organization_id = get_user_org_id());

-- Clients: org-scoped
CREATE POLICY "clients_all" ON clients FOR ALL USING (organization_id = get_user_org_id());

-- Products: org-scoped
CREATE POLICY "products_all" ON products FOR ALL USING (organization_id = get_user_org_id());

-- Documents: org-scoped
CREATE POLICY "documents_all" ON documents FOR ALL USING (organization_id = get_user_org_id());

-- Document lines: via document org
CREATE POLICY "doc_lines_all" ON document_lines FOR ALL
  USING (document_id IN (SELECT id FROM documents WHERE organization_id = get_user_org_id()));

-- Numbering sequences: org-scoped
CREATE POLICY "sequences_all" ON numbering_sequences FOR ALL USING (organization_id = get_user_org_id());

-- Payments: org-scoped
CREATE POLICY "payments_all" ON payments FOR ALL USING (organization_id = get_user_org_id());

-- Reminders: org-scoped
CREATE POLICY "reminders_all" ON reminders FOR ALL USING (organization_id = get_user_org_id());

-- Validations: via document
CREATE POLICY "validations_all" ON document_validations FOR ALL
  USING (document_id IN (SELECT id FROM documents WHERE organization_id = get_user_org_id()));

-- Client interactions: org-scoped
CREATE POLICY "interactions_all" ON client_interactions FOR ALL USING (organization_id = get_user_org_id());

-- Gamification: org-scoped
CREATE POLICY "gamification_all" ON gamification_scores FOR ALL USING (organization_id = get_user_org_id());

-- Anomaly alerts: org-scoped
CREATE POLICY "alerts_all" ON anomaly_alerts FOR ALL USING (organization_id = get_user_org_id());

-- AI logs: org-scoped
CREATE POLICY "ai_logs_all" ON ai_logs FOR ALL USING (organization_id = get_user_org_id());

-- Audit logs: org-scoped (select only for non-owners)
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (organization_id = get_user_org_id());

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: auto-create organization + user on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon Entreprise'),
    NEW.email
  )
  RETURNING id INTO v_org_id;

  -- Create user profile
  INSERT INTO users (auth_id, organization_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_org_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'owner'
  );

  -- Create default numbering sequences
  INSERT INTO numbering_sequences (organization_id, document_type, prefix, fiscal_year)
  VALUES
    (v_org_id, 'facture', 'FAC', EXTRACT(YEAR FROM NOW())),
    (v_org_id, 'devis', 'DEV', EXTRACT(YEAR FROM NOW())),
    (v_org_id, 'avoir', 'AVO', EXTRACT(YEAR FROM NOW())),
    (v_org_id, 'bon_livraison', 'BL', EXTRACT(YEAR FROM NOW()));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: setup_new_account (appelée à l'inscription via RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION setup_new_account(
  p_auth_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_company_name TEXT DEFAULT 'Mon Entreprise'
)
RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE auth_id = p_auth_id) THEN RETURN; END IF;

  INSERT INTO organizations (name, email)
  VALUES (COALESCE(NULLIF(p_company_name, ''), 'Mon Entreprise'), p_email)
  RETURNING id INTO v_org_id;

  INSERT INTO users (auth_id, organization_id, email, full_name, role)
  VALUES (p_auth_id, v_org_id, p_email, COALESCE(NULLIF(p_full_name, ''), p_email), 'owner');

  INSERT INTO numbering_sequences (organization_id, document_type, prefix, fiscal_year)
  VALUES
    (v_org_id, 'facture', 'FAC', EXTRACT(YEAR FROM NOW())::INTEGER),
    (v_org_id, 'devis', 'DEV', EXTRACT(YEAR FROM NOW())::INTEGER),
    (v_org_id, 'avoir', 'AVO', EXTRACT(YEAR FROM NOW())::INTEGER),
    (v_org_id, 'bon_livraison', 'BL', EXTRACT(YEAR FROM NOW())::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: setup_account_if_missing (appelée au chargement dashboard)
-- ============================================================
CREATE OR REPLACE FUNCTION setup_account_if_missing()
RETURNS VOID AS $$
DECLARE
  v_user_record RECORD;
  v_org_id UUID;
BEGIN
  SELECT id, email, raw_user_meta_data INTO v_user_record
  FROM auth.users WHERE id = auth.uid();

  IF v_user_record IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE auth_id = auth.uid()) THEN RETURN; END IF;

  INSERT INTO organizations (name, email)
  VALUES (
    COALESCE(NULLIF(v_user_record.raw_user_meta_data->>'company_name', ''), 'Mon Entreprise'),
    v_user_record.email
  )
  RETURNING id INTO v_org_id;

  INSERT INTO users (auth_id, organization_id, email, full_name, role)
  VALUES (
    auth.uid(), v_org_id, v_user_record.email,
    COALESCE(NULLIF(v_user_record.raw_user_meta_data->>'full_name', ''), v_user_record.email),
    'owner'
  );

  INSERT INTO numbering_sequences (organization_id, document_type, prefix, fiscal_year)
  VALUES
    (v_org_id, 'facture', 'FAC', EXTRACT(YEAR FROM NOW())::INTEGER),
    (v_org_id, 'devis', 'DEV', EXTRACT(YEAR FROM NOW())::INTEGER),
    (v_org_id, 'avoir', 'AVO', EXTRACT(YEAR FROM NOW())::INTEGER),
    (v_org_id, 'bon_livraison', 'BL', EXTRACT(YEAR FROM NOW())::INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_date ON documents(date);
CREATE INDEX idx_document_lines_doc ON document_lines(document_id);
CREATE INDEX idx_payments_doc ON payments(document_id);
CREATE INDEX idx_reminders_doc ON reminders(document_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

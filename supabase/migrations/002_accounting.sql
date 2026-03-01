-- ============================================================
-- MIGRATION 002 — Module Comptabilité
-- ============================================================

-- ── 1. Étendre documents.type CHECK ──────────────────────────────────────────
-- Le schema initial ne déclarait que 4 types ; TypeScript en a 8.
-- On cherche dynamiquement le nom auto-généré de la contrainte et on la remplace.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'documents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type IN%'
  LOOP
    EXECUTE 'ALTER TABLE documents DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'facture', 'devis', 'avoir', 'bon_livraison',
    'contrat', 'ordre_mission', 'fiche_intervention',
    'recu', 'bon_commande'
  ));

-- ── 2. Étendre numbering_sequences.document_type CHECK ───────────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'numbering_sequences'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%document_type IN%'
  LOOP
    EXECUTE 'ALTER TABLE numbering_sequences DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

ALTER TABLE numbering_sequences ADD CONSTRAINT numbering_sequences_type_check
  CHECK (document_type IN (
    'facture', 'devis', 'avoir', 'bon_livraison',
    'contrat', 'ordre_mission', 'fiche_intervention',
    'recu', 'bon_commande'
  ));

-- ── 3. Ajouter regime_tva sur organizations ──────────────────────────────────

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS regime_tva TEXT
  CHECK (regime_tva IN ('franchise_base', 'reel_mensuel', 'reel_trimestriel', 'exonere'));

-- ── 5. Ajouter paid_at sur documents ─────────────────────────────────────────

ALTER TABLE documents ADD COLUMN IF NOT EXISTS paid_at DATE;

-- Backfill : les factures déjà payées reçoivent la date de dernière modification
-- comme approximation de la date d'encaissement réelle.
UPDATE documents
SET paid_at = DATE(updated_at)
WHERE status = 'paye' AND paid_at IS NULL;

-- ── 6. Table depenses ─────────────────────────────────────────────────────────
-- Factures fournisseurs — source de la TVA déductible et du journal AC du FEC.

CREATE TABLE IF NOT EXISTS depenses (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  fournisseur     TEXT          NOT NULL DEFAULT '',
  description     TEXT          NOT NULL DEFAULT '',
  categorie_code  TEXT          NOT NULL DEFAULT '606',
  categorie_lib   TEXT          NOT NULL DEFAULT '',
  montant_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_rate        NUMERIC(5,2)  NOT NULL DEFAULT 20,
  montant_tva     NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc     NUMERIC(12,2) NOT NULL DEFAULT 0,
  piece_ref       TEXT          NOT NULL DEFAULT '',
  piece_url       TEXT,                          -- Chemin Supabase Storage
  created_at      TIMESTAMPTZ   DEFAULT NOW()    NOT NULL,
  updated_at      TIMESTAMPTZ   DEFAULT NOW()    NOT NULL
);

ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "depenses_org_policy" ON depenses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_depenses_org_date ON depenses(organization_id, date);

CREATE TRIGGER trg_depenses_updated_at
  BEFORE UPDATE ON depenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 7. Table declarations_tva ─────────────────────────────────────────────────
-- Historique des CA3 archivées — chaque déclaration validée est sauvegardée.

CREATE TABLE IF NOT EXISTS declarations_tva (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  annee           INTEGER       NOT NULL,
  mois            INTEGER       CHECK (mois BETWEEN 1 AND 12),
  trimestre       INTEGER       CHECK (trimestre BETWEEN 1 AND 4),
  periodicite     TEXT          NOT NULL DEFAULT 'mensuelle'
                                CHECK (periodicite IN ('mensuelle', 'trimestrielle')),
  ca_ht           NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_collectee   NUMERIC(12,2) NOT NULL DEFAULT 0,
  charges_ht      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_deductible  NUMERIC(12,2) NOT NULL DEFAULT 0,
  solde_tva       NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut          TEXT          NOT NULL DEFAULT 'simulee'
                                CHECK (statut IN ('simulee', 'deposee')),
  deposee_le      DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ   DEFAULT NOW() NOT NULL
);

ALTER TABLE declarations_tva ENABLE ROW LEVEL SECURITY;

CREATE POLICY "declarations_tva_org_policy" ON declarations_tva
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_declarations_org_annee
  ON declarations_tva(organization_id, annee);

CREATE TRIGGER trg_declarations_tva_updated_at
  BEFORE UPDATE ON declarations_tva
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 8. Storage : bucket justificatifs ────────────────────────────────────────
-- À exécuter dans le Dashboard Supabase → Storage → New bucket
-- (déjà fait manuellement) puis ajouter la policy via l'éditeur SQL :
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('justificatifs', 'justificatifs', false)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "justificatifs_auth_policy" ON storage.objects
--   FOR ALL TO authenticated USING (bucket_id = 'justificatifs');

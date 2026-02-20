-- ============================================================
-- FACTUREPRO — Schéma Supabase complet
-- Coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null default '',
  siret text,
  tva_number text,
  address text,
  city text,
  postal_code text,
  country text not null default 'FR',
  phone text,
  email text,
  website text,
  logo_url text,
  rib_iban text,
  rib_bic text,
  rib_bank text,
  default_payment_terms integer not null default 30,
  default_tva_rate numeric(5,2) not null default 20,
  legal_form text,
  capital text,
  rcs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USERS (profils liés à auth.users)
-- ============================================================
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'owner' check (role in ('owner','admin','accountant','viewer')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auth_id)
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type text not null check (type in ('particulier','professionnel')),
  company_name text,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text not null default 'FR',
  siret text,
  tva_number text,
  payment_behavior text check (payment_behavior in ('excellent','bon','moyen','mauvais')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  unit_price numeric(12,2) not null default 0,
  unit text not null default 'unité',
  tva_rate numeric(5,2) not null default 20,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- NUMBERING SEQUENCES
-- ============================================================
create table if not exists numbering_sequences (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  document_type text not null check (document_type in ('facture','devis','avoir','bon_livraison')),
  prefix text not null default 'FAC',
  current_number integer not null default 0,
  fiscal_year integer not null default extract(year from now())::integer,
  created_at timestamptz not null default now(),
  unique(organization_id, document_type, fiscal_year)
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_id uuid not null references clients(id) on delete restrict,
  type text not null check (type in ('facture','devis','avoir','bon_livraison')),
  number text not null,
  status text not null default 'brouillon' check (status in ('brouillon','valide','envoye','paye','annule','refuse')),
  date date not null default current_date,
  due_date date,
  total_ht numeric(12,2) not null default 0,
  total_tva numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  notes text,
  payment_terms text,
  source_document_id uuid references documents(id),
  validated_by uuid references users(id),
  validated_at timestamptz,
  pdf_url text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DOCUMENT LINES
-- ============================================================
create table if not exists document_lines (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'unité',
  unit_price numeric(12,2) not null default 0,
  tva_rate numeric(5,2) not null default 20,
  discount_percent numeric(5,2) not null default 0,
  total_ht numeric(12,2) not null default 0,
  total_tva numeric(12,2) not null default 0,
  total_ttc numeric(12,2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date date not null default current_date,
  payment_method text not null default 'virement',
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REMINDERS
-- ============================================================
create table if not exists reminders (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','sms','appel')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  content text not null,
  ai_generated boolean not null default false,
  sent_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — chaque org ne voit que ses données
-- ============================================================
alter table organizations enable row level security;
alter table users enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table documents enable row level security;
alter table document_lines enable row level security;
alter table payments enable row level security;
alter table reminders enable row level security;
alter table numbering_sequences enable row level security;
alter table audit_logs enable row level security;

-- Helper : récupère l'organization_id de l'utilisateur connecté
create or replace function get_user_org_id()
returns uuid language sql security definer stable as $$
  select organization_id from users where auth_id = auth.uid() limit 1;
$$;

-- Policies organizations
create policy "org_select" on organizations for select using (id = get_user_org_id());
create policy "org_update" on organizations for update using (id = get_user_org_id());

-- Policies users
create policy "users_select" on users for select using (organization_id = get_user_org_id());
create policy "users_update" on users for update using (auth_id = auth.uid());

-- Policies clients
create policy "clients_all" on clients for all using (organization_id = get_user_org_id());

-- Policies products
create policy "products_all" on products for all using (organization_id = get_user_org_id());

-- Policies documents
create policy "documents_all" on documents for all using (organization_id = get_user_org_id());

-- Policies document_lines (via document)
create policy "lines_all" on document_lines for all
  using (document_id in (select id from documents where organization_id = get_user_org_id()));

-- Policies payments
create policy "payments_all" on payments for all using (organization_id = get_user_org_id());

-- Policies reminders
create policy "reminders_all" on reminders for all using (organization_id = get_user_org_id());

-- Policies numbering_sequences
create policy "sequences_all" on numbering_sequences for all using (organization_id = get_user_org_id());

-- Policies audit_logs
create policy "audit_select" on audit_logs for select using (organization_id = get_user_org_id());
create policy "audit_insert" on audit_logs for insert with check (organization_id = get_user_org_id());

-- ============================================================
-- FONCTION : création automatique du profil à l'inscription
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_org_id uuid;
begin
  -- Crée une organisation par défaut
  insert into organizations (name) values ('Mon Entreprise')
  returning id into new_org_id;

  -- Crée le profil utilisateur
  insert into users (auth_id, organization_id, email, full_name, role)
  values (
    new.id,
    new_org_id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'owner'
  );

  -- Crée les séquences de numérotation par défaut
  insert into numbering_sequences (organization_id, document_type, prefix, current_number, fiscal_year)
  values
    (new_org_id, 'facture', 'FAC', 0, extract(year from now())::integer),
    (new_org_id, 'devis', 'DEV', 0, extract(year from now())::integer),
    (new_org_id, 'avoir', 'AVO', 0, extract(year from now())::integer),
    (new_org_id, 'bon_livraison', 'BL', 0, extract(year from now())::integer);

  return new;
end;
$$;

-- Déclenche la fonction à chaque nouvel utilisateur
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

CREATE TABLE portal_companies (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_email text NOT NULL DEFAULT '',
  admin_name text NOT NULL DEFAULT 'Administrator',
  admin_password_hash text,
  auth_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO portal_companies(id, slug, name) VALUES ('javed', 'javed', 'Javed Publishers');
CREATE TABLE portal_company_domains (
  hostname text PRIMARY KEY,
  company_id text NOT NULL REFERENCES portal_companies(id)
);
INSERT INTO portal_company_domains(hostname, company_id) VALUES ('visit.javedpublishers.com', 'javed');
CREATE TABLE portal_owners (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  auth_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE portal_owner_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id text NOT NULL,
  action text NOT NULL,
  company_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE portal_documents ADD COLUMN company_id text NOT NULL DEFAULT 'javed' REFERENCES portal_companies(id);
ALTER TABLE portal_documents DROP CONSTRAINT portal_documents_pkey;
ALTER TABLE portal_documents ADD PRIMARY KEY (company_id, path);
CREATE INDEX portal_documents_company_collection_idx ON portal_documents(company_id, collection_path, document_id);
ALTER TABLE portal_sessions ADD COLUMN company_id text NOT NULL DEFAULT 'javed';
ALTER TABLE portal_sessions DROP CONSTRAINT portal_sessions_role_check;
ALTER TABLE portal_sessions ADD CONSTRAINT portal_sessions_role_check CHECK(role IN ('admin','marketer','trainer','owner'));

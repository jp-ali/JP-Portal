CREATE TABLE IF NOT EXISTS portal_documents (
  path text PRIMARY KEY,
  collection_path text NOT NULL,
  document_id text NOT NULL,
  payload jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_documents_path_check CHECK (
    length(path) > 0 AND length(collection_path) > 0 AND length(document_id) > 0
  )
);

CREATE INDEX IF NOT EXISTS portal_documents_collection_idx
  ON portal_documents (collection_path, document_id);
CREATE INDEX IF NOT EXISTS portal_documents_payload_idx
  ON portal_documents USING gin (payload jsonb_path_ops);
CREATE INDEX IF NOT EXISTS portal_documents_marketer_email_idx
  ON portal_documents (collection_path, (lower(payload->>'marketerEmail')))
  WHERE payload ? 'marketerEmail';
CREATE INDEX IF NOT EXISTS portal_documents_account_email_idx
  ON portal_documents (collection_path, (lower(payload->>'email')))
  WHERE payload ? 'email';

CREATE TABLE IF NOT EXISTS portal_sessions (
  token_id uuid PRIMARY KEY,
  account_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'marketer')),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_sessions_active_idx
  ON portal_sessions (account_id, expires_at) WHERE revoked_at IS NULL;

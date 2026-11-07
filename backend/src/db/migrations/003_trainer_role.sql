ALTER TABLE portal_sessions DROP CONSTRAINT IF EXISTS portal_sessions_role_check;
ALTER TABLE portal_sessions ADD CONSTRAINT portal_sessions_role_check
  CHECK (role IN ('admin', 'marketer', 'trainer'));

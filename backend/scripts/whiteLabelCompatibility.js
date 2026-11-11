import 'dotenv/config';
import { postgresPool, closePostgresPool } from '../src/config/postgres.js';
const db = postgresPool();
try {
  const action = process.argv[2];
  if (!['enable', 'disable'].includes(action)) throw new Error('Use enable or disable');
  if (action === 'enable') {
    const result = await db.query("SELECT count(*)::int AS count FROM portal_companies WHERE id<>'javed'");
    if (result.rows[0].count) throw new Error('Cannot enable legacy compatibility while other companies exist');
    await db.query('CREATE UNIQUE INDEX IF NOT EXISTS portal_documents_legacy_path_compat ON portal_documents(path)');
  } else await db.query('DROP INDEX IF EXISTS portal_documents_legacy_path_compat');
  console.log(`Legacy document compatibility ${action}d.`);
} finally { await closePostgresPool(); }

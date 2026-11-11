import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { postgresPool, closePostgresPool } from '../src/config/postgres.js';
// Run from the server console with OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME.
// No public bootstrap endpoint, no default password, no credentials in logs.
try {
  const email = String(process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) throw new Error('Set a valid OWNER_EMAIL and OWNER_PASSWORD (12–128 characters)');
  const hash = await bcrypt.hash(password, 12);
  await postgresPool().query('INSERT INTO portal_owners(id,email,name,password_hash) VALUES($1,$2,$3,$4)', [randomUUID(), email, process.env.OWNER_NAME || 'Platform Owner', hash]);
  console.log('Platform owner created. Sign in at /owner.');
} catch (error) { console.error(error.code === '23505' ? 'Owner already exists; no changes made.' : error.message); process.exitCode = 1; }
finally { await closePostgresPool(); }

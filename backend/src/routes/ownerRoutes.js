import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { postgresPool } from '../config/postgres.js';
import { createJwtSession, verifyJwtSession, revokeJwtSession } from '../services/jwtSession.js';
import { verifyPassword } from '../services/passwordVerifier.js';
import { publicCompany, saveCompany, companyError } from '../services/companyService.js';
import { FEATURE_LABELS } from '../../../shared/company.js';

export const ownerRoutes = Router();
const run = handler => async (req, res, next) => { try { await handler(req, res, next); } catch (error) { next(error); } };
const cookieName = 'school_visit_owner_session';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/owner', maxAge: 12 * 3600000 });
const tokenFor = req => (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) || '';
ownerRoutes.post('/login', rateLimit({ windowMs: 5 * 60000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 5 minutes.' } }), run(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 200 || password.length > 128) throw companyError('Enter your owner email and password');
  const owner = (await postgresPool().query('SELECT * FROM portal_owners WHERE email=$1', [email.trim().toLowerCase()])).rows[0];
  if (!owner || !await verifyPassword(password, owner.password_hash)) throw companyError('Invalid owner email or password', 401);
  const token = await createJwtSession({ sub: owner.id, role: 'owner', companyId: '_platform', authVersion: owner.auth_version });
  res.cookie(cookieName, token, cookieOptions());
  res.json({ owner: { id: owner.id, name: owner.name, email: owner.email } });
}));
ownerRoutes.post('/logout', run(async (req, res) => {
  await revokeJwtSession(tokenFor(req));
  res.clearCookie(cookieName, cookieOptions());
  res.status(204).end();
}));
ownerRoutes.use(run(async (req, res, next) => {
  const claims = await verifyJwtSession(tokenFor(req));
  if (!claims || claims.role !== 'owner' || claims.companyId !== '_platform') throw companyError('Platform owner login required', 401);
  const owner = (await postgresPool().query('SELECT id,name,email,auth_version FROM portal_owners WHERE id=$1', [claims.sub])).rows[0];
  if (!owner || owner.auth_version !== claims.authVersion) throw companyError('Sign in again', 401);
  req.owner = owner;
  next();
}));
ownerRoutes.get('/me', run(async (req, res) => res.json({ owner: { id: req.owner.id, name: req.owner.name, email: req.owner.email } })));
ownerRoutes.get('/companies', run(async (_req, res) => {
  const rows = (await postgresPool().query(`SELECT c.*, count(d.path)::int AS records FROM portal_companies c
    LEFT JOIN portal_documents d ON d.company_id=c.id GROUP BY c.id ORDER BY c.created_at`)).rows;
  res.json({ companies: rows.map(row => ({ ...publicCompany(row), records: row.records, createdAt: row.created_at, updatedAt: row.updated_at })), featureLabels: FEATURE_LABELS, baseDomain: process.env.COMPANY_BASE_DOMAIN || '' });
}));
ownerRoutes.post('/companies', run(async (req, res) => res.status(201).json({ company: await saveCompany(req.body, null, req.owner.id) })));
ownerRoutes.patch('/companies/:id', run(async (req, res) => res.json({ company: await saveCompany(req.body, req.params.id, req.owner.id) })));
ownerRoutes.get('/audit', run(async (_req, res) => res.json({ events: (await postgresPool().query(`SELECT a.action,a.created_at,c.name AS company,o.email AS owner FROM portal_owner_audit a
  LEFT JOIN portal_companies c ON c.id=a.company_id LEFT JOIN portal_owners o ON o.id=a.owner_id ORDER BY a.id DESC LIMIT 50`)).rows })));
ownerRoutes.put('/password', run(async (req, res) => {
  const { currentPassword, password } = req.body || {};
  if (typeof currentPassword !== 'string' || currentPassword.length > 128 || typeof password !== 'string' || password.length < 12 || password.length > 128) throw companyError('Use a new password of 12–128 characters');
  const owner = (await postgresPool().query('SELECT password_hash FROM portal_owners WHERE id=$1', [req.owner.id])).rows[0];
  if (!await verifyPassword(currentPassword, owner.password_hash)) throw companyError('Current password is incorrect', 401);
  await postgresPool().query('UPDATE portal_owners SET password_hash=$2,auth_version=auth_version+1 WHERE id=$1', [req.owner.id, await bcrypt.hash(password, 12)]);
  res.clearCookie(cookieName, cookieOptions());
  res.json({ saved: true });
}));

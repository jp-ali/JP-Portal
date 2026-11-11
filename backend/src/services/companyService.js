import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { postgresPool } from '../config/postgres.js';
import { DEFAULT_COMPANY, DEFAULT_FEATURES, FEATURE_LABELS } from '../../../shared/company.js';
import { companyContext } from './companyContext.js';

export const companyError = (message, status = 400) => Object.assign(new Error(message), { status });
const slugPattern = /^[a-z][a-z0-9-]{1,47}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function publicCompany(row) {
  const defaults = row.id === 'javed' ? DEFAULT_COMPANY : { ...DEFAULT_COMPANY, books: [], supportEmail: '', supportPhone: '', website: '', logo: '', banner: '' };
  return { ...defaults, ...row.settings, id: row.id, slug: row.slug, name: row.name, active: row.active,
    adminEmail: row.admin_email, adminName: row.admin_name, features: { ...DEFAULT_FEATURES, ...row.settings?.features } };
}
export async function companyById(id, db = postgresPool()) {
  return (await db.query('SELECT * FROM portal_companies WHERE id=$1', [id])).rows[0] || null;
}
export async function resolveCompany(request, response, next) {
  try {
    if (request.path === '/api/health' || request.path.startsWith('/api/owner/')) return next();
    const hostname = request.hostname.toLowerCase();
    const explicit = request.get('x-company-slug') || request.query.company || '';
    const base = String(process.env.COMPANY_BASE_DOMAIN || '').toLowerCase();
    const hostSlug = base && hostname.endsWith(`.${base}`) ? hostname.slice(0, -base.length - 1) : '';
    let result;
    if (explicit || hostSlug) {
      const slug = explicit || hostSlug;
      if (!slugPattern.test(slug)) throw companyError('Invalid company address');
      // A dedicated company hostname cannot be overridden by a request header.
      const domain = (await postgresPool().query('SELECT company_id FROM portal_company_domains WHERE hostname=$1', [hostname])).rows[0];
      result = (await postgresPool().query('SELECT * FROM portal_companies WHERE slug=$1', [slug])).rows[0];
      if ((hostSlug && explicit && explicit !== hostSlug) || (domain && result && domain.company_id !== result.id && hostname !== 'visit.javedpublishers.com')) throw companyError('Company address mismatch', 403);
    } else {
      result = (await postgresPool().query('SELECT c.* FROM portal_companies c JOIN portal_company_domains d ON d.company_id=c.id WHERE d.hostname=$1', [hostname])).rows[0];
      if (!result && (hostname === 'localhost' || hostname === '127.0.0.1' || isIP(hostname) || hostname === base || hostname === 'visit.javedpublishers.com')) result = await companyById('javed');
    }
    if (!result) throw companyError('Company not found. Check your portal address.', 404);
    if (!result.active) throw companyError('This company portal is currently inactive. Contact your administrator.', 403);
    request.company = publicCompany(result);
    request.companyAuthVersion = result.auth_version;
    request.companyAdmin = { email: result.admin_email, name: result.admin_name, hash: result.admin_password_hash };
    return companyContext.run({ company: request.company, companyAuthVersion: result.auth_version, admin: request.companyAdmin }, next);
  } catch (error) { next(error); }
}
function image(value, label) {
  if (!value) return '';
  if (typeof value !== 'string' || value.length > (label === 'Banner' ? 1500000 : 300000) || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw companyError(`${label} must be a PNG, JPEG or WebP image within the upload limit`);
  return value;
}
export function companyInput(input, previous) {
  const name = String(input.name ?? previous?.name ?? '').trim();
  const slug = previous?.slug || String(input.slug || '').trim().toLowerCase();
  if (!name || name.length > 100 || !slugPattern.test(slug) || ['owner','manage','admin','api','www'].includes(slug)) throw companyError('Enter a company name and a valid unique slug (2–48 lowercase letters, numbers or hyphens)');
  const old = previous?.settings || {};
  const primaryColor = input.primaryColor ?? old.primaryColor ?? DEFAULT_COMPANY.primaryColor;
  if (!/^#[0-9a-f]{6}$/i.test(primaryColor)) throw companyError('Choose a valid brand color');
  const books = input.books ?? old.books ?? (previous?.id === 'javed' ? DEFAULT_COMPANY.books : []);
  if (!Array.isArray(books) || books.length > 150 || books.some(book => typeof book !== 'string' || !book.trim() || book.length > 100)) throw companyError('Use up to 150 book / series names, each under 100 characters');
  const features = { ...DEFAULT_FEATURES, ...old.features };
  if (input.features !== undefined) {
    if (!input.features || typeof input.features !== 'object' || Array.isArray(input.features)) throw companyError('Invalid feature settings');
    for (const [key, value] of Object.entries(input.features)) {
      if (!Object.hasOwn(FEATURE_LABELS, key) || typeof value !== 'boolean') throw companyError('Invalid feature settings');
      features[key] = value;
    }
  }
  const settings = { primaryColor, features, books: [...new Set(books.map(book => book.trim()))] };
  for (const key of ['supportEmail', 'supportPhone', 'website']) {
    settings[key] = String(input[key] ?? old[key] ?? (previous?.id === 'javed' ? DEFAULT_COMPANY[key] : '')).trim();
    if (settings[key].length > 200) throw companyError('Contact details are too long');
  }
  settings.logo = image(input.logo ?? old.logo, 'Logo');
  settings.banner = image(input.banner ?? old.banner, 'Banner');
  const adminEmail = String(input.adminEmail ?? previous?.admin_email ?? '').trim().toLowerCase();
  const adminName = String(input.adminName ?? previous?.admin_name ?? 'Administrator').trim();
  if ((!previous || adminEmail) && (!emailPattern.test(adminEmail) || adminEmail.length > 200)) throw companyError('Enter a valid company admin email');
  if (!adminName || adminName.length > 100) throw companyError('Enter an admin name under 100 characters');
  const password = String(input.adminPassword || '');
  if ((!previous || password) && (password.length < 12 || password.length > 128)) throw companyError('Company admin password must be 12–128 characters');
  const domains = input.domains ?? old.domains ?? [];
  if (!Array.isArray(domains) || domains.length > 5 || domains.some(domain => typeof domain !== 'string' || domain.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))) throw companyError('Enter valid hostnames without https, ports or paths');
  settings.domains = [...new Set(domains)];
  if (input.active !== undefined && typeof input.active !== 'boolean') throw companyError('Company status must be on or off');
  return { name, slug, settings, adminEmail, adminName, password, active: input.active === undefined ? previous?.active ?? true : input.active === true };
}
export async function saveCompany(input, id, ownerId) {
  const db = postgresPool();
  const previous = id ? await companyById(id) : null;
  if (id && !previous) throw companyError('Company not found', 404);
  const clean = companyInput(input, previous);
  const companyId = previous?.id || randomUUID();
  const hash = clean.password ? await bcrypt.hash(clean.password, 12) : previous?.admin_password_hash || null;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    if (previous) {
      await client.query(`UPDATE portal_companies SET name=$2, active=$3, settings=$4, admin_email=$5, admin_name=$6, admin_password_hash=$7,
        auth_version=auth_version+$8, updated_at=now() WHERE id=$1`, [companyId, clean.name, clean.active, clean.settings, clean.adminEmail, clean.adminName, hash,
        clean.password || clean.adminEmail !== previous.admin_email || clean.active !== previous.active ? 1 : 0]);
    } else {
      await client.query('INSERT INTO portal_companies(id,slug,name,active,settings,admin_email,admin_name,admin_password_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [companyId, clean.slug, clean.name, clean.active, clean.settings, clean.adminEmail, clean.adminName, hash]);
    }
    await client.query('DELETE FROM portal_company_domains WHERE company_id=$1 AND hostname<>$2', [companyId, companyId === 'javed' ? 'visit.javedpublishers.com' : '']);
    for (const domain of clean.settings.domains.filter(domain => companyId !== 'javed' || domain !== 'visit.javedpublishers.com')) await client.query('INSERT INTO portal_company_domains(hostname,company_id) VALUES($1,$2)', [domain, companyId]);
    await client.query('INSERT INTO portal_owner_audit(owner_id,action,company_id) VALUES($1,$2,$3)', [ownerId, previous ? 'company.updated' : 'company.created', companyId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') throw companyError('This company slug or domain is already registered', 409); throw error; }
  finally { client.release(); }
  return publicCompany(await companyById(companyId));
}

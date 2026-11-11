import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { saveCompany } from '../services/companyService.js';
export const companyRoutes = Router();
companyRoutes.get('/', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ company: req.company }); });
companyRoutes.get('/manifest', (req, res) => {
  const company = req.company;
  const query = `?company=${encodeURIComponent(company.slug)}`;
  res.set('Cache-Control', 'no-store').type('application/manifest+json').send(JSON.stringify({
    id: `/company/${company.slug}/`, name: `${company.name} Portal`, short_name: company.name.slice(0, 20),
    start_url: `/company/${company.slug}/`, scope: '/', display: 'standalone', background_color: '#faf7f8', theme_color: company.primaryColor,
    icons: company.logo ? [{ src: company.logo, sizes: 'any', purpose: 'any' }] : [{ src: `/api/company/icon${query}`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  }));
});
companyRoutes.get('/icon', (req, res) => {
  const initials = req.company.name.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).slice(0, 2).map(word => word[0] || '').join('').toUpperCase();
  res.type('image/svg+xml').set('Cache-Control', 'no-store').send(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="${req.company.primaryColor}"/><text x="256" y="300" text-anchor="middle" font-size="170" font-weight="700" font-family="Arial" fill="white">${initials}</text></svg>`);
});
companyRoutes.put('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['name', 'primaryColor', 'logo', 'banner', 'books', 'supportEmail', 'supportPhone', 'website'];
    if (Object.keys(req.body || {}).some(key => !allowed.includes(key))) return res.status(403).json({ error: 'Only the platform owner can change feature access, admin accounts or domains' });
    res.json({ company: await saveCompany(req.body, req.company.id, `company-admin:${req.company.id}`) });
  } catch (error) { next(error); }
});

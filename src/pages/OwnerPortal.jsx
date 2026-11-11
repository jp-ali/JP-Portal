import React, { useEffect, useState } from 'react';
import { request } from '../services/authApi.js';
import { FEATURE_LABELS, DEFAULT_FEATURES } from '../../shared/company.js';
import '../styles/owner.css';

const emptyCompany = () => ({ name: '', slug: '', primaryColor: '#800e2d', active: true, logo: '', banner: '', supportEmail: '', supportPhone: '', website: '', books: [], domains: [], features: { ...DEFAULT_FEATURES }, adminName: '', adminEmail: '', adminPassword: '' });
function Switch({ value, onChange, label }) {
  return <button className={`wl-toggle ${value ? 'is-on' : ''}`} type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)}><span /></button>;
}
function Upload({ label, value, onChange, large }) {
  const [error, setError] = useState('');
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { setError('Choose a PNG, JPEG or WebP image under 10 MB.'); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url;
      await img.decode();
      const scale = Math.min(1, (large ? 1600 : 400) / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/webp', .8);
      if (data.length > (large ? 1500000 : 300000)) throw new Error('Image is too detailed. Choose a smaller image.');
      onChange(data); setError('');
    } catch (failure) { setError(failure.message || 'Image could not be opened.'); }
    finally { URL.revokeObjectURL(url); }
  };
  return <div className="wl-upload"><label>{label}</label><div>{value ? <img src={value} alt={`${label} preview`} /> : <span className="wl-upload-empty">{large ? '▧' : '◈'}</span>}<label className="wl-secondary wl-upload-button">Upload image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label>{value && <button className="wl-text-button" type="button" onClick={() => onChange('')}>Remove</button>}</div><small>{large ? 'Banner for the login screen and dashboard' : 'PNG / JPEG / WebP. Automatically resized.'}</small>{error && <p role="alert" className="wl-error">{error}</p>}</div>;
}
export default function OwnerPortal() {
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [baseDomain, setBaseDomain] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyCompany);
  const [tab, setTab] = useState('identity');
  const [page, setPage] = useState('companies');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState([]);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '' });
  const load = async () => {
    const result = await request('/owner/companies');
    setCompanies(result.companies); setBaseDomain(result.baseDomain);
  };
  useEffect(() => {
    document.title = 'Platform Owner | Company Management';
    request('/owner/me').then(async ({ owner }) => { setOwner(owner); await load(); }).catch(failure => {
      if (!failure.message.includes('login required')) setError(failure.message);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const escape = event => { if (event.key === 'Escape') { setSelected(null); setNotice(''); setError(''); } };
    window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape);
  }, []);
  const signIn = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await request('/owner/login', { method: 'POST', body: JSON.stringify(login) }); setOwner(result.owner); setLogin({ email: '', password: '' }); await load(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const signOut = async () => {
    try { await request('/owner/logout', { method: 'POST' }); setOwner(null); setSelected(null); setCompanies([]); }
    catch (failure) { setError(failure.message); }
  };
  const edit = company => {
    setSelected(company ? company.id : 'new'); setForm(company ? { ...emptyCompany(), ...company, adminPassword: '' } : emptyCompany());
    setTab('identity'); setError(''); setNotice('');
  };
  const field = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const save = async event => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setNotice('');
    try {
      const result = await request(selected === 'new' ? '/owner/companies' : `/owner/companies/${selected}`, { method: selected === 'new' ? 'POST' : 'PATCH', body: JSON.stringify({ ...form, books: form.books.map(book => book.trim()).filter(Boolean) }) });
      setSelected(result.company.id); setForm({ ...emptyCompany(), ...result.company, adminPassword: '' }); await load(); setNotice('Company settings saved. Branding and feature changes apply when the portal is refreshed.');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  };
  const linkFor = company => `/company/${company.slug}/`;
  const openAudit = async () => {
    setPage('audit'); setSelected(null); setError('');
    try { setAudit((await request('/owner/audit')).events); } catch (failure) { setError(failure.message); }
  };
  if (loading) return <div className="wl-loading">Loading your management portal…</div>;
  if (!owner) return <div className="wl-login"><div className="wl-login-intro"><span className="wl-wordmark">FIELDWORK <i>HQ</i></span><span className="wl-eyebrow">PLATFORM OWNER</span><h1>One place.<br />Every company.</h1><p>Manage company portals, branding and access from your own workspace.</p><div className="wl-login-points"><span>◈ &nbsp; Company branding</span><span>☷ &nbsp; Feature controls</span><span>▣ &nbsp; Separate company records</span></div></div><form className="wl-login-form" onSubmit={signIn}><span className="wl-eyebrow">OWNER ACCESS</span><h2>Welcome back</h2><p>Sign in with your platform owner account.</p><label>Email address<input type="email" autoComplete="username" required value={login.email} onChange={event => setLogin({ ...login, email: event.target.value })} /></label><label>Password<input type="password" autoComplete="current-password" required value={login.password} onChange={event => setLogin({ ...login, password: event.target.value })} /></label>{error && <p className="wl-error" role="alert">{error}</p>}<button className="wl-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to management →'}</button><small>This login is separate from company admin accounts.</small><a href="/">Return to company portal</a></form></div>;
  return <div className="wl-app"><aside className="wl-sidebar"><div className="wl-wordmark">FIELDWORK <i>HQ</i></div><div className="wl-owner-tag">OWNER WORKSPACE</div><nav><button className={page === 'companies' ? 'active' : ''} onClick={() => { setPage('companies'); setSelected(null); setError(''); }}>▦ <span>Companies</span><b>{companies.length}</b></button><button className={page === 'audit' ? 'active' : ''} onClick={openAudit}>◷ <span>Activity log</span></button><button className={page === 'settings' ? 'active' : ''} onClick={() => { setPage('settings'); setSelected(null); setError(''); }}>⚙ <span>Account settings</span></button></nav><div className="wl-sidebar-note"><span>YOUR PLATFORM</span><p>Each company gets its own branding, team and records.</p></div><div className="wl-owner-profile"><span>{owner.name.charAt(0)}</span><div><strong>{owner.name}</strong><small>Platform Owner</small></div></div><button className="wl-logout" onClick={signOut}>⇥ &nbsp; Sign out</button></aside><main className="wl-main"><header><div><span className="wl-eyebrow">WORKSPACE / {page === 'companies' ? 'COMPANIES' : page.toUpperCase()}</span><h1>{selected ? selected === 'new' ? 'Add a company' : form.name : page === 'companies' ? 'Company overview' : page === 'audit' ? 'Activity log' : 'Account settings'}</h1><p>{selected ? 'Set the identity, access and details of this company.' : 'Your portals, organized and under your control.'}</p></div><div className="wl-header-actions">{selected ? <button className="wl-secondary" onClick={() => setSelected(null)}>← All companies</button> : page === 'companies' && <><button className="wl-secondary" onClick={() => load().catch(failure => setError(failure.message))}>↻ Refresh</button><button className="wl-primary" onClick={() => edit(null)}>＋ Add company</button></>}</div></header>
    {error && <div className="wl-error" role="alert">{error}</div>}{notice && <div className="wl-success" role="status">{notice}</div>}
    {page === 'companies' && !selected && <><section className="wl-stats"><div><span className="wl-stat-icon">▦</span><small>Total companies</small><strong>{companies.length}</strong></div><div><span className="wl-stat-icon green">●</span><small>Active portals</small><strong>{companies.filter(company => company.active).length}</strong></div><div><span className="wl-stat-icon purple">◈</span><small>Stored records</small><strong>{companies.reduce((sum, company) => sum + company.records, 0).toLocaleString()}</strong></div></section><div className="wl-list-heading"><div><h2>Your companies</h2><p>Choose a company to manage its portal.</p></div><input aria-label="Search companies" placeholder="Search companies…" value={search} onChange={event => setSearch(event.target.value)} /></div><section className="wl-company-grid">{companies.filter(company => company.name.toLowerCase().includes(search.toLowerCase())).map(company => <article className="wl-company-card" key={company.id}><div className="wl-company-card-top"><div className="wl-company-avatar" style={{ color: company.primaryColor, background: `${company.primaryColor}12` }}>{company.logo ? <img src={company.logo} alt="" /> : company.name.split(' ').slice(0, 2).map(word => word[0]).join('')}</div><span className={`wl-status ${company.active ? 'green' : ''}`}>{company.active ? '● Active' : '○ Inactive'}</span></div><h3>{company.name}</h3><p className="wl-company-slug">{company.slug} · School Visit Portal</p><div className="wl-card-meta"><span><b>{company.records.toLocaleString()}</b> records</span><span><b>{Object.values(company.features).filter(Boolean).length}</b> features enabled</span></div><div className="wl-card-books">{company.books.slice(0, 4).map(book => <span key={book}>{book}</span>)}{company.books.length > 4 && <span>+{company.books.length - 4}</span>}</div><footer><button className="wl-primary" onClick={() => edit(company)}>Manage company</button><a className="wl-secondary" href={linkFor(company)} target="_blank" rel="noopener noreferrer">Open portal ↗</a></footer></article>)}<button className="wl-add-card" onClick={() => edit(null)}><span>＋</span><strong>Add your next company</strong><small>Branding, admin login and feature access</small></button></section><div className="wl-callout"><b>Start with Javed Publishers</b><p>Your existing company records remain in the Javed workspace. New companies start with an empty workspace.</p></div></>}
    {page === 'companies' && selected && <form onSubmit={save}><div className="wl-editor-layout"><section className="wl-editor"><nav className="wl-tabs">{[['identity','Identity'],['features','Features'],['books','Books & series'],['access','Admin & address']].map(([key, label]) => <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><div className="wl-editor-body">
      {tab === 'identity' && <><h2>Company identity</h2><p>Shown on login, dashboards and report headers.</p><div className="wl-form-grid"><label>Company name<input required maxLength={100} value={form.name} onChange={event => field('name', event.target.value)} /></label><label>Primary color<div className="wl-color"><input type="color" value={form.primaryColor} onChange={event => field('primaryColor', event.target.value)} /><input aria-label="Primary color hex" pattern="#[0-9a-fA-F]{6}" value={form.primaryColor} onChange={event => field('primaryColor', event.target.value)} /></div></label></div><div className="wl-form-grid"><Upload label="Company logo" value={form.logo} onChange={value => field('logo', value)} /><Upload label="Company banner" large value={form.banner} onChange={value => field('banner', value)} /></div><div className="wl-form-grid"><label>Support email<input type="email" value={form.supportEmail} onChange={event => field('supportEmail', event.target.value)} /></label><label>Support phone<input value={form.supportPhone} maxLength={200} onChange={event => field('supportPhone', event.target.value)} /></label><label>Company website<input value={form.website} maxLength={200} onChange={event => field('website', event.target.value)} /></label></div><div className="wl-feature-row"><div><strong>Portal active</strong><small>Inactive companies cannot sign in or access the API.</small></div><Switch label="Company active" value={form.active} onChange={value => field('active', value)} /></div></>}
      {tab === 'features' && <><h2>Feature access</h2><p>Control which features this company can use. Disabled data features are also blocked by the API.</p><div className="wl-features">{Object.entries(FEATURE_LABELS).map(([key, label]) => <div key={key} className="wl-feature-row"><div><strong>{label}</strong><small>{form.features[key] ? 'Enabled for this company' : 'Hidden and disabled'}</small></div><Switch label={label} value={form.features[key]} onChange={value => field('features', { ...form.features, [key]: value })} /></div>)}</div><div className="wl-callout"><p>Turning off a feature preserves its existing records. Previously downloaded files and offline copies cannot be remotely recalled.</p></div></>}
      {tab === 'books' && <><h2>Books & series</h2><p>Each company has its own book and imprint names. Use one name per line.</p><label>Book / series names<textarea rows={12} value={form.books.join('\n')} onChange={event => field('books', event.target.value.split('\n'))} placeholder="Series name\nAnother series" /></label><small>Removing a name from this list does not erase historical visit or sample records.</small><div className="wl-callout"><b>Banner images are separate</b><p>Text printed inside an uploaded image is part of that image. Upload a new banner to change those book names.</p></div></>}
      {tab === 'access' && <><h2>Admin account & portal address</h2><p>Company admins manage their own team. They cannot access this owner workspace.</p><div className="wl-form-grid"><label>Company slug<input required disabled={selected !== 'new'} pattern="[a-z][a-z0-9-]{1,47}" value={form.slug} onChange={event => field('slug', event.target.value.toLowerCase())} placeholder="company-name" /><small>The slug stays fixed after creation.</small></label><label>Admin name<input value={form.adminName} onChange={event => field('adminName', event.target.value)} /></label><label>Admin email<input type="email" value={form.adminEmail} onChange={event => field('adminEmail', event.target.value)} placeholder={form.id === 'javed' ? 'Existing server admin remains until changed' : 'admin@company.com'} /></label><label>{selected === 'new' ? 'Admin password' : 'New admin password (optional)'}<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={form.adminPassword} onChange={event => field('adminPassword', event.target.value)} /><small>12–128 characters. Password changes sign out existing company sessions.</small></label></div><div className="wl-address"><small>Portal link — works on the current host</small><code>{location.origin}/company/{form.slug || 'company-name'}/</code>{selected !== 'new' && <a href={linkFor(form)} target="_blank" rel="noopener noreferrer">Open company portal ↗</a>}</div><label>Custom domains (optional, one per line)<textarea rows={3} value={form.domains.join('\n')} onChange={event => field('domains', event.target.value.split('\n').map(value => value.trim().toLowerCase()).filter(Boolean))} placeholder="portal.company.com" /></label><div className="wl-callout"><b>DNS & HTTPS</b><p>{baseDomain ? `Company subdomain: ${form.slug}.${baseDomain}. ` : 'A shared base domain is not configured yet. '}Registering a custom domain here does not change its DNS. Point it to this server and configure HTTPS before sharing it.</p></div></>}
    </div><footer className="wl-editor-footer"><span>Changes are saved only when you click Save.</span><button className="wl-primary" disabled={busy}>{busy ? 'Saving…' : selected === 'new' ? 'Create company' : 'Save changes'}</button></footer></section><aside className="wl-preview"><span className="wl-eyebrow">BRAND PREVIEW</span><div className="wl-preview-card"><div className="wl-preview-brand" style={{ background: form.primaryColor }}>{form.logo ? <img src={form.logo} alt="Logo preview" /> : <span>{(form.name || 'Company').slice(0, 2).toUpperCase()}</span>}<h3>{form.name || 'Your company'}</h3><small>School Visit Portal</small></div><div className="wl-preview-input">Email or phone number</div><div className="wl-preview-input">Password</div><button type="button" style={{ background: form.primaryColor }}>Sign In</button></div><p>Preview only. Company users sign in at their own portal link.</p></aside></div></form>}
    {page === 'audit' && <section className="wl-panel"><h2>Recent owner activity</h2><div className="wl-table-scroll"><table><thead><tr><th>Action</th><th>Company</th><th>Owner</th><th>Time</th></tr></thead><tbody>{audit.map((event, index) => <tr key={index}><td>{event.action}</td><td>{event.company}</td><td>{event.owner}</td><td>{new Date(event.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })}</td></tr>)}</tbody></table>{!audit.length && <p>No owner changes yet.</p>}</div></section>}
    {page === 'settings' && <form className="wl-panel wl-password" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await request('/owner/password', { method: 'PUT', body: JSON.stringify(passwords) }); setOwner(null); setNotice('Password updated. Sign in again.'); } catch (failure) { setError(failure.message); } finally { setBusy(false); } }}><h2>Change owner password</h2><p>{owner.email}</p><label>Current password<input type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={event => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>New password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={passwords.password} onChange={event => setPasswords({ ...passwords, password: event.target.value })} /></label><button className="wl-primary" disabled={busy}>Update password</button></form>}
    <footer className="wl-page-footer"><span>Fieldwork HQ · Platform management</span><span>Company workspaces stay separate</span></footer></main></div>;
}

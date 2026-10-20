import React, { useState } from "react";

export default function PortalTopBar({ role, name, items, onNavigate, onMenu, onLogout }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const matches = query.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
    : [];
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
  const displayName = name || (role === "admin" ? "Admin" : "Marketer");
  return <header className="portal-topbar">
    <button type="button" className="portal-topbar-menu" onClick={onMenu} aria-label="Open menu">☰</button>
    <div className="portal-topbar-greeting"><strong>Welcome Back, <span>{displayName}</span> 👋</strong><small>{role === "admin" ? "Manage team activity, visits and reports, all in one place." : "Keep your visits, reports and daily activity in one place."}</small></div>
    <div className="portal-topbar-search"><span aria-hidden="true">⌕</span><input aria-label="Search portal sections" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { onNavigate(matches[0].key); setQuery(""); event.currentTarget.blur(); } }} placeholder="Search here..." />{focused && matches.length > 0 && <div className="portal-topbar-search-results">{matches.map((item) => <button type="button" key={item.key} onMouseDown={(event) => event.preventDefault()} onClick={() => { onNavigate(item.key); setQuery(""); setFocused(false); }}>{item.icon}<span>{item.label}</span></button>)}</div>}</div>
    <div className="portal-topbar-date"><span aria-hidden="true">▣</span><span>{date}</span></div>
    <div className="portal-topbar-user"><span className="portal-topbar-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span><span>{displayName}</span><button type="button" onClick={() => setProfileOpen((open) => !open)} title="Account menu" aria-label="Account menu" aria-expanded={profileOpen}>⌄</button>{profileOpen && <div className="portal-topbar-profile-menu"><strong>{displayName}</strong><small>{role === "admin" ? "Administrator" : "Marketer"}</small><button type="button" onClick={onLogout}>Logout</button></div>}</div>
  </header>;
}

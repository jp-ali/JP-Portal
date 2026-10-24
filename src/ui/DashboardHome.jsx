import React from "react";
import heroBooks from "../assets/dashboard-books.png";
import mobileHeroBooks from "../assets/dashboard-books-mobile.webp";
import { dashboardItemKeys, useDashboardVisibility } from "../services/dashboardVisibility.js";

function HideButton({ title, onClick }) {
  return <button type="button" className="portal-dashboard-hide" title={`Hide ${title}`} aria-label={`Hide ${title}`} onClick={(event) => { event.stopPropagation(); onClick(); }}><svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c5.2 0 9 4.1 10 7a13 13 0 0 1-3.1 4.7M6.2 6.2C4.2 7.6 2.8 9.8 2 12c1 2.9 4.8 7 10 7 1.7 0 3.2-.4 4.5-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>;
}

export default function DashboardHome({ role, accountId, stats, sections }) {
  const { hide, isHidden, hideControlsVisible } = useDashboardVisibility(role, accountId);
  const adminControls = role === "admin";
  const showHideButtons = adminControls && hideControlsVisible;
  const visible = (key) => !adminControls || !isHidden(key);
  return <main className="portal-dashboard">
    {visible(dashboardItemKeys.hero) && <section className="portal-dashboard-hero">
      <div className="portal-dashboard-hero-copy"><span className="portal-dashboard-hero-overline">JAVED PUBLISHERS</span><h1>{role === "admin" ? "Admin Dashboard" : "Marketer Dashboard"}</h1><p>{role === "admin" ? "Track visits, manage marketers, view reports and more. Everything you need, in one place." : "Plan your day, record visits and keep your reports in one place."}</p></div>
      <img src={heroBooks} alt="" className="portal-dashboard-hero-art" />
      <img src={mobileHeroBooks} alt="" className="portal-dashboard-hero-art-mobile" />
      {showHideButtons && <HideButton title="Dashboard banner" onClick={() => hide({ key: dashboardItemKeys.hero, title: "Dashboard banner", type: "Banner" })} />}
    </section>}
    <div className="portal-dashboard-stats">{stats.filter((stat) => visible(dashboardItemKeys.stat(stat.label))).map((stat) => {
      const Stat = stat.onClick ? "button" : "div";
      return <div className="portal-stat-wrap" key={stat.label}><Stat className={`portal-stat ${stat.onClick ? "portal-stat-link" : ""}`} {...(stat.onClick ? { type: "button", onClick: stat.onClick, "aria-label": `Open ${stat.label}` } : {})}><span className={`portal-stat-icon ${stat.tone || "rose"}`}>{stat.icon}</span><div><small>{stat.label}</small><strong>{stat.value}</strong></div><span className="portal-stat-spark" aria-hidden="true">▂▅▇</span></Stat>{showHideButtons && <HideButton title={stat.label} onClick={() => hide({ key: dashboardItemKeys.stat(stat.label), title: stat.label, type: "Box" })} />}</div>;
    })}</div>
    <div className="portal-dashboard-sections">{sections.filter((section) => visible(dashboardItemKeys.section(section.title))).map((section) => <section className="portal-dashboard-group" key={section.title}><div className="portal-dashboard-group-header"><h2><span aria-hidden="true">{section.icon}</span>{section.title}</h2><div className="portal-dashboard-group-actions"><small>{section.description}</small>{showHideButtons && <HideButton title={`${section.title} category`} onClick={() => hide({ key: dashboardItemKeys.section(section.title), title: section.title, type: "Category" })} />}</div></div><div className="portal-dashboard-links">{section.items.filter((item) => visible(dashboardItemKeys.card(section.title, item.title))).map((item) => <div className="portal-dashboard-link-wrap" key={item.title}><button type="button" className={`portal-dashboard-link ${item.muted ? "is-muted" : ""}`} onClick={item.onClick} aria-label={item.title}><span className={`portal-dashboard-link-icon ${item.tone || "rose"}`}>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small>{item.badge > 0 && <span className="portal-dashboard-link-badge" aria-label={`${item.badge} unread news`}>{item.badge} new</span>}<span className="portal-dashboard-link-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg></span></button>{showHideButtons && <HideButton title={item.title} onClick={() => hide({ key: dashboardItemKeys.card(section.title, item.title), title: item.title, type: "Box", parent: section.title })} />}</div>)}</div></section>)}</div>
    {visible(dashboardItemKeys.imprints) && <div className="portal-imprints"><span className="portal-imprints-title">OUR IMPRINTS</span><div><strong>maxford</strong><strong>vintage</strong><strong>canon</strong><strong>Marshall</strong><strong>stemford</strong></div>{showHideButtons && <HideButton title="Imprints" onClick={() => hide({ key: dashboardItemKeys.imprints, title: "Imprints", type: "Footer" })} />}</div>}
  </main>;
}

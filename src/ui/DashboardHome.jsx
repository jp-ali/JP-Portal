import React from "react";
import heroBooks from "../assets/dashboard-books.png";
import mobileHeroBooks from "../assets/dashboard-books-mobile.webp";
import { dashboardItemKeys, useDashboardVisibility } from "../services/dashboardVisibility.js";

function HideButton({ title, onClick }) {
  return <button type="button" className="portal-dashboard-hide" title={`Hide ${title}`} aria-label={`Hide ${title}`} onClick={onClick}>Hide</button>;
}

export default function DashboardHome({ role, accountId, stats, sections }) {
  const { hide, isHidden } = useDashboardVisibility(role, accountId);
  return <main className="portal-dashboard">
    {!isHidden(dashboardItemKeys.hero) && <section className="portal-dashboard-hero">
      <div className="portal-dashboard-hero-copy"><span className="portal-dashboard-hero-overline">JAVED PUBLISHERS</span><h1>{role === "admin" ? "Admin Dashboard" : "Marketer Dashboard"}</h1><p>{role === "admin" ? "Track visits, manage marketers, view reports and more. Everything you need, in one place." : "Plan your day, record visits and keep your reports in one place."}</p></div>
      <img src={heroBooks} alt="" className="portal-dashboard-hero-art" />
      <img src={mobileHeroBooks} alt="" className="portal-dashboard-hero-art-mobile" />
      <HideButton title="Dashboard banner" onClick={() => hide({ key: dashboardItemKeys.hero, title: "Dashboard banner", type: "Banner" })} />
    </section>}
    <div className="portal-dashboard-stats">{stats.filter((stat) => !isHidden(dashboardItemKeys.stat(stat.label))).map((stat) => {
      const Stat = stat.onClick ? "button" : "div";
      return <div className="portal-stat-wrap" key={stat.label}><Stat className={`portal-stat ${stat.onClick ? "portal-stat-link" : ""}`} {...(stat.onClick ? { type: "button", onClick: stat.onClick, "aria-label": `Open ${stat.label}` } : {})}><span className={`portal-stat-icon ${stat.tone || "rose"}`}>{stat.icon}</span><div><small>{stat.label}</small><strong>{stat.value}</strong></div><span className="portal-stat-spark" aria-hidden="true">▂▅▇</span></Stat><HideButton title={stat.label} onClick={() => hide({ key: dashboardItemKeys.stat(stat.label), title: stat.label, type: "Box" })} /></div>;
    })}</div>
    <div className="portal-dashboard-sections">{sections.filter((section) => !isHidden(dashboardItemKeys.section(section.title))).map((section) => <section className="portal-dashboard-group" key={section.title}><div className="portal-dashboard-group-header"><h2><span aria-hidden="true">{section.icon}</span>{section.title}</h2><div className="portal-dashboard-group-actions"><small>{section.description}</small><HideButton title={`${section.title} category`} onClick={() => hide({ key: dashboardItemKeys.section(section.title), title: section.title, type: "Category" })} /></div></div><div className="portal-dashboard-links">{section.items.filter((item) => !isHidden(dashboardItemKeys.card(section.title, item.title))).map((item) => <div className="portal-dashboard-link-wrap" key={item.title}><button type="button" className={`portal-dashboard-link ${item.muted ? "is-muted" : ""}`} onClick={item.onClick} aria-label={item.title}><span className={`portal-dashboard-link-icon ${item.tone || "rose"}`}>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small><span className="portal-dashboard-link-arrow" aria-hidden="true">›</span></button><HideButton title={item.title} onClick={() => hide({ key: dashboardItemKeys.card(section.title, item.title), title: item.title, type: "Box", parent: section.title })} /></div>)}</div></section>)}</div>
    {!isHidden(dashboardItemKeys.imprints) && <div className="portal-imprints"><span className="portal-imprints-title">OUR IMPRINTS</span><div><strong>maxford</strong><strong>vintage</strong><strong>canon</strong><strong>Marshall</strong><strong>stemford</strong></div><HideButton title="Imprints" onClick={() => hide({ key: dashboardItemKeys.imprints, title: "Imprints", type: "Footer" })} /></div>}
  </main>;
}

import React from "react";
import heroBooks from "../assets/dashboard-books.png";
import mobileHeroBooks from "../assets/dashboard-books-mobile.webp";

export default function DashboardHome({ role, stats, sections }) {
  return <main className="portal-dashboard">
    <section className="portal-dashboard-hero">
      <div className="portal-dashboard-hero-copy"><span className="portal-dashboard-hero-overline">JAVED PUBLISHERS</span><h1>{role === "admin" ? "Admin Dashboard" : "Marketer Dashboard"}</h1><p>{role === "admin" ? "Track visits, manage marketers, view reports and more. Everything you need, in one place." : "Plan your day, record visits and keep your reports in one place."}</p></div>
      <img src={heroBooks} alt="" className="portal-dashboard-hero-art" />
      <img src={mobileHeroBooks} alt="" className="portal-dashboard-hero-art-mobile" />
      <div className="portal-dashboard-hero-note" aria-hidden="true">Knowledge<br/>Today<br/>A Brighter<br/>Tomorrow</div>
    </section>
    <div className="portal-dashboard-stats">{stats.map((stat) => { const Stat = stat.onClick ? "button" : "div"; return <Stat className={`portal-stat ${stat.onClick ? "portal-stat-link" : ""}`} key={stat.label} {...(stat.onClick ? { type: "button", onClick: stat.onClick, "aria-label": `Open ${stat.label}` } : {})}><span className={`portal-stat-icon ${stat.tone || "rose"}`}>{stat.icon}</span><div><small>{stat.label}</small><strong>{stat.value}</strong></div><span className="portal-stat-spark" aria-hidden="true">▂▅▇</span></Stat>; })}</div>
    <div className="portal-dashboard-sections">{sections.map((section) => <section className="portal-dashboard-group" key={section.title}><div className="portal-dashboard-group-header"><h2><span aria-hidden="true">{section.icon}</span>{section.title}</h2><small>{section.description}</small></div><div className="portal-dashboard-links">{section.items.map((item) => <button type="button" className={`portal-dashboard-link ${item.muted ? "is-muted" : ""}`} key={item.title} onClick={item.onClick} aria-label={item.title}><span className={`portal-dashboard-link-icon ${item.tone || "rose"}`}>{item.icon}</span><strong>{item.title}</strong><small>{item.description}</small><span className="portal-dashboard-link-arrow" aria-hidden="true">›</span></button>)}</div></section>)}</div>
    <div className="portal-imprints"><span className="portal-imprints-title">OUR IMPRINTS</span><div><strong>maxford</strong><strong>vintage</strong><strong>canon</strong><strong>Marshall</strong><strong>stemford</strong></div></div>
  </main>;
}

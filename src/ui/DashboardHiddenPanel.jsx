import React from "react";
import { useDashboardVisibility } from "../services/dashboardVisibility.js";

export default function DashboardHiddenPanel({ role, accountId, onBack }) {
  const { hidden, restore } = useDashboardVisibility(role, accountId);
  return <main className="portal-hidden-page">
    <header className="portal-hidden-header"><div><h1>Hidden</h1><p>Dashboard se hide ki hui categories aur boxes yahan hain. Unhide karne par woh apni pehli jagah wapas aayenge.</p></div><button type="button" onClick={onBack}>← Dashboard</button></header>
    {hidden.length ? <div className="portal-hidden-list">{hidden.map((item) => <div className="portal-hidden-item" key={item.key}><div><small>{item.type}{item.parent ? ` · ${item.parent}` : ""}</small><strong>{item.title}</strong></div><button type="button" onClick={() => restore(item.key)}>Unhide</button></div>)}</div> : <div className="portal-hidden-empty">Abhi koi box ya category hidden nahi hai.</div>}
  </main>;
}

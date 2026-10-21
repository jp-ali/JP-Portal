import React from "react";
import { useDashboardVisibility } from "../services/dashboardVisibility.js";

export default function DashboardHiddenPanel({ role, accountId, onBack }) {
  const { hidden, restore } = useDashboardVisibility(role, accountId);
  return <main className="portal-hidden-page">
    <header className="portal-hidden-header"><div><h1>Hidden</h1><p>Hidden dashboard categories and boxes appear here. Unhide an item to return it to its original place.</p></div><button type="button" onClick={onBack}>← Dashboard</button></header>
    {hidden.length ? <div className="portal-hidden-list">{hidden.map((item) => <div className="portal-hidden-item" key={item.key}><div><small>{item.type}{item.parent ? ` · ${item.parent}` : ""}</small><strong>{item.title}</strong></div><button type="button" onClick={() => restore(item.key)}>Unhide</button></div>)}</div> : <div className="portal-hidden-empty">No boxes or categories are hidden.</div>}
  </main>;
}

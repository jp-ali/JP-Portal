import React from "react";
import { useDashboardVisibility } from "../services/dashboardVisibility.js";

export default function DashboardHiddenPanel({ role, accountId, onBack }) {
  const { hidden, restore, hideControlsVisible, setHideControlsVisible } = useDashboardVisibility(role, accountId);
  return <main className="portal-hidden-page">
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back" onClick={onBack}>← Back</button></div>
    <header className="portal-hidden-header"><div><h1>Hidden</h1><p>Hidden dashboard categories and boxes appear here. Unhide an item to return it to its original place.</p></div></header>
    {role === "admin" && <div className="portal-hide-controls-setting"><div><strong>Show hide buttons</strong><span>Turn on to show the eye button on dashboard boxes and headers.</span></div><button type="button" role="switch" aria-checked={hideControlsVisible} aria-label="Show hide buttons" className={`portal-hide-controls-switch ${hideControlsVisible ? "is-on" : ""}`} onClick={() => setHideControlsVisible(!hideControlsVisible)}><span /></button></div>}
    {hidden.length ? <div className="portal-hidden-list">{hidden.map((item) => <div className="portal-hidden-item" key={item.key}><div><small>{item.type}{item.parent ? ` · ${item.parent}` : ""}</small><strong>{item.title}</strong></div><button type="button" onClick={() => restore(item.key)}>Unhide</button></div>)}</div> : <div className="portal-hidden-empty">No boxes or categories are hidden.</div>}
  </main>;
}

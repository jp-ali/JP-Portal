import React, { useEffect, useMemo, useState } from "react";
import { request } from "../../services/authApi.js";
import { downloadCardPdf, downloadCardSvg } from "../../services/cardDesigner.js";
import "../../styles/cardDesigner.css";

export default function AdminSavedCardsPanel({ onEdit, onNew }) {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [menu, setMenu] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const reload = async () => {
    try { const result = await request("/cards"); setCards(result.cards || []); setError(""); }
    catch (problem) { setError(problem.message); }
  };
  useEffect(() => { reload(); }, []);
  const visible = useMemo(() => cards.filter((card) => Boolean(card.deletedAt) === showOld).filter((card) => {
    const term = search.trim().toLowerCase();
    return !term || [card.title, ...Object.values(card.values || {})].some((value) => String(value).toLowerCase().includes(term));
  }), [cards, search, showOld]);
  const selected = cards.find((card) => card.id === selectedId && Boolean(card.deletedAt) === showOld);
  const switchOld = () => { setShowOld((current) => !current); setSelectedId(""); setMenu(""); };
  const act = async (kind) => {
    if (kind === "old") return switchOld();
    if (!selected) return setError("Select a card first.");
    if (kind === "edit") return onEdit(selected.id);
    if (["remove", "permanent"].includes(kind) && !window.confirm(kind === "permanent" ? "Permanently delete this card?" : "Move this card to Old Cards?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (kind === "pdf" || kind === "svg") {
        const { card } = await request(`/cards/${encodeURIComponent(selected.id)}`);
        const template = { image: card.image, imageWidth: card.imageWidth, imageHeight: card.imageHeight, widthMm: card.widthMm, fields: card.fields };
        if (kind === "pdf") await downloadCardPdf(template, card.values); else downloadCardSvg(template, card.values);
      } else {
        const path = `/cards/${encodeURIComponent(selected.id)}${kind === "restore" ? "/restore" : kind === "permanent" ? "/permanent" : ""}`;
        await request(path, { method: kind === "restore" ? "POST" : "DELETE" });
        setSelectedId(""); await reload();
        setMessage(kind === "restore" ? "Card restored." : kind === "permanent" ? "Card permanently deleted." : "Card moved to Old Cards.");
      }
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); setMenu(""); }
  };
  return <section className="saved-cards">
    <header className="saved-cards-head"><div><h2>Saved Cards</h2><p>Find, edit and download your card designs.</p></div><button type="button" className="primary" onClick={onNew}>+ Create card</button></header>
    <div className="saved-cards-toolbar"><label className="saved-cards-search"><span>⌕</span><input type="search" placeholder="Search name, depot, phone or email" value={search} onChange={(event) => setSearch(event.target.value)} /></label><div className="saved-cards-menu-wrap"><button type="button" className="primary" onClick={() => setMenu((current) => current === "action" ? "" : "action")}>Action ▾</button>{menu === "action" && <div className="saved-cards-menu">{showOld ? <><button type="button" onClick={() => act("restore")}>Restore selected</button><button type="button" onClick={() => act("permanent")}>Delete permanently</button><button type="button" onClick={() => act("old")}>← Active cards</button></> : <><button type="button" onClick={() => act("edit")}>Edit selected</button><button type="button" onClick={() => act("remove")}>Remove selected</button><button type="button" onClick={() => act("old")}>Old cards</button><button type="button" onClick={() => setMenu("download")}>Download ▸</button></>}</div>}{menu === "download" && <div className="saved-cards-menu"><button type="button" onClick={() => setMenu("action")}>← Back</button><button type="button" onClick={() => act("pdf")}>PDF</button><button type="button" onClick={() => act("svg")}>Corel editable SVG</button></div>}</div></div>
    <div className="saved-cards-section-title"><h3>{showOld ? "Old Cards" : "Your Cards"}</h3><span>{visible.length} card{visible.length === 1 ? "" : "s"}</span></div>
    {error && <p className="card-designer-error" role="alert">{error}</p>}{message && <p className="card-designer-success" role="status">{message}</p>}{busy && <p>Working…</p>}
    {visible.length ? <div className="saved-cards-grid">{visible.map((card) => <button type="button" key={card.id} className={`saved-card-tile ${selectedId === card.id ? "selected" : ""}`} onClick={() => { setSelectedId(card.id); setMenu(""); }}><span className="saved-card-check">{selectedId === card.id ? "✓" : ""}</span><span className="saved-card-art"><strong>{card.values?.depotName || card.title}</strong><span>{card.values?.name || card.values?.designation || "Card design"}</span><small>{card.values?.phone || ""}</small><i /></span><span className="saved-card-meta"><strong>{card.title}</strong><small>{card.values?.email || card.values?.website || ""}</small><small>Updated {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : "today"}</small></span></button>)}</div> : <div className="saved-cards-empty">{search ? "No cards match your search." : showOld ? "No removed cards." : "No saved cards yet. Create your first card."}</div>}
  </section>;
}

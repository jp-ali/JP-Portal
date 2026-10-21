import React, { useEffect, useMemo, useState } from "react";
import { request } from "../../services/authApi.js";
import { downloadCardSheetCdr, downloadCardSheetPdf, downloadCardSheetSvg, downloadCardSheetShareZip } from "../../services/cardDesigner.js";
import "../../styles/cardDesigner.css";

export default function AdminSavedCardsPanel({ onEdit, onNew }) {
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
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
  const selected = cards.filter((card) => selectedIds.includes(card.id) && Boolean(card.deletedAt) === showOld);
  const toggleSelected = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const selectVisible = () => setSelectedIds((current) => visible.every((card) => current.includes(card.id)) ? current.filter((id) => !visible.some((card) => card.id === id)) : [...new Set([...current, ...visible.map((card) => card.id)])]);
  const switchOld = () => { setShowOld((current) => !current); setSelectedIds([]); setMenu(""); };
  const act = async (kind) => {
    if (kind === "old") return switchOld();
    if (!selected.length) return setError("Select at least one card first.");
    if (kind === "edit") return selected.length === 1 ? onEdit(selected[0].id) : setError("Select one card to edit.");
    if (["remove", "permanent"].includes(kind) && !window.confirm(kind === "permanent" ? `Permanently delete ${selected.length} card(s)?` : `Move ${selected.length} card(s) to Old Cards?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (["pdf", "svg", "zip", "cdr"].includes(kind)) {
        const fullCards = kind === "cdr" ? null : await Promise.all(selected.map(async ({ id }) => (await request(`/cards/${encodeURIComponent(id)}`)).card));
        const fileName = kind === "cdr" ? await downloadCardSheetCdr(selected.map(({ id }) => id), selected[0]?.values) : kind === "pdf" ? await downloadCardSheetPdf(fullCards) : kind === "zip" ? downloadCardSheetShareZip(fullCards) : downloadCardSheetSvg(fullCards);
        setMessage(`${selected.length} card(s) downloaded in ${fileName}. ${kind === "zip" ? "Send the ZIP as a WhatsApp Document. Extract its SVG and open it in CorelDRAW." : "Check your browser's Downloads folder."}`);
      } else {
        for (const card of selected) {
          const path = `/cards/${encodeURIComponent(card.id)}${kind === "restore" ? "/restore" : kind === "permanent" ? "/permanent" : ""}`;
          await request(path, { method: kind === "restore" ? "POST" : "DELETE" });
        }
        setSelectedIds([]); await reload();
        setMessage(kind === "restore" ? `${selected.length} card(s) restored.` : kind === "permanent" ? `${selected.length} card(s) permanently deleted.` : `${selected.length} card(s) moved to Old Cards.`);
      }
    } catch (problem) { setError(problem.message); await reload(); }
    finally { setBusy(false); setMenu(""); }
  };
  return <section className="saved-cards">
    <header className="saved-cards-head"><div><h2>Saved Cards</h2><p>Select one or more cards to download, remove or restore.</p></div><button type="button" className="primary" onClick={onNew}>+ Create card</button></header>
    <div className="saved-cards-toolbar">
      <label className="saved-cards-search"><span>⌕</span><input type="search" placeholder="Search name, depot, phone or email" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedIds([]); }} /></label>
      <button type="button" onClick={selectVisible} disabled={!visible.length}>{visible.length && visible.every((card) => selectedIds.includes(card.id)) ? "Clear selection" : "Select all"}</button>
      <div className="saved-cards-menu-wrap"><button type="button" className="primary" onClick={() => setMenu((current) => current === "action" ? "" : "action")}>Action ▾</button>
        {menu === "action" && <div className="saved-cards-menu">{showOld ? <><button type="button" onClick={() => act("restore")}>Restore selected</button><button type="button" onClick={() => act("permanent")}>Delete permanently</button><button type="button" onClick={() => act("old")}>← Active cards</button></> : <><button type="button" onClick={() => act("edit")}>Edit one card</button><button type="button" onClick={() => act("remove")}>Remove selected</button><button type="button" onClick={() => act("old")}>Old cards</button><button type="button" onClick={() => setMenu("download")}>Download sheet ▸</button></>}</div>}
        {menu === "download" && <div className="saved-cards-menu"><button type="button" onClick={() => setMenu("action")}>← Back</button><button type="button" onClick={() => act("pdf")}>PDF print sheet</button><button type="button" onClick={() => act("svg")}>Corel editable sheet (.svg)</button><button type="button" onClick={() => act("cdr")}>Corel CDR sheet</button><button type="button" onClick={() => act("zip")}>WhatsApp Corel ZIP</button></div>}
      </div>
    </div>
    <div className="saved-cards-section-title"><h3>{showOld ? "Old Cards" : "Your Cards"}</h3><span>{selected.length} selected · {visible.length} shown</span></div><p className="card-designer-tip">Send the ZIP as a WhatsApp Document. Extract the SVG inside to edit it in CorelDRAW.</p>
    {error && <p className="card-designer-error" role="alert">{error}</p>}{message && <p className="card-designer-success" role="status">{message}</p>}{busy && <p>Working…</p>}
    {visible.length ? <div className="saved-cards-grid">{visible.map((card) => <label key={card.id} className={`saved-card-tile ${selectedIds.includes(card.id) ? "selected" : ""}`}><input className="saved-card-check" type="checkbox" checked={selectedIds.includes(card.id)} onChange={() => { toggleSelected(card.id); setMenu(""); }} aria-label={`Select ${card.title}`} /><span className="saved-card-art"><strong>{card.values?.depotName || card.title}</strong><span>{card.values?.name || card.values?.designation || "Card design"}</span><small>{card.values?.phone || ""}</small><i /></span><span className="saved-card-meta"><strong>{card.title}</strong><small>{card.values?.email || card.values?.website || ""}</small><small>Updated {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : "today"}</small></span></label>)}</div> : <div className="saved-cards-empty">{search ? "No cards match your search." : showOld ? "No removed cards." : "No saved cards yet. Create your first card."}</div>}
  </section>;
}

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { request } from "../../services/authApi.js";
import { cardRenderEntries, downloadCardPdf } from "../../services/cardDesigner.js";
import "../../styles/cardDesigner.css";

function CardPreview({ card }) {
  return <div className="card-designer-preview marketer-card-preview" style={{ aspectRatio: `${card.imageWidth} / ${card.imageHeight}` }}>
    <img src={card.image} alt="Business card background" />
    {cardRenderEntries(card, card.values).map(({ field, value }) => <span key={field.id} className="card-designer-overlay" style={{ left: `${field.x}%`, top: `${field.y}%`, color: field.color, fontSize: `${field.fontSize / card.imageWidth * 100}cqw`, fontWeight: field.bold ? 700 : 400, transform: `translate(${field.align === "center" ? "-50%" : field.align === "right" ? "-100%" : "0"}, -100%)`, textAlign: field.align }}>{value}</span>)}
  </div>;
}

export default function MarketerCardPanel({ onBack, endpoint = "/cards/me", title = "My Card", embedded = false, onEdit }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const load = async () => {
    setLoading(true); setError("");
    try { setCard((await request(endpoint)).card); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [endpoint]);
  useEffect(() => {
    if (!expanded) return;
    const onEscape = (event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setExpanded(false); } };
    document.addEventListener("keydown", onEscape, true);
    return () => document.removeEventListener("keydown", onEscape, true);
  }, [expanded]);
  const download = async () => {
    try { await downloadCardPdf(card, card.values); setError(""); }
    catch (failure) { setError(failure.message); }
  };
  return <section className={`marketer-my-card${embedded ? " marketer-my-card-embedded" : ""}`}>
    {onBack && <div className="portal-section-toolbar"><button type="button" className="portal-section-back" onClick={onBack}>← Back</button></div>}
    <header><h2>{title}</h2><p>{title === "My Card" ? "Your business card is ready to view and download." : "View and download the admin business card."}</p></header>
    {loading && <p>Loading card…</p>}
    {error && <p className="card-designer-error" role="alert">{error} <button type="button" onClick={load}>Retry</button></p>}
    {!loading && !error && !card && <p>Your card is not available. Please contact admin.</p>}
    {card && <div className="marketer-my-card-content"><CardPreview card={card} /><div className="marketer-my-card-actions"><button type="button" onClick={() => setExpanded(true)}>Expand</button><button type="button" onClick={download}>Download PDF</button>{onEdit && <button type="button" onClick={() => onEdit(card.id)}>Edit Card</button>}</div></div>}
    {expanded && card && createPortal(<div className="card-designer-preview-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setExpanded(false); }} role="presentation"><div className="card-designer-preview-dialog" role="dialog" aria-modal="true" aria-label="Expanded business card"><div className="card-designer-preview-dialog-head"><strong>{title}</strong><button type="button" onClick={() => setExpanded(false)}>Close ×</button></div><CardPreview card={card} /></div></div>, document.body)}
  </section>;
}

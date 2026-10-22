import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { request } from "../../services/authApi.js";
import { cardRenderEntries, defaultCardFields, defaultCardValues, downloadCardCdr, downloadCardPdf, downloadCardSvg, downloadCardShareZip, prepareCardImage } from "../../services/cardDesigner.js";
import defaultCardArt from "../../assets/card-blank-template.png";
import "../../styles/cardDesigner.css";

const newTemplate = () => ({ image: "", imageWidth: 1658, imageHeight: 951, widthMm: 85.6, fields: defaultCardFields.map((field) => ({ ...field })) });

export default function AdminCardDesignerPanel({ cardId = "", onSaved, onOpenSaved, onBack }) {
  const [template, setTemplate] = useState(newTemplate);
  const [values, setValues] = useState(() => ({ ...defaultCardValues }));
  const stateRef = useRef({ template: newTemplate(), values: { ...defaultCardValues } });
  const historyRef = useRef([]);
  const [undoCount, setUndoCount] = useState(0);
  const [editingId, setEditingId] = useState(cardId);
  const [linkedMarketer, setLinkedMarketer] = useState(false);
  const [selected, setSelected] = useState("depotName");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingCdr, setExportingCdr] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const uploadRef = useRef(null);
  const install = (nextTemplate, nextValues, id = "") => {
    stateRef.current = { template: nextTemplate, values: nextValues };
    setTemplate(nextTemplate); setValues(nextValues); setEditingId(id);
    historyRef.current = []; setUndoCount(0); setDirty(false);
  };
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setMessage("");
    (async () => {
      try {
        if (cardId) {
          const { card } = await request(`/cards/${encodeURIComponent(cardId)}`);
          if (active) { setLinkedMarketer(Boolean(card.marketerId)); install({ image: card.image, imageWidth: card.imageWidth, imageHeight: card.imageHeight, widthMm: card.widthMm, fields: card.fields }, card.values, card.id); }
        } else {
          const blob = await fetch(defaultCardArt).then((response) => response.blob());
          const image = await prepareCardImage(blob);
          if (active) { setLinkedMarketer(false); install({ ...newTemplate(), ...image }, { ...defaultCardValues }); }
        }
      } catch (problem) { if (active) setError(problem.message); }
    })().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cardId]);
  const change = (nextTemplate, nextValues) => {
    historyRef.current.push({ template: { ...stateRef.current.template, fields: stateRef.current.template.fields.map((field) => ({ ...field })) }, values: { ...stateRef.current.values } });
    if (historyRef.current.length > 100) historyRef.current.shift();
    setUndoCount(historyRef.current.length);
    stateRef.current = { template: nextTemplate, values: nextValues };
    setTemplate(nextTemplate); setValues(nextValues); setDirty(true); setMessage("");
  };
  const undo = () => {
    const previous = historyRef.current.pop();
    if (!previous) return;
    stateRef.current = previous;
    setTemplate(previous.template); setValues(previous.values);
    setUndoCount(historyRef.current.length); setDirty(true); setMessage("");
  };
  const undoRef = useRef(undo); undoRef.current = undo;
  useEffect(() => {
    const onKey = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undoRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!previewExpanded) return;
    const onEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setPreviewExpanded(false);
    };
    document.addEventListener("keydown", onEscape, true);
    return () => document.removeEventListener("keydown", onEscape, true);
  }, [previewExpanded]);
  const changeTemplate = (update) => change({ ...stateRef.current.template, ...update }, stateRef.current.values);
  const changeValue = (id, value) => change(stateRef.current.template, { ...stateRef.current.values, [id]: value });
  const changeField = (id, update) => changeTemplate({ fields: stateRef.current.template.fields.map((field) => field.id === id ? { ...field, ...update } : field) });
  const upload = async (file) => {
    if (!file) return;
    setError("");
    try { changeTemplate(await prepareCardImage(file)); }
    catch (problem) { setError(problem.message); }
    if (uploadRef.current) uploadRef.current.value = "";
  };
  const save = async () => {
    if (!template.image) return setError("Card image is still loading.");
    setSaving(true); setError(""); setMessage("");
    try {
      const { card } = await request(editingId ? `/cards/${encodeURIComponent(editingId)}` : "/cards", { method: editingId ? "PUT" : "POST", body: JSON.stringify({ template, values }) });
      setEditingId(card.id); setDirty(false); setMessage("Card saved. It is available in Saved Cards."); onSaved?.(card.id);
    } catch (problem) { setError(problem.message); }
    finally { setSaving(false); }
  };
  const exportCard = async (kind) => {
    if (!template.image) return setError("Card image is still loading.");
    setError("");
    if (kind === "cdr") setExportingCdr(true);
    try { const fileName = kind === "cdr" ? await downloadCardCdr(template, values) : kind === "zip" ? downloadCardShareZip(template, values) : kind === "svg" ? downloadCardSvg(template, values) : await downloadCardPdf(template, values); setMessage(`${fileName} downloaded. ${kind === "zip" ? "Send the ZIP on WhatsApp as a Document. The receiver can extract the SVG and open it in CorelDRAW." : "Check your browser's Downloads folder."}`); }
    catch (problem) { setError(`Could not export card: ${problem.message}`); }
    finally { if (kind === "cdr") setExportingCdr(false); }
  };
  const addField = () => {
    const id = `field-${Date.now()}`;
    changeTemplate({ fields: [...template.fields, { id, label: "New field", x: 50, y: 50, fontSize: 34, color: "#242424", align: "center", bold: false }] });
    setSelected(id);
  };
  const addPhone = () => {
    const index = template.fields.findIndex((field) => field.id === "phone");
    if (index < 0 || template.fields.some((field) => field.id === "phone2")) return;
    const fields = [...template.fields];
    fields.splice(index + 1, 0, { ...fields[index], id: "phone2", label: "Second phone" });
    changeTemplate({ fields }); setSelected("phone2");
  };
  const moveField = (id, direction) => {
    const fields = [...template.fields];
    const index = fields.findIndex((field) => field.id === id);
    const next = index + direction;
    if (next < 0 || next >= fields.length) return;
    [fields[index], fields[next]] = [fields[next], fields[index]];
    changeTemplate({ fields });
  };
  const removeField = (id) => { changeTemplate({ fields: template.fields.filter((field) => field.id !== id) }); if (selected === id) setSelected(""); };
  const selectedField = template.fields.find((field) => field.id === selected);
  const nudge = (dx, dy) => {
    const target = selected === "phone2" ? template.fields.find((field) => field.id === "phone") : selectedField;
    if (!target) return;
    const position = (value) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
    changeField(target.id, { x: position(target.x + dx), y: position(target.y + dy) });
  };
  const place = (event) => {
    if (!selectedField) return;
    const rect = event.currentTarget.getBoundingClientRect();
    changeField(selected === "phone2" ? "phone" : selected, { x: Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) * 10) / 10 });
  };
  const renderPreview = () => <div className="card-designer-preview" onClick={place} role="presentation" style={{ aspectRatio: `${template.imageWidth} / ${template.imageHeight}` }}><img src={template.image} alt="Card background" draggable="false" />
    {cardRenderEntries(template, values).map(({ field, value }) => <span key={field.id} className={`card-designer-overlay ${field.id === selected ? "selected" : ""}`} style={{ left: `${field.x}%`, top: `${field.y}%`, color: field.color, fontSize: `${field.fontSize / template.imageWidth * 100}cqw`, fontWeight: field.bold ? 700 : 400, transform: `translate(${field.align === "center" ? "-50%" : field.align === "right" ? "-100%" : "0"}, -100%)`, textAlign: field.align }}>{value}</span>)}
  </div>;

  return <section className="card-designer card-designer-v2">
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back" onClick={onBack}>← Back</button></div>
    <header className="card-designer-head"><div><h2>Card Designer</h2><p>{linkedMarketer ? "Marketer card format is locked. Select a field to adjust its position." : editingId ? "Edit your saved card" : "Create a new card"} · Choose a field, then click the card to place its text.</p></div><div className="card-designer-actions"><button type="button" onClick={onOpenSaved}>Saved Cards</button>{!linkedMarketer && <button type="button" onClick={() => uploadRef.current?.click()}>Change artwork</button>}<button type="button" onClick={undo} disabled={!undoCount}>Undo (Ctrl+Z)</button></div></header>
    <input ref={uploadRef} className="card-designer-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
    {loading && <p>Loading card…</p>}{error && <p className="card-designer-error" role="alert">{error}</p>}{message && <p className="card-designer-success" role="status">{message}</p>}
    <div className="card-designer-preview-area"><div className="card-designer-preview-head"><div className="card-designer-preview-title"><strong>Live card preview</strong><span>{selectedField ? `Selected: ${selectedField.label}` : "Select a field below"}</span></div></div>
      <div className="card-designer-stage">
        <div className="card-designer-stage-actions"><button type="button" onClick={() => setPreviewExpanded(true)} disabled={!template.image} aria-label="Expand card preview">Expand ↗</button><button type="button" onClick={() => exportCard("pdf")} disabled={!template.image}>Download PDF</button><button type="button" onClick={() => exportCard("svg")} disabled={!template.image}>Corel SVG</button><button type="button" onClick={() => exportCard("cdr")} disabled={!template.image || exportingCdr}>{exportingCdr ? "Creating CDR…" : "Corel CDR"}</button><button type="button" onClick={() => exportCard("zip")} disabled={!template.image}>WhatsApp ZIP</button></div>
        {template.image ? renderPreview() : <div className="card-designer-empty">Loading default card artwork…</div>}
        <div className="card-designer-nudge" aria-label="Move selected card text"><strong>Move text</strong><small>{selectedField?.label || "Select a field"}</small><div className="card-designer-nudge-grid"><button type="button" className="up" disabled={!selectedField} onClick={() => nudge(0, -0.2)} aria-label="Move selected text up">↑</button><button type="button" className="left" disabled={!selectedField} onClick={() => nudge(-0.2, 0)} aria-label="Move selected text left">←</button><button type="button" className="right" disabled={!selectedField} onClick={() => nudge(0.2, 0)} aria-label="Move selected text right">→</button><button type="button" className="down" disabled={!selectedField} onClick={() => nudge(0, 0.2)} aria-label="Move selected text down">↓</button></div><small>0.2% per tap</small></div>
      </div><p className="card-designer-tip">Select a detail below, then use the arrows for small adjustments.</p>
    </div>
    {previewExpanded && template.image && createPortal(<div className="card-designer-preview-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewExpanded(false); }} role="presentation"><div className="card-designer-preview-dialog" role="dialog" aria-modal="true" aria-label="Expanded card preview"><div className="card-designer-preview-dialog-head"><strong>Card preview</strong><button type="button" onClick={() => setPreviewExpanded(false)} aria-label="Close card preview">Close ×</button></div>{renderPreview()}</div></div>, document.body)}
    <div className="card-designer-controls"><div className="card-designer-controls-head"><div><h3>Card details</h3><p>{linkedMarketer ? "Marketer details and style are synced with the account. Select a field to move it." : "Change text, style and order. The preview updates as you type."}</p></div>{!linkedMarketer && <button type="button" onClick={addField}>+ Add field</button>}</div>
      <div className="card-designer-fields">{template.fields.map((field, index) => <div className={`card-designer-field ${selected === field.id ? "active" : ""}`} key={field.id}>
        <div className="card-designer-field-title"><input aria-label="Field label" value={field.label} maxLength={60} readOnly={linkedMarketer} onFocus={() => setSelected(field.id)} onChange={(event) => changeField(field.id, { label: event.target.value })} /><div className="card-designer-field-buttons">{!linkedMarketer && <><button type="button" title="Move up" disabled={index === 0} onClick={() => moveField(field.id, -1)}>↑</button><button type="button" title="Move down" disabled={index === template.fields.length - 1} onClick={() => moveField(field.id, 1)}>↓</button></>}<button type="button" onClick={() => setSelected(field.id)}>{selected === field.id ? "Selected" : "Select"}</button>{!linkedMarketer && <button type="button" title="Remove field" aria-label={`Remove ${field.label}`} onClick={() => removeField(field.id)}>×</button>}</div></div>
        <div className="card-designer-value-row"><textarea aria-label={`${field.label} text`} placeholder={`Enter ${field.label.toLowerCase()}`} rows={1} value={values[field.id] || ""} readOnly={linkedMarketer} onFocus={() => setSelected(field.id)} onChange={(event) => changeValue(field.id, event.target.value)} />{!linkedMarketer && field.id === "phone" && !template.fields.some((item) => item.id === "phone2") && <button type="button" aria-label="Add second phone number" title="Add second phone number" onClick={addPhone}>+</button>}</div>
        {!linkedMarketer && <div className="card-designer-field-settings"><label>Font size <input type="number" min="8" max="200" value={field.fontSize} onChange={(event) => changeField(field.id, { fontSize: Number(event.target.value) })} /></label><label>Color <input type="color" value={field.color} onChange={(event) => changeField(field.id, { color: event.target.value })} /></label><label>Align <select value={field.align} onChange={(event) => changeField(field.id, { align: event.target.value })}><option>left</option><option>center</option><option>right</option></select></label><label className="card-designer-check"><input type="checkbox" checked={field.bold} onChange={(event) => changeField(field.id, { bold: event.target.checked })} /> Bold</label></div>}
      </div>)}</div>
      <div className="card-designer-bottom">{!linkedMarketer && <label className="card-designer-print-width">Print width (mm) <input type="number" min="30" max="300" step="0.1" value={template.widthMm} onChange={(event) => changeTemplate({ widthMm: Number(event.target.value) })} /></label>}<button type="button" className="primary" onClick={save} disabled={saving || !template.image || (linkedMarketer && !dirty)}>{saving ? "Saving…" : editingId ? "Save changes" : "Save card"}</button></div>
      {dirty && <p className="card-designer-tip">Unsaved changes · Ctrl+Z to undo the last edit.</p>}
    </div>
  </section>;
}

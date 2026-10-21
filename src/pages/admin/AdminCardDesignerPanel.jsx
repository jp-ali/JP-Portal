import React, { useEffect, useRef, useState } from "react";
import { request } from "../../services/authApi.js";
import { defaultCardFields, defaultCardValues, downloadCardPdf, downloadCardSvg, prepareCardImage } from "../../services/cardDesigner.js";
import defaultCardArt from "../../assets/bin-eisa-card-template.png";
import "../../styles/cardDesigner.css";

const blank = () => ({ image: "", imageWidth: 1200, imageHeight: 750, widthMm: 85.6, fields: defaultCardFields.map((field) => ({ ...field })) });

export default function AdminCardDesignerPanel() {
  const [template, setTemplate] = useState(blank);
  const [values, setValues] = useState(() => ({ ...defaultCardValues }));
  const [selected, setSelected] = useState("name");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const uploadRef = useRef(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { template: saved } = await request("/card-template");
        if (saved) { if (active) setTemplate(saved); return; }
      } catch (problem) { if (active) setError(problem.message); }
      try {
        const imageFile = await fetch(defaultCardArt).then((response) => response.blob());
        const image = await prepareCardImage(imageFile);
        if (active) setTemplate((current) => ({ ...current, ...image }));
      } catch (problem) { if (active) setError(problem.message); }
    })().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const changeTemplate = (update) => { setTemplate((current) => ({ ...current, ...update })); setDirty(true); setMessage(""); };
  const changeField = (id, update) => {
    setTemplate((current) => ({ ...current, fields: current.fields.map((field) => field.id === id ? { ...field, ...update } : field) }));
    setDirty(true); setMessage("");
  };
  const upload = async (file) => {
    if (!file) return;
    setError("");
    try { changeTemplate(await prepareCardImage(file)); }
    catch (problem) { setError(problem.message); }
    if (uploadRef.current) uploadRef.current.value = "";
  };
  const save = async () => {
    if (!template.image) return setError("Upload a card image first.");
    setSaving(true); setError(""); setMessage("");
    try {
      const result = await request("/card-template", { method: "PUT", body: JSON.stringify(template) });
      setTemplate(result.template); setDirty(false); setMessage("Card template saved. It will appear here next time.");
    } catch (problem) { setError(problem.message); }
    finally { setSaving(false); }
  };
  const exportCard = async (kind) => {
    if (!template.image) return setError("Upload a card image first.");
    setError("");
    try { if (kind === "svg") downloadCardSvg(template, values); else await downloadCardPdf(template, values); }
    catch (problem) { setError(`Could not export card: ${problem.message}`); }
  };
  const addField = () => {
    const id = `field-${Date.now()}`;
    changeTemplate({ fields: [...template.fields, { id, label: "New field", x: 50, y: 50, fontSize: 30, color: "#73102b", align: "center", bold: false }] });
    setSelected(id);
  };
  const selectedField = template.fields.find((field) => field.id === selected);
  const place = (event) => {
    if (!selectedField) return;
    const rect = event.currentTarget.getBoundingClientRect();
    changeField(selected, { x: Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)) * 10) / 10,
      y: Math.round(Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) * 10) / 10 });
  };
  return <section className="card-designer">
    <div className="card-designer-head">
      <div><h2>🎨 Card Designer</h2><p>Upload your card artwork, enter details, then place each field on the preview.</p></div>
      <div className="card-designer-actions">
        <button type="button" onClick={() => uploadRef.current?.click()}>Upload card image</button>
        <button type="button" className="primary" onClick={save} disabled={saving || !template.image}>{saving ? "Saving…" : dirty ? "Save template *" : "Save template"}</button>
      </div>
    </div>
    <input ref={uploadRef} className="card-designer-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} />
    {loading && <p>Loading card template…</p>}
    {error && <p className="card-designer-error" role="alert">{error}</p>}
    {message && <p className="card-designer-success" role="status">{message}</p>}
    {dirty && <p className="card-designer-tip">Template changes are unsaved. Save to use this layout next time.</p>}
    <div className="card-designer-layout">
      <div className="card-designer-preview-area">
        <div className="card-designer-preview-head"><strong>Live preview</strong><span>{selectedField ? `Click card to place “${selectedField.label}”` : "Select a field to place it"}</span></div>
        {template.image ? <div className="card-designer-preview" onClick={place} role="presentation" style={{ aspectRatio: `${template.imageWidth} / ${template.imageHeight}` }}>
          <img src={template.image} alt="Card template" draggable="false" />
          {template.fields.map((field) => values[field.id] && <span key={field.id} className={`card-designer-overlay ${field.id === selected ? "selected" : ""}`} style={{ left: `${field.x}%`, top: `${field.y}%`, color: field.color, fontSize: `${field.fontSize / template.imageWidth * 100}cqw`, fontWeight: field.bold ? 700 : 400, transform: `translate(${field.align === "center" ? "-50%" : field.align === "right" ? "-100%" : "0"}, -100%)`, textAlign: field.align }}>{values[field.id]}</span>)}
        </div> : <div className="card-designer-empty">Upload a picture of the card to start. It will be shown here whenever you open Card Designer.</div>}
        <div className="card-designer-export">
          <button type="button" onClick={() => exportCard("pdf")} disabled={!template.image}>Download PDF</button>
          <button type="button" onClick={() => exportCard("svg")} disabled={!template.image}>Download Corel editable SVG</button>
        </div>
        <p className="card-designer-tip">Open the SVG in CorelDRAW to edit the name, role, phone and address, then save it as a CDR file. The card artwork stays an image layer.</p>
      </div>
      <div className="card-designer-controls">
        <div className="card-designer-preview-head"><strong>Card details</strong><button type="button" onClick={addField}>+ Add field</button></div>
        {template.fields.map((field) => <div className={`card-designer-field ${selected === field.id ? "active" : ""}`} key={field.id}>
          <div className="card-designer-field-title"><input aria-label="Field label" value={field.label} maxLength={60} onFocus={() => setSelected(field.id)} onChange={(event) => changeField(field.id, { label: event.target.value })} /><button type="button" onClick={() => setSelected(field.id)}>{selected === field.id ? "Selected" : "Place"}</button><button type="button" aria-label={`Remove ${field.label}`} title="Remove field" onClick={() => { changeTemplate({ fields: template.fields.filter((item) => item.id !== field.id) }); if (selected === field.id) setSelected(""); }}>×</button></div>
          <textarea aria-label={`${field.label} text`} placeholder={`Type ${field.label.toLowerCase()} here`} rows={2} value={values[field.id] || ""} onFocus={() => setSelected(field.id)} onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))} />
          {selected === field.id && <div className="card-designer-field-settings"><label>Size <input type="number" min="8" max="200" value={field.fontSize} onChange={(event) => changeField(field.id, { fontSize: Number(event.target.value) })} /></label><label>Color <input type="color" value={field.color} onChange={(event) => changeField(field.id, { color: event.target.value })} /></label><label>Align <select value={field.align} onChange={(event) => changeField(field.id, { align: event.target.value })}><option>left</option><option>center</option><option>right</option></select></label><label className="card-designer-check"><input type="checkbox" checked={field.bold} onChange={(event) => changeField(field.id, { bold: event.target.checked })} /> Bold</label></div>}
        </div>)}
        <label className="card-designer-print-width">Print width (mm) <input type="number" min="30" max="300" step="0.1" value={template.widthMm} onChange={(event) => changeTemplate({ widthMm: Number(event.target.value) })} /></label>
      </div>
    </div>
  </section>;
}

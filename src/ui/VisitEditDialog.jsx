import React, { useState } from "react";
import { createPortal } from "react-dom";
import NumberOrCustomField from "./NumberOrCustomField.jsx";

const fields = ["schoolName", "principalName", "phone", "purpose", "session", "branches", "strength", "notes"];

export default function VisitEditDialog({ visit, onClose, onSave, inputStyle }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field, String(visit[field] || "")])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const change = (field) => (value) => setValues((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onSave(visit.id, values);
      onClose();
    } catch (failure) {
      setError(failure.message || "Could not save visit");
    } finally {
      setSaving(false);
    }
  };

  const field = (label, name, type = "text") => <label style={{ display: "block", color: "#5c484e", fontSize: "13px", fontWeight: 600 }}>
    {label}
    <input type={type} required value={values[name]} onChange={(event) => change(name)(event.target.value)} style={{ ...inputStyle, marginTop: "6px" }} />
  </label>;

  return createPortal(<div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 12000, background: "rgba(20,12,16,.7)", display: "grid", placeItems: "center", padding: "12px" }}>
    <div role="dialog" aria-modal="true" aria-label="Edit visit" style={{ width: "min(100%,560px)", maxHeight: "95vh", overflowY: "auto", background: "#fff", borderRadius: "14px", padding: "18px", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
      <h2 style={{ margin: "0 0 14px", fontSize: "19px", color: "#7a0f2b" }}>Edit Visit</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: "12px" }}>
        {field("School Name", "schoolName")}
        {field("Contact Person", "principalName")}
        {field("Phone Number", "phone", "tel")}
        {field("Purpose", "purpose")}
        {field("Session", "session")}
        <NumberOrCustomField label="Branches" value={values.branches} onChange={change("branches")} values={Array.from({ length: 10 }, (_, index) => String(index + 1))} inputStyle={inputStyle} />
        <NumberOrCustomField label="Strength" value={values.strength} onChange={change("strength")} values={Array.from({ length: 10 }, (_, index) => String((index + 1) * 100))} inputStyle={inputStyle} />
        <label style={{ color: "#5c484e", fontSize: "13px", fontWeight: 600 }}>Remarks
          <textarea value={values.notes} onChange={(event) => change("notes")(event.target.value)} rows="3" style={{ ...inputStyle, marginTop: "6px", fontFamily: "inherit" }} />
        </label>
        {error && <p role="alert" style={{ margin: 0, color: "#be123c", fontSize: "13px" }}>{error}</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 14px", border: "1px solid #ddcbd0", borderRadius: "8px", background: "#fff" }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ padding: "9px 14px", border: 0, borderRadius: "8px", background: "#7a0f2b", color: "#fff", fontWeight: 700 }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </form>
    </div>
  </div>, document.fullscreenElement || document.body);
}

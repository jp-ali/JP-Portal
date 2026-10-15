import React, { useState } from "react";

export default function MarketerMultiSelect({ marketers, selected, onChange, inputStyle, valueKey = "email", emptyLabel = "All Marketers", single = false, height = 42 }) {
  const [open, setOpen] = useState(false);
  const choices = marketers.slice().sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));
  return (
    <div className="verification-marketer-field" style={{ position: "relative", flex: 1, minWidth: "170px" }}>
      <label style={{ display: "block", fontSize: "11px", color: "#5c484e", fontWeight: 700, marginBottom: "4px" }}>{single ? "Select Marketer" : "Select Marketer(s)"}</label>
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={{ ...inputStyle, width: "100%", height, padding: "7px 10px", background: "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
        <span>{single ? (choices.find((m) => m[valueKey] === selected[0])?.name || emptyLabel) : (selected.length ? `${selected.length} Marketer(s) Selected` : emptyLabel)}</span><span>▾</span>
      </button>
      {open && <div className="verification-marketer-picker">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", marginBottom: "8px" }}>
          {!single && <button type="button" onClick={() => onChange(choices.map((m) => m[valueKey]).filter(Boolean))} style={{ padding: "6px 9px", border: "none", borderRadius: "7px", background: "#7a0f2b", color: "#fff", fontSize: "10.5px", fontWeight: 800, cursor: "pointer" }}>Select All</button>}
          <button type="button" onClick={() => onChange([])} style={{ padding: "6px 9px", border: "1px solid #ddcbd0", borderRadius: "7px", background: "#fff", color: "#7a0f2b", fontSize: "10.5px", fontWeight: 800, cursor: "pointer" }}>Clear</button>
          <button type="button" onClick={() => setOpen(false)} style={{ padding: "6px 9px", border: "1px solid #ddcbd0", borderRadius: "7px", background: "#fff", color: "#333", fontSize: "10.5px", fontWeight: 800, cursor: "pointer" }}>Done</button>
        </div>
        {choices.map((m) => {
          const value = m[valueKey];
          const checked = selected.includes(value);
          return <label key={m.id || value} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 6px", borderRadius: "7px", cursor: "pointer", background: checked ? "#fff2f5" : "transparent", color: "#35262a", fontSize: "11.5px" }}>
            <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selected.filter((item) => item !== value) : single ? [value] : [...selected, value])} />
            <span>{m.name || m.email || "Marketer"}</span>
          </label>;
        })}
      </div>}
    </div>
  );
}

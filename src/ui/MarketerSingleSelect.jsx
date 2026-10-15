import React, { useState } from "react";

export default function MarketerSingleSelect({ marketers, selected, onChange, inputStyle, valueKey = "id", allowAll = false, height = 42 }) {
  const [open, setOpen] = useState(false);
  const choices = marketers.slice().sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));
  const selectedMarketer = choices.find((m) => m[valueKey] === selected);
  const select = (value) => { onChange(value); setOpen(false); };
  return <div style={{ position: "relative" }}>
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={{ ...inputStyle, width: "100%", height, padding: "6px 10px", background: "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left" }}>
      <span>{selectedMarketer?.name || selectedMarketer?.email || (allowAll ? "All Marketers" : "Select Marketer")}</span><span>▾</span>
    </button>
    {open && <div className="verification-marketer-picker">
      {allowAll && <button type="button" onClick={() => select("")} style={{ display: "block", width: "100%", padding: "8px 6px", border: "none", borderRadius: "7px", background: !selected ? "#fff2f5" : "transparent", color: "#35262a", textAlign: "left", cursor: "pointer" }}>All Marketers</button>}
      {choices.map((m) => <button type="button" key={m.id || m[valueKey]} onClick={() => select(m[valueKey])} style={{ display: "block", width: "100%", padding: "8px 6px", border: "none", borderRadius: "7px", background: selected === m[valueKey] ? "#fff2f5" : "transparent", color: "#35262a", textAlign: "left", cursor: "pointer" }}>{m.name || m.email || "Marketer"}</button>)}
    </div>}
  </div>;
}

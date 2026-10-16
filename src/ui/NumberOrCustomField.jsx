import React, { useEffect, useState } from "react";

export default function NumberOrCustomField({ label, value, onChange, values, inputStyle, resetKey, required = false }) {
  const [custom, setCustom] = useState(false);
  useEffect(() => { setCustom(false); }, [resetKey]);
  const customMode = custom || (value && !values.includes(String(value)));
  return <div>
    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#5c484e", marginBottom: "6px" }}>{label}</label>
    <select value={customMode ? "custom" : value} required={required} onChange={(event) => {
      if (event.target.value === "custom") { setCustom(true); onChange(""); }
      else { setCustom(false); onChange(event.target.value); }
    }} style={{ ...inputStyle, appearance: "auto", background: "#fffdfa", height: "49px" }}>
      <option value="">Select {label.toLowerCase()}</option>
      {values.map((item) => <option key={item} value={item}>{item}</option>)}
      <option value="custom">Custom</option>
    </select>
    {customMode && <input type="number" inputMode="numeric" min="1" step="1" required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={`Enter ${label.toLowerCase()}`} style={{ ...inputStyle, marginTop: "8px" }} />}
  </div>;
}

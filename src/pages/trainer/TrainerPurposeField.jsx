import React, { useEffect, useState } from "react";
import { trainerPurposeOptions } from "./trainerPurposeOptions.js";

export default function TrainerPurposeField({ value, onChange, inputStyle, resetKey }) {
  const [customSelected, setCustomSelected] = useState(false);
  useEffect(() => { setCustomSelected(false); }, [resetKey]);
  const custom = customSelected || Boolean(value && !trainerPurposeOptions.includes(value));

  return <label>Purpose
    <select style={inputStyle} required value={custom ? "custom" : value} onChange={(event) => {
      const selected = event.target.value;
      setCustomSelected(selected === "custom");
      onChange(selected === "custom" ? "" : selected);
    }}>
      <option value="">Select purpose</option>
      {trainerPurposeOptions.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
      <option value="custom">Custom</option>
    </select>
    {custom && <input style={{ ...inputStyle, marginTop: 8 }} required value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter custom purpose" />}
  </label>;
}

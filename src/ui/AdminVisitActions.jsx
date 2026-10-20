import React, { useState } from "react";

const button = { padding: "5px 8px", border: 0, borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "10px", fontWeight: 700 };

export default function AdminVisitActions({ visit, onEdit, onDeletePicture, onDeleteReport }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: "5px" }}>
    <button type="button" onClick={() => onEdit(visit)} style={{ ...button, background: "#7a0f2b" }}>Edit</button>
    <button type="button" aria-expanded={deleteOpen} onClick={() => setDeleteOpen((open) => !open)} style={{ ...button, background: "#7a0f2b" }}>Delete</button>
    {deleteOpen && <div style={{ flexBasis: "100%", display: "flex", justifyContent: "center", gap: "5px" }}>
      <button type="button" disabled={!visit.image} title={visit.image ? "Delete only the picture" : "No picture"} onClick={() => { setDeleteOpen(false); onDeletePicture(visit.id); }} style={{ ...button, background: visit.image ? "#8f1532" : "#9ca3af", cursor: visit.image ? "pointer" : "default" }}>Picture</button>
      <button type="button" onClick={() => { setDeleteOpen(false); onDeleteReport(visit.id); }} style={{ ...button, background: "#7a0f2b" }}>Report</button>
    </div>}
  </div>;
}

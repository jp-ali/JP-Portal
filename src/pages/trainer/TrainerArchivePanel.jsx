import React, { useEffect, useMemo, useState } from "react";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import defaultAvatar from "../../assets/default-marketer-avatar.svg";
import archiveCss from "../../styles/marketerArchive.css?raw";

const PAGE_SIZE = 10;

export default function TrainerArchivePanel({ mode, trainers, busy, onAction, onBack, inputStyle }) {
  const old = mode === "old";
  const [query, setQuery] = useState("");
  const [filteredIds, setFilteredIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  useEffect(() => {
    const available = new Set(trainers.map((trainer) => trainer.id));
    setFilteredIds((current) => current.filter((id) => available.has(id)));
    setSelectedIds((current) => current.filter((id) => available.has(id)));
  }, [trainers]);
  useEffect(() => { setPage(1); setSelectedIds([]); }, [mode, query, filteredIds]);
  const filtered = useMemo(() => trainers.filter((trainer) => {
    if (filteredIds.length && !filteredIds.includes(trainer.id)) return false;
    const needle = query.trim().toLowerCase();
    return !needle || [trainer.name, trainer.email, trainer.phone, trainer.designation].some((value) => String(value || "").toLowerCase().includes(needle));
  }), [trainers, filteredIds, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = new Set(selectedIds);
  const allSelected = filtered.length > 0 && filtered.every((trainer) => selected.has(trainer.id));
  const toggleAll = () => setSelectedIds((current) => allSelected ? current.filter((id) => !filtered.some((trainer) => trainer.id === id)) : [...new Set([...current, ...filtered.map((trainer) => trainer.id)])]);
  const act = async (rows) => {
    if (!rows.length) return;
    const verb = old ? "restore" : "move to Old Trainers";
    if (!window.confirm(`${old ? "Restore" : "Archive"} ${rows.length} trainer${rows.length === 1 ? "" : "s"}? ${old ? "Their previous account status will be restored." : "They will lose access until restored. Their records will be kept."}`)) return;
    await onAction(rows, old ? "restore" : "archive");
    setSelectedIds([]);
  };

  return <div className="marketer-archive-page">
    <style>{archiveCss}</style>
    <header className="marketer-archive-hero">
      <div className="marketer-archive-hero-icon" aria-hidden="true">{old ? "↺" : "▤"}</div>
      <div className="marketer-archive-hero-copy"><h1>{old ? "Old Trainers" : "Delete Trainer"}</h1><p>{old ? "Restore archived trainers and their previous account status." : "Move trainers to Old Trainers while keeping their records."}</p></div>
    </header>
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back marketer-archive-back" onClick={onBack}>← Back to Menu</button></div>
    <div className="marketer-archive-controls">
      <label className="marketer-archive-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trainer by name, email or designation..." aria-label="Search trainers" /></label>
      <MarketerMultiSelect marketers={trainers} selected={filteredIds} onChange={setFilteredIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Trainers" itemLabel="Trainer" pluralLabel="Trainers" />
      <button className="marketer-archive-select-all" type="button" onClick={toggleAll} disabled={!filtered.length || busy}><span className="marketer-archive-small-check">{allSelected ? "✓" : ""}</span>{allSelected ? "Deselect All" : "Select All"}</button>
      <button className={old ? "marketer-archive-bulk-restore" : "marketer-archive-bulk-delete"} type="button" onClick={() => act(filtered.filter((trainer) => selected.has(trainer.id)))} disabled={!selectedIds.length || busy}>{old ? "Restore" : "Delete"} Selected ({selectedIds.length})</button>
    </div>
    {visible.length ? <div className="marketer-archive-grid">{visible.map((trainer) => <article key={trainer.id} className={`marketer-archive-card${selected.has(trainer.id) ? " is-selected" : ""}`}>
      <img className="marketer-archive-avatar" src={trainer.profilePhoto || defaultAvatar} alt="" />
      <div className="marketer-archive-person"><strong>{trainer.name || "Unnamed Trainer"}</strong><small title={trainer.email}>{trainer.email || "No email"}</small><div className="marketer-archive-facts"><span>{trainer.phone || "No phone"}</span><span>{trainer.designation || "Trainer"}</span></div></div>
      <label className="marketer-archive-check"><input type="checkbox" checked={selected.has(trainer.id)} onChange={() => setSelectedIds((current) => current.includes(trainer.id) ? current.filter((id) => id !== trainer.id) : [...current, trainer.id])} disabled={busy} aria-label={`Select ${trainer.name || "trainer"}`} /></label>
      <div className="marketer-archive-card-actions"><button type="button" className={old ? "marketer-archive-restore" : "marketer-archive-delete"} onClick={() => act([trainer])} disabled={busy}>{old ? "↺ Restore" : "▤ Delete"}</button></div>
    </article>)}</div> : <div className="marketer-archive-empty">{trainers.length ? "No trainers match these filters." : old ? "No old trainers yet." : "No active trainers found."}</div>}
    <footer className="marketer-archive-footer"><span>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} trainers</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">‹</button><strong>{currentPage}</strong><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page">›</button></div></footer>
  </div>;
}

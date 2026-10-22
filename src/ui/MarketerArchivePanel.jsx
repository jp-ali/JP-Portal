import React, { useEffect, useMemo, useState } from "react";
import { usePortalContext } from "../context/PortalContext.jsx";
import { marketerCityNames } from "../domain/marketerCities.js";
import defaultAvatar from "../assets/default-marketer-avatar.svg";
import archiveCss from "../styles/marketerArchive.css?raw";

const PAGE_SIZE = 10;

function Icon({ name, size = 18 }) {
  const paths = {
    trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6" /></>,
    restore: <><path d="M4 11a8 8 0 1 1 2.4 5.7M4 4v7h7" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2" /></>,
    bag: <><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M9 7V5a3 3 0 0 1 6 0v2M4 12h16" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    home: <><path d="m3 10 9-7 9 7v10H3V10Z" /><path d="M9 20v-7h6v7" /></>
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function assignedCityKeys(marketer) {
  const ids = Array.isArray(marketer.assignedCityIds) ? marketer.assignedCityIds.filter(Boolean) : [];
  if (ids.length) return ids.map((id) => `id:${String(id)}`);
  const legacyCity = String(marketer.cityName || marketer.city || "").trim();
  return legacyCity ? [`name:${legacyCity.toLowerCase()}`] : [];
}

export default function MarketerArchivePanel({ mode }) {
  const {
    citiesList, deleteSearch, deletedMarketersList, handleBulkMarketerAction,
    handleDeleteMarketer, handlePermanentDeleteMarketer, handleRestoreMarketer,
    marketersList, setAdminView, setDeleteSearch
  } = usePortalContext();
  const isOld = mode === "old";
  const rows = isOld ? deletedMarketersList : marketersList;
  const [oldSearch, setOldSearch] = useState("");
  const query = isOld ? oldSearch : deleteSearch;
  const setQuery = isOld ? setOldSearch : setDeleteSearch;
  const [marketerId, setMarketerId] = useState("");
  const [cityKey, setCityKey] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const available = new Set(rows.map((row) => row.id));
    setSelectedIds((current) => current.filter((id) => available.has(id)));
  }, [rows]);
  useEffect(() => { setPage(1); setSelectedIds([]); }, [query, marketerId, cityKey]);

  const cityOptions = useMemo(() => {
    const cityById = new Map(citiesList.map((city) => [String(city.id), city.name]));
    const options = new Map();
    rows.forEach((marketer) => {
      const ids = Array.isArray(marketer.assignedCityIds) ? marketer.assignedCityIds.filter(Boolean) : [];
      ids.forEach((id) => {
        const key = `id:${String(id)}`;
        options.set(key, cityById.get(String(id)) || (ids.length === 1 && (marketer.cityName || marketer.city)) || String(id));
      });
      if (!ids.length) {
        const name = String(marketer.cityName || marketer.city || "").trim();
        if (name) options.set(`name:${name.toLowerCase()}`, name);
      }
    });
    return [...options].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  }, [citiesList, rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = rows.filter((marketer) => {
      if (marketerId && marketer.id !== marketerId) return false;
      if (cityKey && !assignedCityKeys(marketer).includes(cityKey)) return false;
      return !needle || String(marketer.name || "").toLowerCase().includes(needle) || String(marketer.email || "").toLowerCase().includes(needle);
    });
    return matches;
  }, [rows, query, marketerId, cityKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = new Set(selectedIds);
  const selectedRows = filtered.filter((marketer) => selected.has(marketer.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((marketer) => selected.has(marketer.id));

  const toggleSelected = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => setSelectedIds((current) => {
    const ids = new Set(current);
    filtered.forEach((marketer) => { if (allFilteredSelected) ids.delete(marketer.id); else ids.add(marketer.id); });
    return [...ids];
  });
  const runSingle = async (marketer, action) => {
    setBusy(true);
    try {
      if (action === "archive") await handleDeleteMarketer(marketer);
      if (action === "restore") await handleRestoreMarketer(marketer);
      if (action === "remove") await handlePermanentDeleteMarketer(marketer);
    } finally { setBusy(false); }
  };
  const runBulk = async (action) => {
    setBusy(true);
    try { await handleBulkMarketerAction(selectedRows, action); }
    finally { setBusy(false); }
  };

  return <div className="marketer-archive-page">
    <style>{archiveCss}</style>
    <nav className="marketer-archive-breadcrumb" aria-label="Breadcrumb">
      <button type="button" onClick={() => setAdminView("home")} aria-label="Home"><Icon name="home" size={17} /></button>
      <span>Home</span><b>›</b><span>Marketers</span><b>›</b><strong>{isOld ? "Old Marketers" : "Delete Active Marketer"}</strong>
    </nav>
    <header className="marketer-archive-hero">
      <div className="marketer-archive-hero-icon"><Icon name={isOld ? "restore" : "trash"} size={28} /></div>
      <div className="marketer-archive-hero-copy">
        <h1>{isOld ? "Old Marketers" : "Delete Active Marketer"}</h1>
        <p>{isOld ? "Restore archived marketers or delete them permanently." : "Search and select marketers to move to the old list."}</p>
      </div>
      <div className="marketer-archive-hero-art" aria-hidden="true"><span>▣</span><span>▣</span><span>▣</span><Icon name={isOld ? "restore" : "trash"} size={68} /></div>
    </header>

    <div className="marketer-archive-controls">
      <label className="marketer-archive-search"><Icon name="search" size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search marketer by name or email..." aria-label="Search marketers" /></label>
      <select aria-label="Filter marketer" value={marketerId} onChange={(event) => setMarketerId(event.target.value)}><option value="">All Marketers</option>{rows.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))).map((marketer) => <option key={marketer.id} value={marketer.id}>{marketer.name || marketer.email || "Unnamed Marketer"}</option>)}</select>
      <select aria-label="Filter city" value={cityKey} onChange={(event) => setCityKey(event.target.value)}><option value="">All Cities</option>{cityOptions.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select>
      <button className="marketer-archive-select-all" type="button" onClick={toggleAll} disabled={!filtered.length || busy}><span className="marketer-archive-small-check">{allFilteredSelected ? "✓" : ""}</span>{allFilteredSelected ? "Deselect All" : "Select All"}</button>
      {isOld && <button className="marketer-archive-bulk-restore" type="button" onClick={() => runBulk("restore")} disabled={!selectedRows.length || busy}>Restore Selected ({selectedRows.length})</button>}
      <button className="marketer-archive-bulk-delete" type="button" onClick={() => runBulk(isOld ? "remove" : "archive")} disabled={!selectedRows.length || busy}>Delete Selected ({selectedRows.length})</button>
    </div>

    {visible.length ? <div className="marketer-archive-grid">{visible.map((marketer) => <article key={marketer.id} className={`marketer-archive-card${selected.has(marketer.id) ? " is-selected" : ""}`}>
      <img className="marketer-archive-avatar" src={marketer.profilePhoto || defaultAvatar} alt="" />
      <div className="marketer-archive-person"><strong>{marketer.name || "Unnamed Marketer"}</strong><small title={marketer.email}>{marketer.email || "No email"}</small><div className="marketer-archive-facts"><span title={marketerCityNames(marketer, citiesList)}><Icon name="pin" size={14} />{marketerCityNames(marketer, citiesList)}</span><span title={marketer.designation || "Not assigned"}><Icon name="bag" size={14} />{marketer.designation || "Not assigned"}</span></div></div>
      <label className="marketer-archive-check"><input type="checkbox" checked={selected.has(marketer.id)} onChange={() => toggleSelected(marketer.id)} disabled={busy} aria-label={`Select ${marketer.name || marketer.email || "marketer"}`} /></label>
      <div className="marketer-archive-card-actions">{isOld && <button type="button" className="marketer-archive-restore" onClick={() => runSingle(marketer, "restore")} disabled={busy}><Icon name="restore" size={16} />Restore</button>}<button type="button" className="marketer-archive-delete" onClick={() => runSingle(marketer, isOld ? "remove" : "archive")} disabled={busy}><Icon name="trash" size={16} />Delete</button></div>
    </article>)}</div> : <div className="marketer-archive-empty">{rows.length ? "No marketers match these filters." : isOld ? "No old marketers yet." : "No active marketers found."}</div>}

    <footer className="marketer-archive-footer"><span>Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} marketers</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">‹</button><strong>{currentPage}</strong><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page">›</button></div></footer>
  </div>;
}

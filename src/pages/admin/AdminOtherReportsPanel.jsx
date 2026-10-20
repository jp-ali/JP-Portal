import React, { useMemo, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { request } from "../../services/authApi.js";
import { parseQuickContact } from "../../domain/parseQuickContact.js";
import { exportCustomReportExcel, exportCustomReportPDF } from "../../services/customReportExports.js";

const REMARKS = ["Contacted", "Contacted but sample didn't receive", "Didn't contact", "Sample received", "Other"];
const COLUMNS = [["name", "Name"], ["number", "Number"], ["city", "City"], ["institute", "Institute"], ["remarks", "Remarks"]];
const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (part) => parts.find((item) => item.type === part)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export default function AdminOtherReportsPanel({ mode, reports, setReports, selectedId, setSelectedId, loading, loadError, reload, onOrigin }) {
  const { adminView, cardStyle, expandedReportKey, renderReportExpandButton, reportViewClass, setAdminView, setExpandedReportKey, openVerificationCalls } = usePortalContext();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [remarkFilter, setRemarkFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const report = reports.find((item) => item.id === selectedId);
  const detail = adminView === "custom-report";
  const back = () => { setSelectedId(""); setAdminView(mode === "verification" ? "verification-reports" : "other-reports"); };
  const updateReport = (id, changes) => setReports((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const updateRow = (rowId, changes) => updateReport(report.id, { rows: (report.rows || []).map((row) => row.id === rowId ? { ...row, ...changes } : row) });
  const saveRow = async (rowId, changes) => {
    try { await request(`/custom-reports/${report.id}/rows/${rowId}`, { method: "PATCH", body: JSON.stringify(changes) }); setError(""); }
    catch (cause) { setError(cause.message); reload(); }
  };
  const createReport = async (event) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const { report: created } = await request("/custom-reports", { method: "POST", body: JSON.stringify({ title: title.trim(), date: today() }) });
      setReports((current) => [...current, created]); setTitle(""); setAdding(false); onOrigin("other"); setSelectedId(created.id); setAdminView("custom-report");
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  const addRow = async (row) => {
    setBusy(true); setError("");
    try {
      const { row: created } = await request(`/custom-reports/${report.id}/rows`, { method: "POST", body: JSON.stringify(row) });
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, rows: [...(item.rows || []), created] } : item));
      setQuickText(""); setQuickOpen(false);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  const removeRow = async (rowId) => {
    if (!window.confirm("Delete this row?")) return;
    try {
      await request(`/custom-reports/${report.id}/rows/${rowId}`, { method: "DELETE" });
      updateReport(report.id, { rows: (report.rows || []).filter((row) => row.id !== rowId) });
    } catch (cause) { setError(cause.message); }
  };
  const filtered = useMemo(() => (report?.rows || []).filter((row) => {
    const q = search.toLowerCase();
    return (!q || COLUMNS.some(([key]) => String(row[key] || "").toLowerCase().includes(q)))
      && (!cityFilter || row.city === cityFilter)
      && (!remarkFilter || row.remarks === remarkFilter);
  }), [report, search, cityFilter, remarkFilter]);
  const cities = [...new Set((report?.rows || []).map((row) => row.city).filter(Boolean))].sort();
  const runExport = async (kind) => {
    try { if (kind === "excel") exportCustomReportExcel(report, filtered); else await exportCustomReportPDF(report, filtered); setError(""); }
    catch (cause) { setError(cause.message); }
  };

  if (!detail) return <div style={cardStyle} className="other-reports-section">
    <div className="other-reports-header">
      <div><span className="other-reports-eyebrow">REPORT WORKSPACE</span><h2>{mode === "verification" ? "Verification" : "Other Reports"}</h2><p>{mode === "verification" ? "Review school visits and keep every follow-up in one place." : "A clean space for the reports you create and manage."}</p></div>
      <div className="other-reports-actions">
        <button className="other-reports-btn" onClick={() => setAdminView("home")}>← Back</button>
        {mode !== "verification" && <button className="other-reports-btn primary" onClick={() => setAdding((value) => !value)}>＋ Add Report</button>}
      </div>
    </div>
    <div className="other-reports-overview"><span className="other-reports-overview-icon" aria-hidden="true">▦</span><div><strong>{mode === "verification" ? reports.length + 1 : reports.length}</strong><span>{mode === "verification" ? "Available reports" : "Custom reports"}</span></div><p>{mode === "verification" ? "School Visits is ready whenever you need it." : "Create a report and start adding contacts in seconds."}</p></div>
    {adding && mode !== "verification" && <form className="other-reports-add" onSubmit={createReport}>
      <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter report name" maxLength={120} aria-label="Report name" />
      <button className="other-reports-btn primary" disabled={busy || !title.trim()}>Create</button>
    </form>}
    {error && <p className="other-reports-error" role="alert">{error}</p>}
    {loadError && <p className="other-reports-error" role="alert">{loadError} <button className="other-reports-btn" onClick={reload}>Retry</button></p>}
    {loading && <p>Loading reports…</p>}
    <div className="other-reports-list-heading"><h3>{mode === "verification" ? "Your verification reports" : "Your reports"}</h3><span>{mode === "verification" ? reports.length + 1 : reports.length} total</span></div>
    <div className="square-grid other-reports-grid">
      {mode === "verification" && <button type="button" className="square-card other-report-card other-report-card-featured" onClick={openVerificationCalls}>
        <span className="other-report-icon">🏫</span><span className="other-report-card-type">DEFAULT REPORT</span><h3>School Visits</h3><p>Verification calls and visit remarks</p><span className="other-report-card-arrow" aria-hidden="true">↗</span>
      </button>}
      {reports.map((item, index) => <button type="button" key={item.id} className="square-card other-report-card" style={{ "--report-order": index + 1 }} onClick={() => { onOrigin(mode); setSelectedId(item.id); setAdminView("custom-report"); }}>
        <span className="other-report-icon">📋</span><span className="other-report-card-type">CUSTOM REPORT</span><h3>{item.title}</h3><p>{item.rows?.length || 0} rows · {item.date}</p><span className="other-report-card-arrow" aria-hidden="true">↗</span>
      </button>)}
    </div>
    {!loading && !reports.length && mode !== "verification" && <p className="other-reports-empty">No custom reports yet. Select Add Report to create one.</p>}
  </div>;

  if (!report) return <div style={cardStyle}><button className="other-reports-btn" onClick={back}>← Back</button><p>Report was not found.</p></div>;
  const expanded = expandedReportKey === "custom-report";
  return <div className={reportViewClass("custom-report")}>
    {expanded && <div className="report-expanded-toolbar">
      <button className="report-expanded-back" aria-label="Close expanded report" onClick={() => setExpandedReportKey("")}>‹</button>
      <div className="report-expanded-exports"><button className="report-expanded-excel" onClick={() => runExport("excel")}>Excel</button><button className="report-expanded-pdf" onClick={() => runExport("pdf")}>PDF</button></div>
    </div>}
    <div className="report-normal-toolbar other-reports-header">
      <button className="other-reports-btn" onClick={back}>← Back</button>
      <div className="other-reports-actions"><button className="other-reports-btn excel" onClick={() => runExport("excel")}>Excel</button><button className="other-reports-btn primary" onClick={() => runExport("pdf")}>PDF</button>{renderReportExpandButton("custom-report", "Expand custom report")}</div>
    </div>
    <div style={cardStyle} className="other-report-detail">
      <div className="other-reports-header"><div><input className="other-report-title-input" aria-label="Report title" value={report.title} onChange={(event) => updateReport(report.id, { title: event.target.value })} onBlur={(event) => { const title = event.target.value.trim(); if (!title) { reload(); return; } request(`/custom-reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ title }) }).catch((cause) => { setError(cause.message); reload(); }); }} maxLength={120} /><p>Editable report · {report.rows?.length || 0} rows</p></div><label className="other-report-date">Report date<input type="date" value={report.date} onChange={(event) => { const date = event.target.value; updateReport(report.id, { date }); request(`/custom-reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ date }) }).catch((cause) => { setError(cause.message); reload(); }); }} /></label></div>
      {error && <p className="other-reports-error" role="alert">{error}</p>}
      <div className="other-report-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all columns" aria-label="Search report" /><select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} aria-label="Filter city"><option value="">All cities</option>{cities.map((city) => <option key={city}>{city}</option>)}</select><select value={remarkFilter} onChange={(event) => setRemarkFilter(event.target.value)} aria-label="Filter remarks"><option value="">All remarks</option>{REMARKS.slice(0, -1).map((item) => <option key={item}>{item}</option>)}</select><button className="other-reports-btn" onClick={() => { setSearch(""); setCityFilter(""); setRemarkFilter(""); }}>Clear</button><button className="other-reports-btn" onClick={reload} disabled={loading}>↻ Refresh</button></div>
      <div className="other-reports-actions other-report-add-actions"><button className="other-reports-btn primary" onClick={() => addRow({ name: "", number: "", city: "", institute: "", remarks: "" })} disabled={busy}>＋ Add Row</button><button className="other-reports-btn" onClick={() => setQuickOpen((value) => !value)}>＋ Quick Add</button></div>
      {quickOpen && <form className="other-report-quick" onSubmit={(event) => { event.preventDefault(); if (quickText.trim()) addRow(parseQuickContact(quickText)); }}><label>Paste contact details<textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder={"Hassan Saif\nCity: Karachi\nCompany name: Merchant Navy\nWhatsApp number: +923052192103"} /></label><button className="other-reports-btn primary" disabled={!quickText.trim() || busy}>Parse and Add</button></form>}
      <div className="table-scroll other-report-table-wrap"><table className="other-report-table"><thead><tr className="other-report-merged"><th colSpan={5}>{report.title} · {report.date}</th><th aria-label="Actions" /></tr><tr>{COLUMNS.map(([, label]) => <th key={label}>{label}</th>)}<th>Action</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}>{COLUMNS.map(([key]) => <td key={key}>{key === "remarks" ? <div className="other-report-remark"><select value={REMARKS.includes(row.remarks) ? row.remarks : row.remarks ? "Other" : ""} onChange={(event) => { const value = event.target.value === "Other" ? "Other" : event.target.value; updateRow(row.id, { remarks: value }); saveRow(row.id, { remarks: value }); }} aria-label="Remarks option"><option value="">Select remarks</option>{REMARKS.map((value) => <option key={value}>{value}</option>)}</select>{row.remarks && !REMARKS.slice(0, -1).includes(row.remarks) && <input value={row.remarks === "Other" ? "" : row.remarks} placeholder="Custom remark" onChange={(event) => updateRow(row.id, { remarks: event.target.value || "Other" })} onBlur={(event) => saveRow(row.id, { remarks: event.target.value || "Other" })} aria-label="Custom remark" />}</div> : <input value={row[key] || ""} onChange={(event) => updateRow(row.id, { [key]: event.target.value })} onBlur={(event) => saveRow(row.id, { [key]: event.target.value })} aria-label={key} />}</td>)}<td><button className="other-report-delete" onClick={() => removeRow(row.id)} title="Delete row" aria-label="Delete row">×</button></td></tr>)}</tbody></table>{!filtered.length && <div className="other-reports-empty">No rows match the current filters.</div>}</div>
    </div>
  </div>;
}

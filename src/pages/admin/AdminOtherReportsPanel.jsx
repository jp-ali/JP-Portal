import React, { useMemo, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { request } from "../../services/authApi.js";
import { parseQuickContact } from "../../domain/parseQuickContact.js";
import { blankRow, columnsFromHeadings, parseCustomReportText, reportColumns, rowValue } from "../../domain/customReportSchema.js";
import CustomReportTable from "./CustomReportTable.jsx";
import { exportCustomReportExcel, exportCustomReportPDF } from "../../services/customReportExports.js";

const REMARKS = ["Contacted", "Contacted but sample didn't receive", "Didn't contact", "Sample received", "Other"];
const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (part) => parts.find((item) => item.type === part)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export default function AdminOtherReportsPanel({ mode, reports, setReports, selectedId, setSelectedId, loading, loadError, reload, onOrigin }) {
  const { adminView, cardStyle, expandedReportKey, renderReportExpandButton, reportViewClass, setAdminView, setExpandedReportKey, openVerificationCalls, marketersList = [] } = usePortalContext();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [headings, setHeadings] = useState("Name, Number, City, Institute, Remarks");
  const [includeMarketers, setIncludeMarketers] = useState(false);
  const [dateRange, setDateRange] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [remarkFilter, setRemarkFilter] = useState("");
  const [marketerFilter, setMarketerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const report = reports.find((item) => item.id === selectedId);
  const columns = reportColumns(report);
  const detail = adminView === "custom-report";
  const back = () => { setSelectedId(""); setAdminView(mode === "verification" ? "verification-reports" : "other-reports"); };
  const updateReport = (id, changes) => setReports((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  const updateRow = (rowId, changes) => updateReport(report.id, { rows: (report.rows || []).map((row) => row.id === rowId ? { ...row, ...changes } : row) });
  const updateDateGroup = (ids, date) => updateReport(report.id, { rows: (report.rows || []).map((row) => ids.includes(row.id) ? { ...row, date } : row) });
  const saveDateGroup = async (ids, date) => {
    try { await Promise.all(ids.map((id) => request(`/custom-reports/${report.id}/rows/${id}`, { method: "PATCH", body: JSON.stringify({ date }) }))); setError(""); }
    catch (cause) { setError(cause.message); reload(); }
  };
  const saveRow = async (rowId, changes) => {
    try { await request(`/custom-reports/${report.id}/rows/${rowId}`, { method: "PATCH", body: JSON.stringify(changes) }); setError(""); }
    catch (cause) { setError(cause.message); reload(); }
  };
  const createReport = async (event) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    const customColumns = columnsFromHeadings(headings);
    if (!customColumns.length) { setError("Add at least one heading besides Date."); return; }
    setBusy(true); setError("");
    try {
      const { report: created } = await request("/custom-reports", { method: "POST", body: JSON.stringify({ title: title.trim(), date: today(), columns: customColumns, options: { includeMarketers, dateRange } }) });
      setReports((current) => [...current, created]); setTitle(""); setAdding(false); onOrigin("other"); setSelectedId(created.id); setAdminView("custom-report");
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  const addRow = async (row) => {
    setBusy(true); setError("");
    try {
      const { row: created } = await request(`/custom-reports/${report.id}/rows`, { method: "POST", body: JSON.stringify({ ...blankRow(report), ...row }) });
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
    const date = row.date || report.date;
    return (!q || columns.some((column) => String(rowValue(row, column, report)).toLowerCase().includes(q)))
      && (!cityFilter || row.city === cityFilter)
      && (!remarkFilter || row.remarks === remarkFilter)
      && (!marketerFilter || row.marketer === marketerFilter)
      && (!fromDate || date >= fromDate)
      && (!toDate || date <= toDate);
  }).sort((a, b) => String(a.date || report.date).localeCompare(String(b.date || report.date))), [report, search, cityFilter, remarkFilter, marketerFilter, fromDate, toDate]);
  const cities = [...new Set((report?.rows || []).map((row) => row.city).filter(Boolean))].sort();
  const runExport = async (kind) => {
    try { if (kind === "excel") exportCustomReportExcel(report, filtered, marketersList); else await exportCustomReportPDF(report, filtered, marketersList); setError(""); }
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
      <label>Report name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter report name" maxLength={120} required /></label>
      <label>Headings (comma or line separated)<textarea value={headings} onChange={(event) => setHeadings(event.target.value)} rows={3} /></label>
      <div className="other-report-create-options"><span>Add report options:</span><label><input type="checkbox" checked={includeMarketers} onChange={(event) => setIncludeMarketers(event.target.checked)} /> All Marketers</label><label><input type="checkbox" checked={dateRange} onChange={(event) => setDateRange(event.target.checked)} /> Date Range</label><small>Date is included automatically.</small></div>
      <button className="other-reports-btn primary" disabled={busy || !title.trim()}>Create Report</button>
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
      <div className="other-report-filters"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all columns" aria-label="Search report" />{columns.some((column) => column.key === "city") && <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} aria-label="Filter city"><option value="">All cities</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>}{columns.some((column) => column.key === "remarks") && <select value={remarkFilter} onChange={(event) => setRemarkFilter(event.target.value)} aria-label="Filter remarks"><option value="">All remarks</option>{REMARKS.slice(0, -1).map((item) => <option key={item}>{item}</option>)}</select>}{report.options?.includeMarketers && <select value={marketerFilter} onChange={(event) => setMarketerFilter(event.target.value)} aria-label="Filter marketer"><option value="">All Marketers</option>{marketersList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}{report.options?.dateRange && <><label>From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></>}<button className="other-reports-btn" onClick={() => { setSearch(""); setCityFilter(""); setRemarkFilter(""); setMarketerFilter(""); setFromDate(""); setToDate(""); }}>Clear</button><button className="other-reports-btn" onClick={reload} disabled={loading}>↻ Refresh</button></div>
      <div className="other-reports-actions other-report-add-actions"><button className="other-reports-btn primary" onClick={() => addRow(blankRow(report))} disabled={busy}>＋ Add Row</button><button className="other-reports-btn" onClick={() => setQuickOpen((value) => !value)}>＋ Quick Add</button></div>
      {quickOpen && <form className="other-report-quick" onSubmit={(event) => { event.preventDefault(); if (quickText.trim()) addRow(parseCustomReportText(quickText, columns, parseQuickContact)); }}><label>Paste contact details<textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder={"Hassan Saif\nCity: Karachi\nCompany name: Merchant Navy\nWhatsApp number: +923052192103"} /></label><button className="other-reports-btn primary" disabled={!quickText.trim() || busy}>Parse and Add</button></form>}
      <CustomReportTable report={report} columns={columns} rows={filtered} marketersList={marketersList} updateRow={updateRow} saveRow={saveRow} updateDateGroup={updateDateGroup} saveDateGroup={saveDateGroup} removeRow={removeRow} />
    </div>
  </div>;
}

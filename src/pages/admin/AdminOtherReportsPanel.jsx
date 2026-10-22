import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { request } from "../../services/authApi.js";
import { parseQuickContact } from "../../domain/parseQuickContact.js";
import { blankRow, columnsFromHeadings, parseCustomReportText, reportColumns, rowValue } from "../../domain/customReportSchema.js";
import CustomReportTable from "./CustomReportTable.jsx";
import { exportCustomReportExcel, exportCustomReportPDF } from "../../services/customReportExports.js";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import { isPhoneColumn } from "../../domain/verificationRemarks.js";
import { buildImportPayload, matrixToImportPreview, readImportFile, savedReportToImportPreview } from "../../services/reportImport.js";
import { db } from "../../services/firebase.js";
import { collection, deleteField, doc, getDocs, runTransaction, updateDoc } from "firebase/firestore";

const REMARKS = ["Contacted", "Contacted but sample didn't receive", "Didn't contact", "Sample received", "Other"];
const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (part) => parts.find((item) => item.type === part)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

export default function AdminOtherReportsPanel({ mode, reports, setReports, selectedId, setSelectedId, loading, loadError, reload, onOrigin }) {
  const { adminView, cardStyle, expandedReportKey, fetchMarketers, inputStyle, renderReportExpandButton, reportViewClass, setAdminView, setExpandedReportKey, openVerificationCalls, marketersList = [] } = usePortalContext();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importName, setImportName] = useState("");
  const [importColumns, setImportColumns] = useState([]);
  const [importLabels, setImportLabels] = useState({});
  const [importSourceId, setImportSourceId] = useState("");
  const [parsingImport, setParsingImport] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState("");
  const [selectedReports, setSelectedReports] = useState([]);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [deletedReports, setDeletedReports] = useState([]);
  const [editingReportId, setEditingReportId] = useState("");
  const [title, setTitle] = useState("");
  const [headings, setHeadings] = useState("Name, Number, City, Institute, Remarks");
  const [includeMarketers, setIncludeMarketers] = useState(false);
  const [dateRange, setDateRange] = useState(false);
  const [filterKeys, setFilterKeys] = useState([]);
  const [extraFilterOpen, setExtraFilterOpen] = useState(false);
  const [extraFilter, setExtraFilter] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [remarkFilter, setRemarkFilter] = useState("");
  const [marketerFilter, setMarketerFilter] = useState([]);
  const [extraFilterValues, setExtraFilterValues] = useState({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!actionOpen) { setActionMode(""); setSelectedReports([]); setConfirmRemoval(false); } }, [actionOpen]);
  useEffect(() => { setSearch(""); setCityFilter(""); setRemarkFilter(""); setMarketerFilter([]); setFromDate(""); setToDate(""); setExtraFilterValues({}); if (selectedId) fetchMarketers().catch(() => {}); }, [selectedId, mode]);
  const report = reports.find((item) => item.id === selectedId);
  const columns = reportColumns(report);
  const availableFilters = columnsFromHeadings(headings).filter((column) => !["city", "remarks"].includes(column.key) && column.type !== "date");
  const toggleFilter = (key) => setFilterKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const resetEditor = () => { setAdding(false); setEditingReportId(""); setTitle(""); setHeadings("Name, Number, City, Institute, Remarks"); setIncludeMarketers(false); setDateRange(false); setFilterKeys([]); };
  const resetImport = () => { setImporting(false); setImportPreview(null); setImportName(""); setImportColumns([]); setImportLabels({}); setImportSourceId(""); };
  const showImportPreview = (preview) => {
    setImportPreview(preview);
    setImportColumns(preview.headings.slice(0, 18).map(({ index }) => index));
    setImportLabels(Object.fromEntries(preview.headings.map(({ index, label }) => [index, label])));
  };
  const chooseHeadingRow = (index) => {
    if (!importPreview?.sourceMatrix) return;
    try { showImportPreview({ ...matrixToImportPreview(importPreview.sourceMatrix, importPreview.filename, Number(index)), sheetName: importPreview.sheetName, availableSheets: importPreview.availableSheets }); setError(""); }
    catch (cause) { setError(cause.message); }
  };
  const chooseImportSheet = (name) => {
    const sheet = importPreview?.availableSheets?.find((item) => item.name === name);
    if (!sheet) return;
    try { showImportPreview({ ...matrixToImportPreview(sheet.matrix, importPreview.filename), sheetName: name, availableSheets: importPreview.availableSheets }); setError(""); }
    catch (cause) { setError(cause.message); }
  };
  const chooseExistingReport = (id) => {
    setImportSourceId(id); setError("");
    const source = reports.find((item) => item.id === id);
    if (!source) { setImportPreview(null); return; }
    try {
      const preview = savedReportToImportPreview(source);
      showImportPreview(preview); setImportName(`${source.title} - All Cities`.slice(0, 120));
    } catch (cause) { setImportPreview(null); setError(cause.message); }
  };
  const openImport = () => {
    resetEditor(); setActionOpen(false); setError("");
    setImporting(true); setImportPreview(null); setImportSourceId("");
    importFileRef.current?.click();
  };
  const chooseImportFile = async (file) => {
    if (!file) return;
    setParsingImport(true); setError(""); setImportPreview(null); setImportSourceId("");
    try {
      const preview = await readImportFile(file);
      showImportPreview(preview);
      setImportName(file.name.replace(/\.(pdf|xlsx|xls|xlsm|csv|tsv|ods)$/i, "").replaceAll(/[_-]+/g, " ").slice(0, 120));
    } catch (cause) { setError(cause.message); }
    finally { setParsingImport(false); }
  };
  const submitImport = async (event) => {
    event.preventDefault();
    if (busy || !importPreview) return;
    setBusy(true); setError("");
    try {
      const payload = buildImportPayload({ ...importPreview, headings: importPreview.headings.map((heading) => ({ ...heading, label: importLabels[heading.index]?.trim() || heading.label })) }, importColumns, importName, today());
      const { report: created } = await request("/custom-reports/import", { method: "POST", body: JSON.stringify(payload) });
      setReports((current) => [...current, created]);
      resetImport(); setActionOpen(false); onOrigin("other"); setSelectedId(created.id); setAdminView("custom-report");
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };
  const startEdit = (item) => { setEditingReportId(item.id); setTitle(item.title); setHeadings(reportColumns(item).filter((column) => !["date", "marketer"].includes(column.key)).map((column) => column.label).join(", ")); setIncludeMarketers(!!item.options?.includeMarketers); setDateRange(!!item.options?.dateRange); setFilterKeys(item.options?.filterKeys || []); setAdding(true); setActionMode(""); setActionOpen(false); };
  const loadDeleted = async () => {
    try {
      const result = await request("/custom-reports/deleted");
      setDeletedReports(result.reports || []); setError("");
    } catch (cause) {
      if (!cause.message.includes("(404)")) { setError(cause.message); return; }
      try {
        const snapshot = await getDocs(collection(db, "customReports"));
        setDeletedReports(snapshot.docs.filter((item) => !!item.data().deletedAt).map((item) => ({ id: item.id, ...item.data() })));
        setError("");
      } catch (fallbackError) { setError(fallbackError.message); }
    }
  };
  const changeReportDeletion = async (id, deleted) => {
    try {
      if (deleted) await request(`/custom-reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      else await request(`/custom-reports/${encodeURIComponent(id)}/restore`, { method: "POST" });
    } catch (cause) {
      if (!cause.message.includes("(404)")) throw cause;
      await updateDoc(doc(db, "customReports", id), { deletedAt: deleted ? new Date().toISOString() : deleteField(), updatedAt: new Date().toISOString() });
    }
  };
  const removeSelected = async () => {
    if (!selectedReports.length || busy) return;
    setBusy(true); setError("");
    const removed = [];
    try {
      for (const id of selectedReports) {
        await changeReportDeletion(id, true);
        removed.push(id);
      }
      setReports((current) => current.filter((item) => !removed.includes(item.id)));
      setSelectedReports([]); setConfirmRemoval(false); setActionMode(""); setActionOpen(false);
      await reload();
    } catch (cause) {
      setError(cause.message);
      if (removed.length) setReports((current) => current.filter((item) => !removed.includes(item.id)));
      setSelectedReports((current) => current.filter((id) => !removed.includes(id)));
    } finally { setBusy(false); }
  };
  const restoreReport = async (id) => { setBusy(true); try { await changeReportDeletion(id, false); setDeletedReports((current) => current.filter((item) => item.id !== id)); await reload(); setError(""); } catch (cause) { setError(cause.message); } finally { setBusy(false); } };
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
    catch (cause) {
      const verificationKeys = ["verificationNumber", "verificationRemark", "verificationCustomRemark"];
      if (!cause.message.includes("No row changes provided") || !Object.keys(changes).every((key) => verificationKeys.includes(key))) {
        setError(cause.message); reload(); return;
      }
      try {
        const ref = doc(db, "customReports", report.id);
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists()) throw new Error("Report was not found");
          const rows = snapshot.data().rows || [];
          if (!rows.some((row) => row.id === rowId)) throw new Error("Report row was not found");
          transaction.update(ref, { rows: rows.map((row) => row.id === rowId ? { ...row, ...changes } : row), updatedAt: new Date().toISOString() });
        });
        setError("");
      } catch (fallbackError) { setError(fallbackError.message); reload(); }
    }
  };
  const createReport = async (event) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    let customColumns = columnsFromHeadings(headings);
    if (!customColumns.length) { setError("Add at least one heading besides Date."); return; }
    const oldReport = reports.find((item) => item.id === editingReportId);
    if (oldReport) {
      const oldColumns = reportColumns(oldReport).filter((column) => !["date", "marketer"].includes(column.key));
      const used = new Set(["date", "marketer"]);
      customColumns = customColumns.map((column, index) => {
        const old = oldColumns[index];
        const base = old && !used.has(old.key) ? old.key : column.key;
        let key = base;
        let suffix = 2;
        while (used.has(key)) key = `${base}_${suffix++}`.slice(0, 39);
        used.add(key);
        return { ...column, key };
      });
    }
    const validFilters = filterKeys.filter((key) => ["city", "remarks"].includes(key) || customColumns.some((column) => column.key === key));
    setBusy(true); setError("");
    try {
      const payload = { title: title.trim(), columns: customColumns, options: { includeMarketers, dateRange, hideDate: !!oldReport?.options?.hideDate, filterKeys: validFilters } };
      if (oldReport) {
        await request(`/custom-reports/${oldReport.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        await reload(); resetEditor();
      } else {
        const { report: created } = await request("/custom-reports", { method: "POST", body: JSON.stringify({ ...payload, date: today() }) });
        setReports((current) => [...current, created]); resetEditor(); onOrigin("other"); setSelectedId(created.id); setAdminView("custom-report");
      }
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
    const q = search.trim().toLowerCase();
    const date = row.date || report.date;
    const marketerName = marketersList.find((item) => [item.id, item.email, item.name].some((value) => value && String(value).toLowerCase() === String(row.marketer || "").toLowerCase()))?.name || "";
    return (!q || columns.some((column) => String(rowValue(row, column, report)).toLowerCase().includes(q)) || marketerName.toLowerCase().includes(q) || (mode === "verification" && [row.verificationNumber, row.verificationRemark, row.verificationCustomRemark].some((value) => String(value || "").toLowerCase().includes(q))))
      && (!cityFilter || row.city === cityFilter)
      && (!remarkFilter || row.remarks === remarkFilter)
      && (!marketerFilter.length || marketerFilter.some((id) => { const marketer = marketersList.find((item) => item.id === id); return [id, marketer?.email, marketer?.name].some((value) => value && String(value).toLowerCase() === String(row.marketer || "").toLowerCase()); }))
      && (!fromDate || date >= fromDate)
      && (!toDate || date <= toDate)
      && Object.entries(extraFilterValues).every(([key, value]) => !value || String(row[key] || "") === value);
  }).sort((a, b) => String(a.date || report.date).localeCompare(String(b.date || report.date))), [report, mode, search, cityFilter, remarkFilter, marketerFilter, marketersList, fromDate, toDate, extraFilterValues]);
  const cities = [...new Set((report?.rows || []).map((row) => row.city).filter(Boolean))].sort();
  const importHeadings = importPreview?.headings.map((heading) => ({ ...heading, label: importLabels[heading.index]?.trim() || heading.label })) || [];
  const importCityHeading = importHeadings.find(({ label }) => /^city$/i.test(label.trim()));
  const importCities = importCityHeading ? [...new Set(importPreview.rows.map((row) => String(row[importCityHeading.index] || "").trim()).filter(Boolean))] : [];
  const runExport = async (kind) => {
    const verificationMode = mode === "verification";
    let exportReport = report;
    let exportRows = filtered;
    if (verificationMode) {
      const groups = new Map();
      filtered.forEach((row) => {
        const identity = String(row.marketer || "").trim();
        const marketer = marketersList.find((item) => [item.id, item.email, item.name].some((value) => value && String(value).toLowerCase() === identity.toLowerCase()));
        const key = marketer?.id || identity || "general";
        if (!groups.has(key)) groups.set(key, { name: marketer?.name || identity || "General", rows: [] });
        groups.get(key).rows.push(row);
      });
      exportRows = [...groups.entries()].flatMap(([key, person], personIndex) => person.rows.map((row, rowIndex) => ({
        ...row,
        date: row.date || report.date,
        verificationGroup: key,
        verificationGroupSr: personIndex + 1,
        verificationMarketerName: person.name,
        verificationSerial: rowIndex + 1,
        verificationRemarksText: row.verificationRemark === "Others" ? row.verificationCustomRemark || "Others" : row.verificationRemark || ""
      })));
      exportReport = { ...report, verificationLayout: true, columns: [
        { key: "verificationGroupSr", label: "Sr.", type: "text" },
        { key: "verificationMarketerName", label: "Marketer Name", type: "text" },
        { key: "date", label: "Date", type: "date" },
        { key: "verificationSerial", label: "Sr#", type: "text" },
        ...columns.filter((column) => column.key !== "date" && column.type !== "marketer").map((column) => column.type === "remarks" ? { ...column, label: "Report Remarks" } : column),
        ...(!columns.some((column) => column.type === "text" && isPhoneColumn(column)) ? [{ key: "verificationNumber", label: "Number", type: "text" }] : []),
        { key: "verificationRemarksText", label: "Remarks", type: "remarks" }
      ] };
    }
    try { if (kind === "excel") await exportCustomReportExcel(exportReport, exportRows, marketersList); else await exportCustomReportPDF(exportReport, exportRows, marketersList); setError(""); }
    catch (cause) { setError(cause.message); }
  };

  if (!detail) return <div style={cardStyle} className="other-reports-section">
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back" onClick={() => setAdminView("home")}>← Back</button></div>
    <div className="other-reports-header">
      <div><span className="other-reports-eyebrow">REPORT WORKSPACE</span><h2>{mode === "verification" ? "Verification" : "Other Reports"}</h2><p>{mode === "verification" ? "Review school visits and keep every follow-up in one place." : "A clean space for the reports you create and manage."}</p></div>
      <div className="other-reports-actions">
        {mode !== "verification" && <><button className="other-reports-btn primary" aria-expanded={actionOpen} onClick={() => setActionOpen((value) => !value)}>Action ▾</button><button className="other-reports-btn excel" onClick={openImport}>Import File</button></>}
      </div>
    </div>
    {mode !== "verification" && <input ref={importFileRef} type="file" accept=".pdf,.xlsx,.xls,.xlsm,.csv,.tsv,.ods" className="other-report-import-hidden" aria-label="Choose report file" onChange={(event) => { chooseImportFile(event.target.files?.[0]); event.target.value = ""; }} />}
    {actionOpen && mode !== "verification" && <div className="other-report-action-menu">
      <button className="other-reports-btn" onClick={() => { resetEditor(); setAdding(true); setActionMode(""); }}>＋ Add</button>
      <button className="other-reports-btn" onClick={() => { resetEditor(); setActionMode("remove"); setSelectedReports([]); setConfirmRemoval(false); }}>Remove</button>
      <button className="other-reports-btn" onClick={() => { resetEditor(); setActionMode("old"); loadDeleted(); }}>Old Reports</button>
      <button className="other-reports-btn" onClick={() => { resetEditor(); setActionMode("edit"); }}>Edit</button>
    </div>}
    {actionMode === "remove" && <div className="other-report-selection"><span>{confirmRemoval ? `Remove ${selectedReports.length} selected report(s)? You can restore them from Old Reports.` : "Select reports to remove."}</span><button className="other-reports-btn primary" disabled={!selectedReports.length || busy} onClick={() => confirmRemoval ? removeSelected() : setConfirmRemoval(true)}>{busy ? "Removing…" : confirmRemoval ? "Confirm Remove" : `Remove Selected (${selectedReports.length})`}</button><button className="other-reports-btn" onClick={() => { setActionMode(""); setSelectedReports([]); setConfirmRemoval(false); }}>Cancel</button></div>}
    {actionMode === "edit" && <div className="other-report-selection"><span>Select a report to edit its name, headings and options.</span><button className="other-reports-btn" onClick={() => setActionMode("")}>Cancel</button></div>}
    {actionMode === "old" && <div className="other-report-old"><h3>Old Reports</h3>{deletedReports.length ? deletedReports.map((item) => <div key={item.id}><strong>{item.title}</strong><button className="other-reports-btn primary" disabled={busy} onClick={() => restoreReport(item.id)}>Restore</button></div>) : <p>No deleted reports.</p>}</div>}
    <div className="other-reports-overview"><span className="other-reports-overview-icon" aria-hidden="true">▦</span><div><strong>{mode === "verification" ? reports.length + 1 : reports.length}</strong><span>{mode === "verification" ? "Available reports" : "Custom reports"}</span></div><p>{mode === "verification" ? "School Visits is ready whenever you need it." : "Create a report and start adding contacts in seconds."}</p></div>
    {importing && mode !== "verification" && <form className="other-report-import" onSubmit={submitImport}>
      <div className="other-report-import-head"><div><h3>Import a report</h3><p>Upload a PDF, Excel, CSV, TSV or ODS file. Review its data and headings before saving.</p></div><button type="button" className="other-reports-btn" onClick={resetImport}>Cancel</button></div>
      <button type="button" className="other-reports-btn other-report-import-choose" onClick={() => importFileRef.current?.click()}>Choose report file</button>
      {reports.some((item) => item.rows?.length) && <label className="other-report-import-file">Or use all rows from a saved report<select value={importSourceId} onChange={(event) => chooseExistingReport(event.target.value)}><option value="">Choose a saved report</option>{reports.filter((item) => item.rows?.length).map((item) => <option key={item.id} value={item.id}>{item.title} ({item.rows.length} rows)</option>)}</select></label>}
      {parsingImport && <p role="status">Reading file…</p>}
      {importPreview && <><label className="other-report-import-name">Report name<input value={importName} onChange={(event) => setImportName(event.target.value)} maxLength={120} required /></label>
        {importPreview.availableSheets?.length > 1 && <label className="other-report-import-file">Sheet<select value={importPreview.sheetName} onChange={(event) => chooseImportSheet(event.target.value)}>{importPreview.availableSheets.map(({ name }) => <option key={name} value={name}>{name}</option>)}</select></label>}
        {!importSourceId && /\.(xlsx|xls|xlsm|csv|tsv|ods)$/i.test(importPreview.filename) && <label className="other-report-import-file">Heading row in file<select value={importPreview.headingRow} onChange={(event) => chooseHeadingRow(event.target.value)}>{importPreview.headingChoices.map(({ index, summary }) => <option key={index} value={index}>Row {index + 1}: {summary}</option>)}</select></label>}
        <div className="other-report-import-select"><div><strong>Choose and correct the headings</strong><span>{importColumns.length} of {importPreview.headings.length} headings selected · {importPreview.rows.length} rows found</span></div><div className="other-report-import-checks">{importPreview.headings.map(({ index, label }) => <div className="other-report-import-heading" key={index}><label><input type="checkbox" checked={importColumns.includes(index)} onChange={() => setImportColumns((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} />Column {index + 1}</label><input type="text" value={importLabels[index] ?? label} onChange={(event) => setImportLabels((current) => ({ ...current, [index]: event.target.value }))} aria-label={`Heading for column ${index + 1}`} maxLength={60} /></div>)}</div></div>
        {importCityHeading && <p className={`other-report-import-cities${importCities.length === 1 ? " is-limited" : ""}`}>{importCities.length} cit{importCities.length === 1 ? "y" : "ies"} found: {importCities.slice(0, 8).join(", ")}{importCities.length > 8 ? "…" : ""}. {importCities.length === 1 && !importSourceId ? "This file contains only that city. Choose the complete Excel file or a saved report above to include all cities." : "Every city in the selected source will be imported."}</p>}
        <div className="other-report-import-sample"><strong>Preview</strong><div className="table-scroll"><table><thead><tr>{importHeadings.filter(({ index }) => importColumns.includes(index)).map(({ index, label }) => <th key={index}>{label}</th>)}</tr></thead><tbody>{importPreview.rows.slice(0, 5).map((row, index) => <tr key={index}>{importHeadings.filter((item) => importColumns.includes(item.index)).map((item) => <td key={item.index}>{row[item.index] || "—"}</td>)}</tr>)}</tbody></table></div></div>
        <button type="submit" className="other-reports-btn primary" disabled={busy || !importName.trim() || !importColumns.length}>{busy ? "Importing…" : "Create Imported Report"}</button>
      </>}
    </form>}
    {adding && mode !== "verification" && <form className="other-reports-add" onSubmit={createReport}>
      <label>Report name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Enter report name" maxLength={120} required /></label>
      <label>Headings (comma or line separated)<textarea value={headings} onChange={(event) => setHeadings(event.target.value)} rows={3} /></label>
      <div className="other-report-create-options"><span>Add report options:</span><label><input type="checkbox" checked={includeMarketers} onChange={(event) => setIncludeMarketers(event.target.checked)} /> All Marketers</label><label><input type="checkbox" checked={dateRange} onChange={(event) => setDateRange(event.target.checked)} /> Date Range</label><label><input type="checkbox" checked={filterKeys.includes("city")} onChange={() => toggleFilter("city")} /> City</label><label><input type="checkbox" checked={filterKeys.includes("remarks")} onChange={() => toggleFilter("remarks")} /> Remarks</label><button type="button" className="other-reports-btn" onClick={() => setExtraFilterOpen((value) => !value)}>＋ Add Filter</button>{extraFilterOpen && <><select value={extraFilter} onChange={(event) => setExtraFilter(event.target.value)} aria-label="Choose extra filter"><option value="">Choose heading</option>{availableFilters.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select><button type="button" className="other-reports-btn" disabled={!extraFilter} onClick={() => { if (extraFilter && !filterKeys.includes(extraFilter)) setFilterKeys((current) => [...current, extraFilter]); setExtraFilter(""); }}>Add</button></>}{filterKeys.filter((key) => !["city", "remarks"].includes(key)).map((key) => <button type="button" className="other-report-filter-chip" key={key} onClick={() => toggleFilter(key)}>{key.replaceAll("_", " ")} ×</button>)}<small>Date is included automatically.</small></div>
      <div className="other-reports-actions"><button className="other-reports-btn primary" disabled={busy || !title.trim()}>{editingReportId ? "Save Changes" : "Create Report"}</button><button type="button" className="other-reports-btn" onClick={resetEditor}>Cancel</button></div>
    </form>}
    {error && <p className="other-reports-error" role="alert">{error}</p>}
    {loadError && <p className="other-reports-error" role="alert">{loadError} <button className="other-reports-btn" onClick={reload}>Retry</button></p>}
    {loading && <p>Loading reports…</p>}
    <div className="other-reports-list-heading"><h3>{mode === "verification" ? "Your verification reports" : "Your reports"}</h3><span>{mode === "verification" ? reports.length + 1 : reports.length} total</span></div>
    <div className="square-grid other-reports-grid">
      {mode === "verification" && <button type="button" className="square-card other-report-card other-report-card-featured" onClick={openVerificationCalls}>
        <span className="other-report-icon">🏫</span><span className="other-report-card-type">DEFAULT REPORT</span><h3>School Visits</h3><p>Verification calls and visit remarks</p><span className="other-report-card-arrow" aria-hidden="true">↗</span>
      </button>}
      {reports.map((item, index) => <button type="button" key={item.id} className={`square-card other-report-card${selectedReports.includes(item.id) ? " is-selected" : ""}`} style={{ "--report-order": index + 1 }} onClick={() => { if (actionMode === "remove") { setConfirmRemoval(false); setSelectedReports((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]); return; } if (actionMode === "edit") { startEdit(item); return; } onOrigin(mode); setSelectedId(item.id); setAdminView("custom-report"); }}>
        {actionMode === "remove" && <span className="other-report-checkbox" aria-hidden="true">{selectedReports.includes(item.id) ? "☑" : "☐"}</span>}<span className="other-report-icon">📋</span><span className="other-report-card-type">CUSTOM REPORT</span><h3>{item.title}</h3><span className="other-report-card-arrow" aria-hidden="true">↗</span>
      </button>)}
    </div>
    {!loading && !reports.length && mode !== "verification" && <p className="other-reports-empty">No custom reports yet. Open Action and select Add to create one.</p>}
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
      <div className="other-reports-header">{mode === "verification" ? <h2>{report.title}</h2> : <input className="other-report-title-input" aria-label="Report title" value={report.title} onChange={(event) => updateReport(report.id, { title: event.target.value })} onBlur={(event) => { const title = event.target.value.trim(); if (!title) { reload(); return; } request(`/custom-reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ title }) }).catch((cause) => { setError(cause.message); reload(); }); }} maxLength={120} />}</div>
      {error && <p className="other-reports-error" role="alert">{error}</p>}
      <div className="other-report-filter-bar">
        <label className="other-report-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, city or any detail" aria-label="Search all report details" /></label>
        {(mode === "verification" || report.options?.dateRange) && <><label className="other-report-date-field">From Date<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="other-report-date-field">To Date<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></>}
        <button className="other-reports-btn" onClick={() => { setSearch(""); setCityFilter(""); setRemarkFilter(""); setMarketerFilter([]); setFromDate(""); setToDate(""); setExtraFilterValues({}); }}>Clear</button>
        {(mode === "verification" || report.options?.includeMarketers || report.options?.filterKeys?.length > 0) && <div className="other-report-addon-controls">
        {(mode === "verification" || report.options?.includeMarketers) && <MarketerMultiSelect marketers={marketersList} selected={marketerFilter} onChange={setMarketerFilter} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" />}
        {report.options?.filterKeys?.includes("city") && <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} aria-label="Filter city"><option value="">All cities</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>}
        {report.options?.filterKeys?.includes("remarks") && <select value={remarkFilter} onChange={(event) => setRemarkFilter(event.target.value)} aria-label="Filter remarks"><option value="">All remarks</option>{REMARKS.slice(0, -1).map((item) => <option key={item}>{item}</option>)}</select>}
        {(report.options?.filterKeys || []).filter((key) => !["city", "remarks"].includes(key)).map((key) => { const column = columns.find((item) => item.key === key); if (!column) return null; const values = [...new Set((report.rows || []).map((row) => row[key]).filter(Boolean))].sort(); return <select key={key} value={extraFilterValues[key] || ""} onChange={(event) => setExtraFilterValues((current) => ({ ...current, [key]: event.target.value }))} aria-label={`Filter ${column.label}`}><option value="">All {column.label}</option>{values.map((value) => <option key={value}>{value}</option>)}</select>; })}
        </div>}
        <button className="other-reports-btn other-report-refresh" title="Refresh report" aria-label="Refresh report" onClick={reload} disabled={loading}>↻</button>
      </div>
      {mode !== "verification" && <><div className="other-reports-actions other-report-add-actions"><button className="other-reports-btn primary" onClick={() => addRow(blankRow(report))} disabled={busy}>＋ Add Row</button><button className="other-reports-btn" onClick={() => setQuickOpen((value) => !value)}>＋ Quick Add</button></div>
      {quickOpen && <form className="other-report-quick" onSubmit={(event) => { event.preventDefault(); if (quickText.trim()) addRow(parseCustomReportText(quickText, columns, parseQuickContact)); }}><label>Paste contact details<textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder={"Hassan Saif\nCity: Karachi\nCompany name: Merchant Navy\nWhatsApp number: +923052192103"} /></label><button className="other-reports-btn primary" disabled={!quickText.trim() || busy}>Parse and Add</button></form>}</>}
      <CustomReportTable report={report} columns={columns} rows={filtered} marketersList={marketersList} updateRow={updateRow} saveRow={saveRow} updateDateGroup={updateDateGroup} saveDateGroup={saveDateGroup} removeRow={removeRow} verificationMode={mode === "verification"} />
    </div>
  </div>;
}

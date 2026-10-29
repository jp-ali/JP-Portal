import React, { useMemo, useState } from "react";
import { readImportFile } from "../services/reportImport.js";
import { importMarketerVisits } from "../services/visitImportApi.js";
import { rowsForVisitImport, suggestVisitColumns, validVisitDate, visitImportFields } from "../services/visitImport.js";

export default function MarketerVisitImport({ marketer, onClose, onImported }) {
  const [preview, setPreview] = useState(null);
  const [columns, setColumns] = useState({});
  const [rows, setRows] = useState(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completedRows, setCompletedRows] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const mappedRows = useMemo(() => rows || (preview ? rowsForVisitImport(preview, columns) : []), [preview, columns, rows]);
  const invalid = mappedRows.filter((row) => row.error).length;

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReading(true); setError(""); setResult(""); setPreview(null); setRows(null);
    try {
      const parsed = await readImportFile(file);
      setPreview(parsed);
      setColumns(suggestVisitColumns(parsed.headings));
    } catch (cause) { setError(cause.message || "Could not read this file."); }
    finally { setReading(false); }
  };
  const updateRow = (index, key, value) => {
    setRows((current) => (current || mappedRows).map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next = { ...row, [key]: value };
      next.error = !validVisitDate(next.date) ? "Valid visit date required" : !next.schoolName.trim() ? "School required" : "";
      return next;
    }));
  };
  const save = async () => {
    if (!mappedRows.length || invalid) return;
    setSaving(true); setCompletedRows(0); setError(""); setResult("");
    let created = 0; let skipped = 0;
    try {
      for (let offset = 0; offset < mappedRows.length; offset += 100) {
        const chunk = mappedRows.slice(offset, offset + 100).map(({ error: _error, sourceRow: _sourceRow, ...row }) => row);
        const response = await importMarketerVisits(marketer.id, chunk);
        created += response.created;
        skipped += response.skipped;
        setCompletedRows(Math.min(offset + chunk.length, mappedRows.length));
      }
      setResult(`${created} visit(s) added to ${marketer.name || "this marketer"}. ${skipped} duplicate(s) skipped.`);
      await onImported?.();
    } catch (cause) { setError(`${cause.message || "Import failed."} ${created ? `${created} visit(s) were already saved. You can retry; duplicates will be skipped.` : ""}`); }
    finally { setSaving(false); }
  };

  return <div className="marketer-visit-import-backdrop" role="presentation">
    <section className="marketer-visit-import" role="dialog" aria-modal="true" aria-label={`Import visits for ${marketer.name}`}>
      <div className="marketer-visit-import-header"><div><h3>Import Visits</h3><p>{marketer.name} · Upload Excel, PDF or a picture of the visit report.</p></div><button type="button" onClick={onClose} aria-label="Close import">×</button></div>
      <label className="marketer-visit-import-file">Choose report file <input type="file" accept=".xlsx,.xls,.xlsm,.csv,.tsv,.ods,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,.heic,.heif,.avif,image/*" onChange={chooseFile} disabled={reading || saving} /></label>
      {reading && <p>Reading file and finding visits…</p>}
      {preview && <>
        <p className="marketer-visit-import-hint">Match the headings below, then check dates and schools before importing. Empty or unreadable dates must be corrected.</p>
        <div className="marketer-visit-import-mapping">{visitImportFields.map((field) => <label key={field.key}>{field.label}{field.required ? " *" : ""}<select value={columns[field.key] ?? ""} onChange={(event) => { setRows(null); setColumns((current) => ({ ...current, [field.key]: event.target.value })); }}><option value="">Choose heading</option>{preview.headings.map(({ index, label }) => <option key={index} value={index}>{label}</option>)}</select></label>)}</div>
        <p><strong>{mappedRows.length}</strong> visit rows found{invalid ? ` · ${invalid} need correction` : ""}.</p>
        <div className="marketer-visit-import-table-wrap"><table><thead><tr><th>Row</th>{visitImportFields.map((field) => <th key={field.key}>{field.label}</th>)}<th>Status</th></tr></thead><tbody>{mappedRows.map((row, index) => <tr key={index}><td>{row.sourceRow}</td>{visitImportFields.map((field) => <td key={field.key}><input aria-label={`${field.label} row ${row.sourceRow}`} type={field.key === "date" ? "date" : "text"} maxLength={field.key === "notes" ? 2000 : 200} value={row[field.key]} onChange={(event) => updateRow(index, field.key, event.target.value)} /></td>)}<td className={row.error ? "invalid" : "valid"}>{row.error || "Ready"}</td></tr>)}</tbody></table></div>
      </>}
      {error && <p className="marketer-visit-import-error" role="alert">{error}</p>}
      {saving && <p role="status">Importing {completedRows} of {mappedRows.length} visits...</p>}
      {result && <p className="marketer-visit-import-success" role="status">{result}</p>}
      <div className="marketer-visit-import-actions"><button type="button" onClick={onClose}>Close</button><button type="button" onClick={save} disabled={!preview || !mappedRows.length || invalid > 0 || saving || reading || result}>{saving ? "Importing…" : `Add ${mappedRows.length} visits`}</button></div>
    </section>
  </div>;
}

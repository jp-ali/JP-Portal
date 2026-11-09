import React, { useEffect, useMemo, useState } from "react";
import { request } from "../../services/authApi.js";
import { compressCanvasToTargetDataUrl } from "../../services/imageCompression.js";
import { checkTrainerCompressedPhoto, checkTrainerPhotoFile, TRAINER_EXPENSE_PHOTO_KB } from "../../services/trainerPhotoChecks.js";
import { downloadTrainerPhotoArchive } from "../../services/trainerPhotoArchive.js";
import { downloadTrainerExcel, downloadTrainerPDF } from "../../services/trainerReportExports.js";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";

const categories = ["Travel", "Food", "Accommodation", "Training Materials", "Other"];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const money = (amount) => `Rs. ${Number(amount || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const initial = () => ({ date: today(), category: "Travel", otherCategory: "", amount: "", description: "", proof: "" });

async function photoData(file) {
  checkTrainerPhotoFile(file);
  let image = file;
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type)) {
    const { default: convert } = await import("heic2any");
    const result = await convert({ blob: file, toType: "image/jpeg" });
    image = Array.isArray(result) ? result[0] : result;
  }
  const url = URL.createObjectURL(image);
  try {
    const picture = new Image();
    await new Promise((resolve, reject) => { picture.onload = resolve; picture.onerror = () => reject(new Error("Proof photo could not be opened.")); picture.src = url; });
    const scale = Math.min(1, 1200 / Math.max(picture.naturalWidth, picture.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
    canvas.getContext("2d").drawImage(picture, 0, 0, canvas.width, canvas.height);
    return checkTrainerCompressedPhoto(compressCanvasToTargetDataUrl(canvas, TRAINER_EXPENSE_PHOTO_KB * 1024, 800, 0.5), TRAINER_EXPENSE_PHOTO_KB, "Expense proof");
  } finally { URL.revokeObjectURL(url); }
}

export default function TrainerExpensePanel({ mode, trainers = [], onBack, onNavigate, inputStyle, cardStyle, btnPrimary }) {
  const adding = mode === "add";
  const admin = mode === "today" || mode === "report";
  const [form, setForm] = useState(initial);
  const [expenses, setExpenses] = useState([]);
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [trainerIds, setTrainerIds] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [proofOptionsOpen, setProofOptionsOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openProof, setOpenProof] = useState("");
  const [selectedProofIds, setSelectedProofIds] = useState([]);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = async () => {
    setBusy(true); setError("");
    try {
      const query = mode === "today" ? `?from=${today()}&to=${today()}` : "";
      setExpenses((await request(`/trainers/expenses${query}`)).expenses || []);
    } catch (cause) { setError(cause.message || "Expenses could not be loaded."); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (!adding) load(); }, [adding, mode]);
  useEffect(() => {
    if (!expanded && !openProof) return undefined;
    const escape = (event) => { if (event.key === "Escape") { setExpanded(false); setOpenProof(""); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [expanded, openProof]);
  const filtered = useMemo(() => expenses.filter((expense) => {
    if (mode === "today" && expense.date !== today()) return false;
    if (mode === "report" && ((from && expense.date < from) || (to && expense.date > to))) return false;
    if (!admin && month && !expense.date.startsWith(month)) return false;
    if (admin && trainerIds.length && !trainerIds.includes(expense.trainerId)) return false;
    return !categoryFilter || expense.category === categoryFilter;
  }), [expenses, mode, from, to, month, trainerIds, categoryFilter, admin]);
  const total = filtered.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const proofExpenses = filtered.filter((expense) => expense.proofAvailable);
  const selectedProofs = proofExpenses.filter((expense) => selectedProofIds.includes(expense.id));
  const allProofsSelected = proofExpenses.length > 0 && selectedProofs.length === proofExpenses.length;
  useEffect(() => {
    const available = new Set(proofExpenses.map((expense) => expense.id));
    setSelectedProofIds((current) => current.filter((id) => available.has(id)));
  }, [filtered]);
  const downloadSelectedProofs = async () => {
    setDownloadBusy(true); setError("");
    try { await downloadTrainerPhotoArchive(selectedProofs.map((expense) => ({ type: "expense", id: expense.id, name: expense.category || "Expense", date: expense.date })), "Trainer_Expense_Proofs_Selected.zip"); }
    catch (cause) { setError(cause.message || "Selected proof photos could not be downloaded."); }
    finally { setDownloadBusy(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!form.proof) { setError("Add an expense proof photo before saving."); return; }
    if (form.category === "Other" && !form.otherCategory.trim()) { setError("Write what the Other expense is for."); return; }
    setBusy(true);
    try {
      await request("/trainers/expenses", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }), timeoutMs: 45000 });
      setForm(initial()); setNotice("Expense saved. You can view it in All Expenses.");
    } catch (cause) { setError(cause.message || "Expense could not be saved."); }
    finally { setBusy(false); }
  };
  const chooseProof = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setProofOptionsOpen(false);
    setPhotoBusy(true); setError("");
    try { const proof = await photoData(file); setForm((current) => ({ ...current, proof })); }
    catch (cause) { setError(cause.message || "Proof photo could not be opened."); }
    finally { setPhotoBusy(false); }
  };
  const showProof = async (expense) => {
    setError("");
    try { setOpenProof((await request(`/trainers/expenses/${encodeURIComponent(expense.id)}/proof`)).proof || ""); }
    catch (cause) { setError(cause.message || "Proof could not be opened."); }
  };
  const exportRows = async (format) => {
    setExportBusy(true); setError("");
    try {
      const kind = mode === "today" ? "today-expenses" : admin ? "expenses" : "my-expenses";
      const options = { showTrainer: admin };
      await (format === "excel" ? downloadTrainerExcel(kind, filtered, options) : downloadTrainerPDF(kind, filtered, options));
    } catch (cause) { setError(cause.message || "Expense export failed."); }
    finally { setExportBusy(false); }
  };

  return <div className={`trainer-report trainer-expense-page${expanded ? " admin-report-expanded trainer-expense-expanded" : ""}`}>
    <div className="trainer-toolbar report-normal-toolbar"><button type="button" className="trainer-back" onClick={onBack}>← Back</button><div className="trainer-toolbar-actions">{!adding && <><button type="button" className="trainer-refresh" onClick={load} disabled={busy}>↻ Refresh</button><button type="button" className="report-expanded-excel" onClick={() => exportRows("excel")} disabled={busy || exportBusy}>Excel</button><button type="button" className="report-expanded-pdf" onClick={() => exportRows("pdf")} disabled={busy || exportBusy}>PDF</button><button type="button" className="report-expand-btn" title="Expand report" aria-label="Expand report" onClick={() => setExpanded(true)}>⛶</button></>}{!admin && <button type="button" className="trainer-refresh" onClick={() => onNavigate(adding ? "expenses-all" : "expenses-add")}>{adding ? "All Expenses" : "Add Expense"}</button>}</div></div>
    {expanded && <div className="report-expanded-toolbar"><button type="button" className="report-expanded-back" onClick={() => setExpanded(false)} aria-label="Close expanded report">←</button><div className="report-expanded-exports"><button type="button" className="trainer-refresh" onClick={load} disabled={busy}>↻</button><button type="button" className="report-expanded-excel" onClick={() => exportRows("excel")} disabled={busy || exportBusy}>Excel</button><button type="button" className="report-expanded-pdf" onClick={() => exportRows("pdf")} disabled={busy || exportBusy}>PDF</button></div></div>}
    {error && <div className="trainer-alert error" role="alert">{error}</div>}
    {notice && <div className="trainer-alert" role="status">{notice}</div>}
    <div style={cardStyle}>
      <h3>{adding ? "➕ Add Expense" : mode === "today" ? "🧾 Today Expenses" : admin ? "🧾 Expense Report" : "🧾 All Expenses"}</h3>
      <p>{adding ? "Record your expense with a proof photo. Amounts are in Pakistani rupees." : admin ? "All Trainers · Review expense entries and proof photos." : "Review your saved expenses and totals."}</p>
      {adding ? <form className="trainer-expense-form" onSubmit={submit}>
        <div className="trainer-expense-fields">
          <label>Date *<input style={inputStyle} type="date" required max={today()} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label>Category *<select style={inputStyle} required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value, otherCategory: "" })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          {form.category === "Other" && <label>What is the Other expense? *<input style={inputStyle} required value={form.otherCategory} onChange={(event) => setForm({ ...form, otherCategory: event.target.value })} placeholder="Write expense type" /></label>}
          <label>Amount (Rs.) *<input style={inputStyle} type="number" required min="0.01" max="100000000" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label>
        </div>
        <label>Description *<textarea style={inputStyle} required rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What was this expense for?" /></label>
        <div className="trainer-expense-proof">
          <strong>Proof photo *</strong>
          <small className="trainer-photo-limit">Photo upload automatically compresses to 65 KB or less.</small>
          <button type="button" className="trainer-expense-proof-button" onClick={() => setProofOptionsOpen((value) => !value)} disabled={photoBusy || busy} aria-expanded={proofOptionsOpen}>📷 {photoBusy ? "Opening photo..." : form.proof ? "Change Photo" : "Add Photo"}</button>
          {proofOptionsOpen && <div className="trainer-expense-photo-options">
            <label className="trainer-expense-photo-option">📷 Take Photo<input type="file" accept="image/*" capture="environment" onChange={chooseProof} disabled={photoBusy || busy} /></label>
            <label className="trainer-expense-photo-option">🖼️ Choose from Gallery<input type="file" accept="image/*" onChange={chooseProof} disabled={photoBusy || busy} /></label>
          </div>}
          {form.proof && <button type="button" className="trainer-expense-preview" onClick={() => setOpenProof(form.proof)} aria-label="Open expense proof photo"><img src={form.proof} alt="Expense proof preview" /><span>Tap photo to view or download</span></button>}
        </div>
        <button type="submit" style={btnPrimary} disabled={busy || photoBusy}>{busy ? "Saving..." : "Save Expense"}</button>
      </form> : <>
        <div className="trainer-expense-filters">
          {admin ? <><div className="trainer-expense-trainer-filter"><MarketerMultiSelect marketers={trainers} selected={trainerIds} onChange={setTrainerIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Trainers" itemLabel="Trainer" pluralLabel="Trainers" /></div>{mode === "report" && <><label>From<input style={inputStyle} type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input style={inputStyle} type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></>}</> : <label>Month<input style={inputStyle} type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>}
          <label>Category<select style={inputStyle} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <div className="trainer-expense-total"><small>Total · {filtered.length} expenses</small><strong>{money(total)}</strong></div>
        </div>
        {!!proofExpenses.length && <div className="trainer-photo-selection"><button type="button" onClick={() => setSelectedProofIds(allProofsSelected ? [] : proofExpenses.map((expense) => expense.id))}>{allProofsSelected ? "Clear All" : "Select All Photos"}</button><button type="button" disabled={!selectedProofs.length || downloadBusy} onClick={downloadSelectedProofs}>{downloadBusy ? "Preparing ZIP..." : `Download Selected (${selectedProofs.length})`}</button></div>}
        <div className="trainer-table-wrap"><table className="trainer-report-table"><thead><tr><th>Date</th>{admin && <th>Trainer</th>}<th>Category</th><th>Description</th><th>Amount</th><th>Proof</th></tr></thead><tbody>{filtered.map((expense) => <tr key={expense.id}><td>{expense.date}</td>{admin && <td>{expense.trainerName || trainers.find((trainer) => trainer.id === expense.trainerId)?.name || "—"}</td>}<td>{expense.category === "Other" ? `Other · ${expense.otherCategory || "—"}` : expense.category}</td><td>{expense.description}</td><td className="trainer-expense-amount">{money(expense.amount)}</td><td>{expense.proofAvailable ? <div className="trainer-photo-cell"><label><input type="checkbox" checked={selectedProofIds.includes(expense.id)} onChange={(event) => setSelectedProofIds((current) => event.target.checked ? [...current, expense.id] : current.filter((id) => id !== expense.id))} aria-label={`Select proof photo for ${expense.category} on ${expense.date}`} /> Select</label><button type="button" onClick={() => showProof(expense)}>View proof</button></div> : "—"}</td></tr>)}</tbody></table>{!busy && !filtered.length && <div className="trainer-empty">{expenses.length ? "No expenses match these filters." : "No expenses yet."}</div>}{busy && <div className="trainer-empty">Loading expenses...</div>}</div>
      </>}
    </div>
    {openProof && <div className="trainer-expense-proof-overlay" role="dialog" aria-modal="true" aria-label="Expense proof photo"><div><button type="button" onClick={() => setOpenProof("")}>Close</button><a href={openProof} download={`trainer-expense-proof-${today()}.jpg`}>Download</a><img src={openProof} alt="Expense proof" /></div></div>}
  </div>;
}

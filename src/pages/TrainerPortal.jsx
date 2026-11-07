import React, { useCallback, useEffect, useState } from "react";
import { request } from "../services/authApi.js";
import "../styles/trainer.css";

const tabs = [
  { key: "attendance", label: "Attendance" },
  { key: "weekly", label: "Weekly Action Plan" },
  { key: "daily", label: "Daily Action Plan" }
];
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const monday = () => {
  const date = new Date(`${localDate()}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const initialForm = { name: "", email: "", phone: "", designation: "Trainer", password: "" };
const dateTime = (value) => value ? new Date(value).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }) : "—";

export default function TrainerPortal({ user, onLogout, onBack }) {
  const admin = user.role === "admin";
  const [tab, setTab] = useState(admin ? "trainers" : "attendance");
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState("");
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState("");
  const [plan, setPlan] = useState({ date: localDate(), area: "", purpose: "" });
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "" });

  const loadTrainers = useCallback(async () => {
    if (admin) setTrainers((await request("/trainers")).trainers || []);
  }, [admin]);
  const loadRecords = useCallback(async () => {
    if (!tabs.some((item) => item.key === tab)) return;
    const params = new URLSearchParams();
    if (admin && trainerId) params.set("trainerId", trainerId);
    if (filter.from) params.set("from", filter.from);
    if (filter.to) params.set("to", filter.to);
    setRecords((await request(`/trainers/records/${tab}?${params}`)).records || []);
  }, [admin, trainerId, tab, filter.from, filter.to]);
  useEffect(() => { loadTrainers().catch((cause) => setError(cause.message)); }, [loadTrainers]);
  useEffect(() => { setError(""); setNotice(""); loadRecords().catch((cause) => setError(cause.message)); }, [loadRecords]);
  useEffect(() => { setPlan({ date: tab === "weekly" ? monday() : localDate(), area: "", purpose: "" }); }, [tab]);

  async function saveAccount(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const path = editId ? `/trainers/${editId}` : "/trainers";
      await request(path, { method: editId ? "PATCH" : "POST", body: JSON.stringify(form) });
      setNotice(editId ? "Trainer updated." : "Trainer account created.");
      setForm(initialForm); setEditId(""); await loadTrainers();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function toggleActive(trainer) {
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/trainers/${trainer.id}`, { method: "PATCH", body: JSON.stringify({ active: !trainer.active }) });
      setNotice(trainer.active ? "Trainer deactivated." : "Trainer activated."); await loadTrainers();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  async function saveRecord(payload) {
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/trainers/records/${tab}`, { method: "POST", body: JSON.stringify(payload) });
      setNotice(tab === "attendance" ? "Attendance saved." : "Action plan saved.");
      await loadRecords();
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }
  const selectedTrainer = trainers.find((item) => item.id === trainerId);
  const attendanceToday = records.find((item) => item.date === localDate());
  return <div className="trainer-shell">
    <header className="trainer-header"><div><div className="trainer-brand">JP<span>.</span> JAVED PUBLISHERS</div><h1>{admin ? "Trainer Management" : "Trainer Portal"}</h1><p>{admin ? "Manage trainers and review their reporting" : `${user.name} · ${user.designation || "Trainer"}`}</p></div><div className="trainer-header-actions">{onBack && <button type="button" className="trainer-outline" onClick={onBack}>← Switch to Admin</button>}<button type="button" className="trainer-outline" onClick={onLogout}>Logout</button></div></header>
    <main className="trainer-main">
      <div className="trainer-cards">{admin && <><button type="button" className={tab === "trainers" ? "active" : ""} onClick={() => setTab("trainers")}><strong>Add Trainer</strong><span>Create account</span></button><button type="button" className={tab === "details" ? "active" : ""} onClick={() => setTab("details")}><strong>Trainer Details</strong><span>{trainers.length} trainers</span></button></>}{tabs.map((item) => <button type="button" key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}><strong>{item.label}</strong><span>Open report →</span></button>)}</div>
      {error && <div className="trainer-alert error" role="alert">{error}</div>}{notice && <div className="trainer-alert" role="status">{notice}</div>}
      {admin && tab === "trainers" && <section className="trainer-panel"><h2>{editId ? "Edit Trainer" : "Add Trainer"}</h2><form onSubmit={saveAccount} className="trainer-form"><label>Name<input required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Phone<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Designation<input required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></label><label>Password {editId && <small>(leave blank to keep current)</small>}<input type="password" required={!editId} minLength="8" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label><div className="trainer-form-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : editId ? "Save Changes" : "Create Trainer"}</button>{editId && <button type="button" className="trainer-outline" onClick={() => { setEditId(""); setForm(initialForm); }}>Cancel</button>}</div></form></section>}
      {admin && tab === "details" && <section className="trainer-panel"><h2>Trainer Details</h2><div className="trainer-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Designation</th><th>Status</th><th>Actions</th></tr></thead><tbody>{trainers.map((trainer) => <tr key={trainer.id}><td>{trainer.name}</td><td>{trainer.email}</td><td>{trainer.phone || "—"}</td><td>{trainer.designation}</td><td>{trainer.active ? "Active" : "Inactive"}</td><td><button type="button" onClick={() => { setEditId(trainer.id); setForm({ name: trainer.name, email: trainer.email, phone: trainer.phone || "", designation: trainer.designation, password: "" }); setTab("trainers"); }}>Edit</button> <button type="button" disabled={busy} onClick={() => toggleActive(trainer)}>{trainer.active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table>{!trainers.length && <p>No trainers added yet.</p>}</div></section>}
      {tabs.some((item) => item.key === tab) && <section className="trainer-panel"><div className="trainer-panel-title"><h2>{tabs.find((item) => item.key === tab)?.label}</h2><button type="button" className="trainer-outline" onClick={() => loadRecords().catch((cause) => setError(cause.message))}>Refresh</button></div>
        {admin ? <div className="trainer-filters"><label>Trainer<select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}><option value="">All trainers</option>{trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label><label>From<input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} /></label><label>To<input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} /></label></div> : tab === "attendance" ? <div className="trainer-entry"><p>Today: <strong>{attendanceToday?.status || "Not marked"}</strong>{attendanceToday?.checkInAt && ` · In ${dateTime(attendanceToday.checkInAt)}`}{attendanceToday?.checkOutAt && ` · Out ${dateTime(attendanceToday.checkOutAt)}`}</p><div className="trainer-form-actions"><button type="button" disabled={busy || Boolean(attendanceToday)} onClick={() => saveRecord({ action: "check-in" })}>Check In</button><button type="button" disabled={busy || !attendanceToday?.checkInAt || Boolean(attendanceToday?.checkOutAt)} onClick={() => saveRecord({ action: "check-out" })}>Check Out</button><button type="button" disabled={busy || Boolean(attendanceToday)} onClick={() => saveRecord({ action: "leave", remarks })}>Mark Leave</button></div><label>Leave remarks<input maxLength="500" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label></div> : <form className="trainer-form" onSubmit={(event) => { event.preventDefault(); saveRecord(plan); }}><label>{tab === "weekly" ? "Week starting Monday" : "Date"}<input type="date" required value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} /></label><label>Area<input required maxLength="200" value={plan.area} onChange={(e) => setPlan({ ...plan, area: e.target.value })} /></label><label className="trainer-wide">Purpose / Action Plan<textarea required maxLength="2000" rows="4" value={plan.purpose} onChange={(e) => setPlan({ ...plan, purpose: e.target.value })} /></label><div className="trainer-form-actions"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save Plan"}</button></div></form>}
        <div className="trainer-table-wrap"><table><thead><tr><th>Date</th>{admin && !trainerId && <th>Trainer</th>}{tab === "attendance" ? <><th>Status</th><th>Check In</th><th>Check Out</th><th>Remarks</th></> : <><th>Area</th><th>Purpose</th></>}</tr></thead><tbody>{records.map((item) => <tr key={item.id}><td>{item.date}</td>{admin && !trainerId && <td>{item.trainerName || selectedTrainer?.name || "—"}</td>}{tab === "attendance" ? <><td>{item.status}</td><td>{dateTime(item.checkInAt)}</td><td>{dateTime(item.checkOutAt)}</td><td>{item.remarks || "—"}</td></> : <><td>{item.area}</td><td>{item.purpose}</td></>}</tr>)}</tbody></table>{!records.length && <p>No records yet.</p>}</div>
      </section>}
    </main>
  </div>;
}

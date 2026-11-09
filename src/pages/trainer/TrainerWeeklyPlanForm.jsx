import React, { useEffect, useState } from "react";
import { request } from "../../services/authApi.js";
import { weekDates, weekDay } from "../../domain/trainerWeek.js";
import { btnPrimary, inputStyle } from "../../ui/portalPresentation.jsx";
import TrainerPurposeField from "./TrainerPurposeField.jsx";

const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const mondayFor = (value) => { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7)); return date.toISOString().slice(0, 10); };
const addDays = (value, count) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return ""; const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return date.toISOString().slice(0, 10); };
const blankWeek = (from) => ({ from, to: addDays(from, 5), days: {} });

export default function TrainerWeeklyPlanForm({ editing, onBack, onSaved }) {
  const currentMonday = mondayFor(localDate());
  const [week, setWeek] = useState(() => editing ? { from: editing.date, to: editing.toDate || editing.date, days: Object.fromEntries((editing.days || []).map((day) => [day.date, { area: day.area || "", purpose: day.purpose || "" }])) } : blankWeek(currentMonday));
  const [minimum, setMinimum] = useState(currentMonday);
  const [loading, setLoading] = useState(!editing);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dates = weekDates(week.from, week.to);

  useEffect(() => {
    if (editing) return undefined;
    let active = true;
    request("/trainers/records/weekly").then(({ records }) => {
      if (!active) return;
      const latest = (records || []).reduce((max, record) => record.date > max ? record.date : max, "");
      const earliest = latest >= currentMonday ? addDays(latest, 7) : currentMonday;
      setMinimum(earliest);
      setWeek(blankWeek(earliest));
    }).catch((cause) => { if (active) { setError(cause.message); setLoadFailed(true); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, currentMonday]);

  const setDay = (date, key, value) => setWeek((current) => ({ ...current, days: { ...current.days, [date]: { ...current.days[date], [key]: value } } }));
  const submit = async (event) => {
    event.preventDefault();
    if (!dates.length) { setError("Select Monday through Saturday of the same week."); return; }
    setBusy(true); setError("");
    try {
      const payload = { date: week.from, toDate: week.to, days: dates.map((date) => ({ date, area: week.days[date]?.area || "", purpose: week.days[date]?.purpose || "" })) };
      const result = await request(editing ? `/trainers/records/weekly/${encodeURIComponent(editing.date)}` : "/trainers/records/weekly", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      onSaved(result.record);
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  };

  return <div className="trainer-weekly-form-page">
    <button type="button" className="trainer-back" onClick={onBack}>← Back</button>
    <h3>{editing ? "Edit Weekly Plan" : "Add Weekly Plan"}</h3>
    <p>{editing ? "Update the dates, areas and purposes in this saved plan." : "One plan can be added per week. Open All Weekly Plans to edit a saved plan."}</p>
    {error && <div className="trainer-alert error" role="alert">{error}</div>}
    {loading ? <div className="trainer-empty">Loading weekly plans...</div> : loadFailed ? null : <form className="trainer-plan-form" onSubmit={submit}>
      <div className="trainer-plan-row"><label>From Date (Monday)<input type="date" style={inputStyle} required min={editing ? undefined : minimum} value={week.from} disabled={Boolean(editing)} onChange={(event) => setWeek(blankWeek(event.target.value))} /></label><label>To Date (up to Saturday)<input type="date" style={inputStyle} required min={week.from} max={addDays(week.from, 5)} value={week.to} onChange={(event) => setWeek((current) => ({ ...current, to: event.target.value }))} /></label></div>
      {!dates.length && <p className="trainer-alert error">Select a Monday and a date up to Saturday of the same week.</p>}
      {dates.map((date) => <div className="trainer-week-day" key={date}><label>Area for {weekDay(date)}<input type="text" style={inputStyle} required value={week.days[date]?.area || ""} onChange={(event) => setDay(date, "area", event.target.value)} placeholder={`Area · ${weekDay(date)}, ${date}`} /></label><TrainerPurposeField value={week.days[date]?.purpose || ""} onChange={(value) => setDay(date, "purpose", value)} inputStyle={inputStyle} resetKey={date} /></div>)}
      <button type="submit" style={btnPrimary} disabled={busy || !dates.length}>{busy ? "Saving..." : editing ? "Save Changes" : "Save Weekly Plan"}</button>
    </form>}
  </div>;
}

import React, { useEffect, useMemo, useState } from "react";
import { request } from "../services/authApi.js";
import "../styles/monthlyAttendance.css";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const localMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function MonthlyAttendance({ role, marketers = [], onBack }) {
  const [month, setMonth] = useState(localMonth);
  const [marketerId, setMarketerId] = useState("");
  const [days, setDays] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [holidayDate, setHolidayDate] = useState(() => `${localMonth()}-01`);
  const [holidayName, setHolidayName] = useState("");
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayError, setHolidayError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const admin = role === "admin";

  useEffect(() => {
    let active = true;
    setHolidayDate(`${month}-01`);
    setHolidayError("");
    setHolidayLoading(true);
    setHolidays([]);
    request(`/data/attendance/holidays?month=${month}`).then((result) => {
      if (active) setHolidays(result.holidays || []);
    }).catch((cause) => {
      if (active) setHolidayError(cause.message);
    }).finally(() => {
      if (active) setHolidayLoading(false);
    });
    return () => { active = false; };
  }, [month, refresh]);

  const saveHoliday = async (event) => {
    event.preventDefault();
    if (!holidayDate.startsWith(`${month}-`) || !holidayName.trim()) { setHolidayError("Choose a date in this month and enter a holiday name."); return; }
    setHolidaySaving(true);
    setHolidayError("");
    try {
      await request("/data/attendance/holidays", { method: "PUT", body: JSON.stringify({ date: holidayDate, name: holidayName.trim() }) });
      setHolidayName("");
      setRefresh((value) => value + 1);
    } catch (cause) { setHolidayError(cause.message); }
    finally { setHolidaySaving(false); }
  };

  const deleteHoliday = async (date) => {
    setHolidaySaving(true);
    setHolidayError("");
    try {
      await request(`/data/attendance/holidays/${date}`, { method: "DELETE" });
      setRefresh((value) => value + 1);
    } catch (cause) { setHolidayError(cause.message); }
    finally { setHolidaySaving(false); }
  };

  useEffect(() => {
    if (admin && !marketerId) { setDays([]); setError(""); return; }
    let active = true;
    setLoading(true);
    setError("");
    setDays([]);
    const params = new URLSearchParams({ month });
    if (admin) params.set("marketerId", marketerId);
    request(`/data/attendance/monthly?${params}`).then((result) => {
      if (active) setDays(result.days || []);
    }).catch((cause) => {
      if (active) setError(cause.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [admin, marketerId, month, refresh]);

  const calendar = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const count = new Date(year, monthNumber, 0).getDate();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const rows = new Map(days.map((row) => [row.date, row]));
    const holidayDates = new Set(holidays.map((row) => row.date));
    const cells = Array.from({ length: first.getDay() }, () => null);
    const totals = { working: 0, present: 0, absent: 0, leave: 0 };
    for (let day = 1; day <= count; day += 1) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const sunday = new Date(year, monthNumber - 1, day).getDay() === 0;
      const gazetted = holidayDates.has(date);
      const row = rows.get(date);
      const status = row?.status === "leave" ? "leave" : row?.startMarked || row?.status === "completed" || row?.status === "started" ? "present" : sunday ? "sunday" : gazetted ? "gazetted" : date <= todayKey ? "absent" : "future";
      if (!sunday && !gazetted && date <= todayKey) {
        totals.working += 1;
        if (status === "present") totals.present += 1;
        else if (status === "leave") totals.leave += 1;
        else totals.absent += 1;
      }
      cells.push({ day, date, status, time: row?.startTime || row?.leaveTime || "" });
    }
    return { cells, totals, percent: totals.working ? (totals.present / totals.working * 100).toFixed(1) : "0.0" };
  }, [days, holidays, month]);

  return <div className="monthly-attendance-page">
    <button type="button" className="monthly-attendance-back" onClick={onBack}>← Back to Menu</button>
    <div className="monthly-attendance-box">
      <h2>Monthly Attendance</h2>
      <div className="monthly-attendance-controls">
        {admin && <label>Marketer<select value={marketerId} onChange={(event) => setMarketerId(event.target.value)}><option value="">Select marketer</option>{marketers.map((marketer) => <option key={marketer.id} value={marketer.id}>{marketer.name || marketer.email}</option>)}</select></label>}
        <label>Month<input type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} /></label>
        {(!admin || marketerId) && <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>Refresh</button>}
      </div>
      {admin && <details className="monthly-attendance-holidays"><summary>Gazetted holidays ({holidays.length})</summary>
        <form onSubmit={saveHoliday} className="monthly-attendance-holiday-form">
          <input type="date" value={holidayDate} min={`${month}-01`} max={`${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()).padStart(2, "0")}`} onChange={(event) => setHolidayDate(event.target.value)} aria-label="Holiday date" required />
          <input type="text" value={holidayName} maxLength={100} onChange={(event) => setHolidayName(event.target.value)} placeholder="Holiday name" aria-label="Holiday name" required />
          <button type="submit" disabled={holidaySaving}>Add holiday</button>
        </form>
        {holidayError && <p className="monthly-attendance-error" role="alert">{holidayError}</p>}
        <div className="monthly-attendance-holiday-list">{holidays.length ? holidays.map((holiday) => <span key={holiday.date}>{holiday.date} · {holiday.name}<button type="button" onClick={() => deleteHoliday(holiday.date)} disabled={holidaySaving} aria-label={`Remove ${holiday.name}`}>×</button></span>) : <small>No gazetted holidays added for this month.</small>}</div>
      </details>}
      {admin && !marketerId ? <p className="monthly-attendance-empty">Select a marketer to view monthly attendance.</p> : error || holidayError ? <p className="monthly-attendance-error" role="alert">{error || holidayError}</p> : loading || holidayLoading ? <p className="monthly-attendance-empty">Loading attendance…</p> : <>
        <div className="monthly-attendance-summary">
          {[["Working", calendar.totals.working], ["Present", calendar.totals.present], ["Absent", calendar.totals.absent], ["Leave", calendar.totals.leave], ["Attendance", `${calendar.percent}%`]].map(([label, value]) => <div key={label} className={`monthly-attendance-stat monthly-attendance-stat--${label.toLowerCase()}`}><strong>{value}</strong><span>{label}</span></div>)}
        </div>
        <div className="monthly-attendance-grid" role="grid" aria-label={`${month} attendance calendar`}>
          {weekdays.map((day) => <div key={day} className="monthly-attendance-weekday" role="columnheader">{day}</div>)}
          {calendar.cells.map((cell, index) => cell ? <div key={cell.date} className={`monthly-attendance-day monthly-attendance-day--${cell.status}`} role="gridcell" aria-label={`${cell.date}: ${cell.status}${cell.time ? `, ${cell.time}` : ""}`}><strong>{cell.day}</strong>{cell.time && <small>{cell.time}</small>}</div> : <div key={`blank-${index}`} className="monthly-attendance-blank" role="gridcell" />)}
        </div>
        <div className="monthly-attendance-legend">{[["present", "Present"], ["absent", "Absent"], ["leave", "Leave"], ["sunday", "Sunday"], ["gazetted", "Gazetted holiday"]].map(([status, label]) => <span key={status}><i className={`monthly-attendance-key monthly-attendance-key--${status}`} />{label}</span>)}</div>
      </>}
    </div>
  </div>;
}

import React, { useState } from "react";
import { weekDay } from "../../domain/trainerWeek.js";

const monthLabel = (month) => new Intl.DateTimeFormat("en-PK", { month: "long", timeZone: "UTC" }).format(new Date(`2026-${String(month).padStart(2, "0")}-01T12:00:00Z`));
const shortDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || "")
  ? new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))
  : date || "—";
const currentYear = () => new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "Asia/Karachi" }).format(new Date());

export default function TrainerWeeklyPlans({ records, selectedId, onSelect, showTrainer, onEdit, loading = false }) {
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [chosenYear, setChosenYear] = useState(null);
  const selected = records.find((record) => record.id === selectedId);
  const visiblePlanIds = selectedPlanIds.length ? selectedPlanIds : selected ? [selected.id] : [];
  const fallbackYear = String(selected?.date || records[0]?.date || currentYear()).slice(0, 4);
  const year = /^\d{4}$/.test(chosenYear) ? chosenYear : fallbackYear;
  const monthGroups = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    return { month, label: monthLabel(index + 1), records: records.filter((record) => String(record.date || "").startsWith(month)) };
  });
  const visibleMonths = selectedMonths.length ? selectedMonths : selected && String(selected.date).startsWith(year) ? [String(selected.date).slice(0, 7)] : [];
  const activeGroups = monthGroups.filter(({ month }) => visibleMonths.includes(month));

  if (loading) return <div className="trainer-empty">Loading weekly plans...</div>;

  const changeYear = (value) => {
    if (!/^\d{0,4}$/.test(value)) return;
    setChosenYear(value);
    setSelectedMonths([]);
    setSelectedPlanIds([]);
    onSelect("");
  };
  const toggleMonth = (month) => {
    setSelectedMonths((previous) => {
      const current = previous.length ? previous : selected ? [String(selected.date).slice(0, 7)] : [];
      return current.includes(month) ? current.filter((value) => value !== month) : [...current, month];
    });
    setSelectedPlanIds((previous) => previous.filter((id) => !String(records.find((record) => record.id === id)?.date || "").startsWith(month)));
    onSelect("");
  };
  const togglePlan = (id) => {
    const current = selectedPlanIds.length ? selectedPlanIds : selected ? [selected.id] : [];
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    setSelectedPlanIds(next);
    onSelect(next.at(-1) || "");
  };
  return <div className="trainer-weekly-plans">
    <div className="trainer-weekly-year-select">
      <label htmlFor="trainer-weekly-year">Year</label>
      <div className="trainer-weekly-year-controls">
        <button type="button" aria-label="Previous year" onClick={() => changeYear(String(Math.max(1000, Number(year) - 1)))}>‹</button>
        <input id="trainer-weekly-year" type="number" min="1000" max="9999" inputMode="numeric" value={chosenYear ?? year} onChange={(event) => changeYear(event.target.value)} />
        <button type="button" aria-label="Next year" onClick={() => changeYear(String(Math.min(9999, Number(year) + 1)))}>›</button>
      </div>
    </div>
    <div className="trainer-weekly-months" aria-label="Weekly plan months">
      {monthGroups.map((group) => <button key={group.month} type="button" className={`trainer-weekly-card trainer-weekly-month ${visibleMonths.includes(group.month) ? "selected" : ""}`} aria-pressed={visibleMonths.includes(group.month)} onClick={() => toggleMonth(group.month)}>
        <span className="trainer-weekly-card-label">{visibleMonths.includes(group.month) ? "✓ Selected" : "Month"}</span>
        <strong>{group.label}</strong>
        <span className="trainer-weekly-card-open">{group.records.length} weekly {group.records.length === 1 ? "plan" : "plans"}</span>
      </button>)}
    </div>
    {activeGroups.length > 0 && <div className="trainer-weekly-selected-months">
      <div className="trainer-weekly-selection-head"><strong>{activeGroups.length} {activeGroups.length === 1 ? "month" : "months"} selected</strong><button type="button" onClick={() => { setSelectedMonths([]); setSelectedPlanIds([]); onSelect(""); }}>Clear selection</button></div>
      {activeGroups.map((group) => <section key={group.month} className="trainer-weekly-month-content" aria-label={`${group.label} ${year} plans`}>
        <div className="trainer-weekly-month-heading"><strong>{group.label} {year}</strong><span>{group.records.length} {group.records.length === 1 ? "plan" : "plans"}</span></div>
        {group.records.length ? <div className="trainer-weekly-cards" aria-label={`${group.label} weekly action plans`}>
          {group.records.map((record) => <button key={record.id} type="button" className={`trainer-weekly-plan-card ${visiblePlanIds.includes(record.id) ? "selected" : ""}`} aria-pressed={visiblePlanIds.includes(record.id)} onClick={() => togglePlan(record.id)}>
            <span className="trainer-weekly-plan-date"><small>FROM</small><strong>{shortDate(record.date)}</strong></span>
            <span className="trainer-weekly-plan-date"><small>TO</small><strong>{shortDate(record.toDate || record.date)}</strong></span>
            {showTrainer && <span className="trainer-weekly-plan-trainer">{record.trainerName || "Trainer"}</span>}
            <span className="trainer-weekly-plan-open">{visiblePlanIds.includes(record.id) ? "Hide details ↑" : "View details ↓"}</span>
          </button>)}
        </div> : <div className="trainer-weekly-hint">No weekly plans in {group.label} {year}.</div>}
        {group.records.filter((record) => visiblePlanIds.includes(record.id)).map((record) => <div key={record.id} className="trainer-weekly-detail">
          <div className="trainer-weekly-detail-head"><strong>Weekly Action Plan{showTrainer ? ` · ${record.trainerName || "Trainer"}` : ""}</strong><div className="trainer-weekly-detail-actions">{onEdit && <button type="button" onClick={() => onEdit(record)}>Edit plan</button>}<button type="button" onClick={() => togglePlan(record.id)}>Close plan</button></div></div>
          <div className="trainer-table-wrap"><div className="trainer-weekly-range-banner">From Date: {record.date} <span>·</span> To Date: {record.toDate || record.date}</div><table className="trainer-report-table"><thead><tr><th>Date</th>{showTrainer && <th>Trainer</th>}<th>Area</th><th>Purpose</th></tr></thead><tbody>
            {(Array.isArray(record.days) ? record.days : [record]).map((day) => <tr key={`${record.id}_${day.date}`}><td>{day.date} · {weekDay(day.date)}</td>{showTrainer && <td>{record.trainerName || "—"}</td>}<td>{day.area || "—"}</td><td>{day.purpose || "—"}</td></tr>)}
          </tbody></table></div>
        </div>)}
      </section>)}
    </div>}
  </div>;
}

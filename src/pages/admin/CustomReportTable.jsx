import React from "react";
import { rowValue } from "../../domain/customReportSchema.js";

const REMARKS = ["Contacted", "Contacted but sample didn't receive", "Didn't contact", "Sample received", "Other"];

export default function CustomReportTable({ report, columns, rows, marketersList, updateRow, saveRow, updateDateGroup, saveDateGroup, removeRow }) {
  return <div className="table-scroll other-report-table-wrap">
    <table className="other-report-table"><thead>
      <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Action</th></tr>
    </thead><tbody>{rows.map((row, index) => <tr key={row.id}>{columns.map((column) => {
      const value = rowValue(row, column, report);
      if (column.key === "date" && index > 0 && value === rowValue(rows[index - 1], column, report)) return null;
      const nextDateIndex = column.key === "date" ? rows.slice(index).findIndex((next) => rowValue(next, column, report) !== value) : -1;
      const span = column.key === "date" ? (nextDateIndex < 0 ? rows.length - index : nextDateIndex) : 1;
      const groupIds = column.key === "date" ? rows.slice(index, index + span).map((item) => item.id) : [];
      return <td key={column.key} rowSpan={span}>
        {column.type === "remarks" ? <div className="other-report-remark">
          <select value={REMARKS.includes(value) ? value : value ? "Other" : ""} onChange={(event) => { const next = event.target.value; updateRow(row.id, { [column.key]: next }); saveRow(row.id, { [column.key]: next }); }} aria-label={column.label}>
            <option value="">Select remarks</option>{REMARKS.map((item) => <option key={item}>{item}</option>)}
          </select>
          {value && !REMARKS.slice(0, -1).includes(value) && <input value={value === "Other" ? "" : value} placeholder="Custom remark" onChange={(event) => updateRow(row.id, { [column.key]: event.target.value || "Other" })} onBlur={(event) => saveRow(row.id, { [column.key]: event.target.value || "Other" })} aria-label="Custom remark" />}
        </div> : column.type === "marketer" ? <select value={marketersList.find((item) => [item.id, item.email, item.name].some((identity) => identity && String(identity).toLowerCase() === String(value).toLowerCase()))?.id || value} onChange={(event) => { updateRow(row.id, { [column.key]: event.target.value }); saveRow(row.id, { [column.key]: event.target.value }); }} aria-label={column.label}>
          <option value="">Select marketer</option>{marketersList.map((item) => <option key={item.id} value={item.id}>{item.name || item.email || "Marketer"}</option>)}
        </select> : <input type={column.type === "date" ? "date" : "text"} value={value} onChange={(event) => column.key === "date" ? updateDateGroup(groupIds, event.target.value) : updateRow(row.id, { [column.key]: event.target.value })} onBlur={(event) => column.key === "date" ? saveDateGroup(groupIds, event.target.value) : saveRow(row.id, { [column.key]: event.target.value })} aria-label={column.label} />}
      </td>;
    })}<td><button className="other-report-delete" onClick={() => removeRow(row.id)} title="Delete row" aria-label="Delete row">×</button></td></tr>)}</tbody></table>
    {!rows.length && <div className="other-reports-empty">No rows match the current filters.</div>}
  </div>;
}

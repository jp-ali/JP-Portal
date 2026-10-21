import React from "react";
import { rowValue } from "../../domain/customReportSchema.js";
import { isPhoneColumn, phoneHref, VERIFICATION_REMARK_OPTIONS } from "../../domain/verificationRemarks.js";

const REMARKS = ["Contacted", "Contacted but sample didn't receive", "Didn't contact", "Sample received", "Other"];

export default function CustomReportTable({ report, columns, rows, marketersList, updateRow, saveRow, updateDateGroup, saveDateGroup, removeRow, verificationMode = false }) {
  const hasNumberColumn = columns.some((column) => column.type === "text" && isPhoneColumn(column));
  const editValue = (row, key, value) => updateRow(row.id, { [key]: value });
  const saveValue = (row, key, value) => saveRow(row.id, { [key]: value });
  const numberField = (row, key, value, label) => <div className="other-report-phone-field">
    {phoneHref(value) && <a className="verification-call-link" href={phoneHref(value)} title={`Call ${value}`}>☎ {value}</a>}
    <input type="tel" value={value || ""} onChange={(event) => editValue(row, key, event.target.value)} onBlur={(event) => saveValue(row, key, event.target.value)} aria-label={label} placeholder="Phone number" />
  </div>;

  return <div className="table-scroll other-report-table-wrap">
    <table className="other-report-table"><thead><tr>
      {columns.map((column) => <th key={column.key}>{column.label}</th>)}
      {verificationMode && !hasNumberColumn && <th>Number</th>}
      {verificationMode && <th>Verification Remarks</th>}
      <th>Action</th>
    </tr></thead><tbody>{rows.map((row, index) => <tr key={row.id}>
      {columns.map((column) => {
        const value = rowValue(row, column, report);
        if (column.key === "date" && index > 0 && value === rowValue(rows[index - 1], column, report)) return null;
        const nextDateIndex = column.key === "date" ? rows.slice(index).findIndex((next) => rowValue(next, column, report) !== value) : -1;
        const span = column.key === "date" ? (nextDateIndex < 0 ? rows.length - index : nextDateIndex) : 1;
        const groupIds = column.key === "date" ? rows.slice(index, index + span).map((item) => item.id) : [];
        return <td key={column.key} rowSpan={span}>
          {verificationMode && column.type === "text" && isPhoneColumn(column) ? numberField(row, column.key, value, column.label)
            : column.type === "remarks" ? <div className="other-report-remark">
              <select value={REMARKS.includes(value) ? value : value ? "Other" : ""} onChange={(event) => { const next = event.target.value; editValue(row, column.key, next); saveValue(row, column.key, next); }} aria-label={column.label}>
                <option value="">Select remarks</option>{REMARKS.map((item) => <option key={item}>{item}</option>)}
              </select>
              {value && !REMARKS.slice(0, -1).includes(value) && <input value={value === "Other" ? "" : value} placeholder="Custom remark" onChange={(event) => editValue(row, column.key, event.target.value || "Other")} onBlur={(event) => saveValue(row, column.key, event.target.value || "Other")} aria-label="Custom remark" />}
            </div>
            : column.type === "marketer" ? <select value={marketersList.find((item) => [item.id, item.email, item.name].some((identity) => identity && String(identity).toLowerCase() === String(value).toLowerCase()))?.id || value} onChange={(event) => { editValue(row, column.key, event.target.value); saveValue(row, column.key, event.target.value); }} aria-label={column.label}>
              <option value="">Select marketer</option>{marketersList.map((item) => <option key={item.id} value={item.id}>{item.name || item.email || "Marketer"}</option>)}
            </select>
            : <input type={column.type === "date" ? "date" : "text"} value={value} onChange={(event) => column.key === "date" ? updateDateGroup(groupIds, event.target.value) : editValue(row, column.key, event.target.value)} onBlur={(event) => column.key === "date" ? saveDateGroup(groupIds, event.target.value) : saveValue(row, column.key, event.target.value)} aria-label={column.label} />}
        </td>;
      })}
      {verificationMode && !hasNumberColumn && <td>{numberField(row, "verificationNumber", row.verificationNumber, "Number")}</td>}
      {verificationMode && <td><div className="other-report-remark">
        <select value={row.verificationRemark || ""} onChange={(event) => {
          const remark = event.target.value;
          const changes = { verificationRemark: remark, verificationCustomRemark: remark === "Others" ? row.verificationCustomRemark || "" : "" };
          updateRow(row.id, changes); saveRow(row.id, changes);
        }} aria-label="Verification Remarks">
          <option value="">Select Remarks</option>{VERIFICATION_REMARK_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {row.verificationRemark === "Others" && <input type="text" value={row.verificationCustomRemark || ""} placeholder="Type custom remarks..." onChange={(event) => editValue(row, "verificationCustomRemark", event.target.value)} onBlur={(event) => saveValue(row, "verificationCustomRemark", event.target.value)} aria-label="Custom verification remarks" />}
      </div></td>}
      <td><button className="other-report-delete" onClick={() => removeRow(row.id)} title="Delete row" aria-label="Delete row">×</button></td>
    </tr>)}</tbody></table>
    {!rows.length && <div className="other-reports-empty">No rows match the current filters.</div>}
  </div>;
}

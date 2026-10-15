import React from "react";
import MarketerMultiSelect from "./MarketerMultiSelect.jsx";

export default function ReportMarketerFilterBar({ fromDate, toDate, onFromDate, onToDate, onClear, marketers, selected, onSelected, onRefresh, inputStyle, valueKey = "email", emptyLabel = "All Marketers", rateControl }) {
  return <div className={`report-marketer-filter-bar${rateControl ? " has-rate" : ""}`}>
    <div className="report-filter-from">
      <label>From Date</label>
      <input type="date" lang="en-GB" value={fromDate} onChange={(event) => onFromDate(event.target.value)} style={inputStyle} />
    </div>
    <div className="report-filter-to">
      <label>To Date</label>
      <input type="date" lang="en-GB" value={toDate} onChange={(event) => onToDate(event.target.value)} style={inputStyle} />
    </div>
    <button className="report-filter-clear" type="button" onClick={onClear}>Clear</button>
    <div className="report-filter-marketers">
      <MarketerMultiSelect marketers={marketers} selected={selected} onChange={onSelected} inputStyle={inputStyle} valueKey={valueKey} emptyLabel={emptyLabel} />
    </div>
    {rateControl && <div className="report-filter-rate">{rateControl}</div>}
    <button className="report-filter-refresh" type="button" title="Refresh report" aria-label="Refresh report" onClick={onRefresh}>↻</button>
  </div>;
}

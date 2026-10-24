import React, { useEffect, useMemo, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { deleteNews, listNews, publishNews, restoreNews } from "../../services/newsApi.js";
import { exportNewsExcel, exportNewsPDF } from "../../services/newsExports.js";
import { confirmAction, showNotice } from "../../ui/confirmDialog.js";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import { dashboardItemKeys, useDashboardVisibility } from "../../services/dashboardVisibility.js";
import "../../styles/news.css";
import "../../styles/adminNews.css";

const views = {
  add: { title: "Add News", description: "Write an update and send it to your team.", icon: "✉", art: "add" },
  expense: { title: "Expense News", description: "Send each marketer their expense report.", icon: "▥", art: "expense" },
  old: { title: "Old News", description: "Review previously sent news.", icon: "▣", art: "old" },
  deleted: { title: "Deleted News", description: "Restore removed news and expense reports.", icon: "♻", art: "old" }
};
const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
};
const pakistanDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const isForSelection = (item, ids) => !ids.length || !Array.isArray(item.recipientIds)
  || ids.some((id) => item.recipientIds.includes(id));

function PanelHeading({ icon, title, description, action }) {
  return <div className="news-panel-heading"><span className="news-panel-heading-icon" aria-hidden="true">{icon}</span><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

function NewsMarketerSelect({ marketers, selected, onChange, inputStyle, label = "Select Marketer(s)" }) {
  return <div className="news-marketer-select"><span className="news-marketer-select-icon" aria-hidden="true">👥</span><MarketerMultiSelect marketers={marketers} selected={selected} onChange={onChange} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" label={label} /></div>;
}

function ReportActions({ expanded, onExpand, onExcel, onPdf, onRefresh, busy }) {
  return <div className="news-report-actions">
    <button type="button" className="news-soft-button" onClick={onRefresh}>↻ Refresh</button>
    <button type="button" className="news-soft-button" onClick={onExpand}>{expanded ? "⤡ Close" : "⛶ Expand"}</button>
    <button type="button" className="news-soft-button" onClick={onExcel} disabled={busy}>Excel</button>
    <button type="button" className="news-primary" onClick={onPdf} disabled={busy}>PDF</button>
  </div>;
}

export default function AdminNewsPanel({ mode = "add" }) {
  const { setAdminView, inputStyle, marketersList = [], fetchMarketers, user, expandedReportKey, setExpandedReportKey } = usePortalContext();
  const { hide, isHidden, hideControlsVisible } = useDashboardVisibility("admin", user?.id || user?.email || "admin");
  const [message, setMessage] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [recordIds, setRecordIds] = useState([]);
  const [historySelectedIds, setHistorySelectedIds] = useState([]);
  const [historyFromDraft, setHistoryFromDraft] = useState("");
  const [historyToDraft, setHistoryToDraft] = useState("");
  const [historyFilters, setHistoryFilters] = useState({ ids: [], from: "", to: "" });
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const current = views[mode] || views.add;
  const bannerKey = dashboardItemKeys.banner(`news-${mode}`);
  const expandedKey = `news-${mode}-report`;
  const expanded = expandedReportKey === expandedKey;

  const reload = async () => {
    setLoading(true);
    try { const result = await listNews(); setNews(result.news || []); setError(""); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchMarketers().catch(() => {}); void reload(); }, [mode]);

  const recordNews = useMemo(() => news.filter((item) => Boolean(item.deletedAt) === (mode === "deleted"))
    .filter((item) => isForSelection(item, recordIds)), [news, mode, recordIds]);
  const expenseHistory = useMemo(() => news.filter((item) => !item.deletedAt && (item.kind === "expense" || (!item.kind && item.fromDate)))
    .filter((item) => isForSelection(item, historyFilters.ids))
    .filter((item) => !historyFilters.from || item.toDate >= historyFilters.from)
    .filter((item) => !historyFilters.to || item.fromDate <= historyFilters.to), [news, historyFilters]);
  const todayKey = pakistanDateKey(new Date());
  const todayNews = useMemo(() => news.filter((item) => !item.deletedAt && (item.kind === "general" || (!item.kind && !item.fromDate))
    && pakistanDateKey(item.createdAt) === todayKey), [news, todayKey]);
  const marketerLabel = (item) => {
    if (!Array.isArray(item.recipientIds) || item.recipientIds.length === marketersList.length) return "All Marketers";
    const names = item.recipientIds.map((id) => marketersList.find((marketer) => marketer.id === id)?.name || "Marketer");
    return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };
  const exportRows = (items) => items.map((item, index) => ({
    "Sr.": index + 1,
    Type: item.kind === "expense" || item.fromDate ? "Expense Report" : "News",
    "Marketer(s)": marketerLabel(item),
    "Date Range": item.fromDate ? `${item.fromDate} to ${item.toDate}` : "",
    "Sent Date": formatDate(item.createdAt),
    Message: item.message || "",
    Status: item.deletedAt ? "Deleted" : "Sent"
  }));
  const download = async (kind, items, title) => {
    if (!items.length) { showNotice("No news records available for export."); return; }
    setExporting(true);
    try {
      const rows = exportRows(items);
      if (kind === "excel") await exportNewsExcel(title, rows);
      else await exportNewsPDF(title, rows);
    } catch (failure) { showNotice(failure.message || "Report could not be downloaded."); }
    finally { setExporting(false); }
  };
  const send = async (event) => {
    event.preventDefault();
    if (mode === "expense" && fromDate > toDate) { showNotice("From Date must be before To Date."); return; }
    setSending(true);
    try {
      const result = await publishNews(mode === "expense"
        ? { kind: "expense", fromDate, toDate, recipientIds: selectedIds }
        : { kind: "general", message: message.trim(), recipientIds: selectedIds });
      setMessage(""); setFromDate(""); setToDate("");
      await reload();
      const push = result.push || {};
      showNotice(push.configured
        ? `Sent to ${result.recipients} marketer(s). Phone notification accepted for ${push.delivered || 0} subscribed device(s).`
        : `Sent to ${result.recipients} marketer(s) in the portal. Phone notifications require push setup on the API server.`);
    } catch (failure) { showNotice(failure.message || "News could not be sent."); }
    finally { setSending(false); }
  };
  const changeDeleted = async (item) => {
    if (!await confirmAction(item.deletedAt ? "Restore this news?" : "Move this news to Deleted News?")) return;
    try {
      if (item.deletedAt) await restoreNews(item.id);
      else await deleteNews(item.id);
      await reload();
      showNotice(item.deletedAt ? "News restored." : "News deleted.");
    } catch (failure) { showNotice(failure.message); }
  };

  return <div className={`news-page news-admin-page news-page--${mode}`}>
    {!isHidden(bannerKey) && <header className="news-hero">
      <span className="news-hero-icon" aria-hidden="true">{current.icon}</span>
      <div className="news-hero-copy"><h1>{current.title}</h1><p>{current.description}</p></div>
      <div className={`news-hero-art news-hero-art--${current.art}`} aria-hidden="true" />
      {hideControlsVisible && <button type="button" className="portal-dashboard-hide news-hero-hide" title="Hide news header" aria-label="Hide news header" onClick={() => hide({ key: bannerKey, title: `${current.title} header`, type: "Banner" })}><svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c5.2 0 9 4.1 10 7a13 13 0 0 1-3.1 4.7M6.2 6.2C4.2 7.6 2.8 9.8 2 12c1 2.9 4.8 7 10 7 1.7 0 3.2-.4 4.5-1.1"/></svg></button>}
    </header>}
    <div className="portal-section-toolbar news-toolbar">
      <button type="button" className="portal-section-back news-back" onClick={() => { if (expanded) setExpandedReportKey(""); setAdminView("home"); }}>← Back to Menu</button>
      {mode === "old" && <button type="button" className="news-soft-button" onClick={() => setAdminView("news-deleted")}>🗑 Deleted News</button>}
      {mode === "deleted" && <button type="button" className="news-soft-button" onClick={() => setAdminView("news-old")}>▣ Old News</button>}
    </div>

    {mode === "add" && <>
      <form className="news-card news-compose news-add-form" onSubmit={send}>
        <PanelHeading icon="➤" title="Send News" description="Write a message for all or selected marketers." />
        <div className="news-add-layout">
          <label className="news-message-field">News Message *<textarea style={inputStyle} required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your news here" rows={5} /></label>
          <div className="news-add-controls"><NewsMarketerSelect marketers={marketersList} selected={selectedIds} onChange={setSelectedIds} inputStyle={inputStyle} label="Select Marketer(s) *" /><button className="news-primary" type="submit" disabled={sending}>➤ {sending ? "Sending..." : "Send"}</button></div>
        </div>
      </form>
      <section className={`news-card news-history ${expanded ? "news-history--expanded" : ""}`}>
        <PanelHeading icon="▤" title="Today's News" description="News sent today."
          action={<ReportActions expanded={expanded} onExpand={() => setExpandedReportKey(expanded ? "" : expandedKey)} onExcel={() => void download("excel", todayNews, "Today's News")} onPdf={() => void download("pdf", todayNews, "Today's News")} onRefresh={() => void reload()} busy={exporting} />} />
        {loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}
        {!loading && !error && !todayNews.length && <p>No news sent today.</p>}
        <div className="news-list">{todayNews.map((item, index) => <article className={`news-entry news-entry--${index % 4}`} key={item.id}><span className="news-entry-icon">▤</span><div className="news-entry-body"><strong>News</strong><p>{item.message}</p><small>▣ {formatDate(item.createdAt)} &nbsp; | &nbsp; 👥 {marketerLabel(item)}</small></div><button type="button" className="news-entry-action" onClick={() => void changeDeleted(item)}>🗑 Delete</button></article>)}</div>
      </section>
    </>}

    {mode === "expense" && <>
      <form className="news-card news-compose" onSubmit={send}>
        <PanelHeading icon="➤" title="Send Expense News" description="A separate expense report PDF will be prepared for each selected marketer." />
        <div className="news-send-fields news-send-fields--expense">
          <NewsMarketerSelect marketers={marketersList} selected={selectedIds} onChange={setSelectedIds} inputStyle={inputStyle} label="Select Marketer(s) *" />
          <label>From Date *<input style={inputStyle} type="date" required value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label>To Date *<input style={inputStyle} type="date" required min={fromDate || undefined} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        </div>
        <div className="news-form-actions"><button className="news-primary" type="submit" disabled={sending}>➤ {sending ? "Preparing PDFs..." : "Send"}</button></div>
      </form>
      <section className={`news-card news-history ${expanded ? "news-history--expanded" : ""}`}>
        <PanelHeading icon="▤" title="Expense News History" description="Previously sent expense reports."
          action={<ReportActions expanded={expanded} onExpand={() => setExpandedReportKey(expanded ? "" : expandedKey)} onExcel={() => void download("excel", expenseHistory, "Expense News History")} onPdf={() => void download("pdf", expenseHistory, "Expense News History")} onRefresh={() => void reload()} busy={exporting} />} />
        <div className="news-history-filters">
          <NewsMarketerSelect marketers={marketersList} selected={historySelectedIds} onChange={setHistorySelectedIds} inputStyle={inputStyle} />
          <label>From Date<input style={inputStyle} type="date" value={historyFromDraft} onChange={(event) => setHistoryFromDraft(event.target.value)} /></label>
          <label>To Date<input style={inputStyle} type="date" value={historyToDraft} onChange={(event) => setHistoryToDraft(event.target.value)} /></label>
          <button type="button" className="news-primary" onClick={() => { if (historyFromDraft && historyToDraft && historyFromDraft > historyToDraft) { showNotice("From Date must be before To Date."); return; } setHistoryFilters({ ids: historySelectedIds, from: historyFromDraft, to: historyToDraft }); }}>⌕ Search</button>
        </div>
        {loading && <p>Loading history...</p>}{error && <p role="alert">{error}</p>}
        {!loading && !error && <div className="news-table-scroll"><table className="news-history-table"><thead><tr><th>Sr. No.</th><th>Marketer(s)</th><th>Date Range</th><th>Sent Date</th><th>Message</th><th>Action</th></tr></thead><tbody>
          {expenseHistory.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{marketerLabel(item)}</td><td>{item.fromDate} to {item.toDate}</td><td>{formatDate(item.createdAt)}</td><td>{item.message || "Expense report"}</td><td><button type="button" className="news-table-delete" onClick={() => void changeDeleted(item)} title="Delete expense news" aria-label="Delete expense news">🗑</button></td></tr>)}
          {!expenseHistory.length && <tr><td colSpan={6} className="news-empty-cell">No expense news found for these filters.</td></tr>}
        </tbody></table></div>}
      </section>
    </>}

    {(mode === "old" || mode === "deleted") && <>
      <div className="news-filter-bar"><NewsMarketerSelect marketers={marketersList} selected={recordIds} onChange={setRecordIds} inputStyle={inputStyle} /></div>
      <section className={`news-card news-history ${expanded ? "news-history--expanded" : ""}`}>
        <PanelHeading icon="▤" title={current.title} description={mode === "deleted" ? "Restore deleted messages and expense reports." : "Previously sent messages and expense reports."}
          action={<ReportActions expanded={expanded} onExpand={() => setExpandedReportKey(expanded ? "" : expandedKey)} onExcel={() => void download("excel", recordNews, current.title)} onPdf={() => void download("pdf", recordNews, current.title)} onRefresh={() => void reload()} busy={exporting} />} />
        {loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}
        {!loading && !error && !recordNews.length && <p>No {mode === "deleted" ? "deleted" : "sent"} news found.</p>}
        <div className="news-list">{recordNews.map((item, index) => <article className={`news-entry news-entry--${index % 4}`} key={item.id}>
          <span className="news-entry-icon">▤</span>
          <div className="news-entry-body"><strong>{item.kind === "expense" || item.fromDate ? "Expense Report" : "News"}</strong><p>{item.message}</p>{item.fromDate && <span>Expense report: {item.fromDate} to {item.toDate}</span>}<small>▣ {formatDate(item.createdAt)} &nbsp; | &nbsp; 👥 {marketerLabel(item)}</small></div>
          <button type="button" className="news-entry-action" onClick={() => void changeDeleted(item)}>{mode === "deleted" ? "↻ Restore" : "🗑 Delete"}</button>
        </article>)}</div>
      </section>
    </>}
  </div>;
}

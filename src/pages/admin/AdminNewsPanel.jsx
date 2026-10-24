import React, { useEffect, useMemo, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { deleteNews, listNews, publishNews, restoreNews } from "../../services/newsApi.js";
import { confirmAction, showNotice } from "../../ui/confirmDialog.js";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import { dashboardItemKeys, useDashboardVisibility } from "../../services/dashboardVisibility.js";
import "../../styles/news.css";
import "../../styles/adminNews.css";

const views = {
  home: { title: "News", description: "Team updates and expense report notices.", icon: "▣", art: "banner" },
  add: { title: "Add News", description: "Write an update and send it to your team.", icon: "✉", art: "add" },
  expense: { title: "Expense News", description: "Send each marketer their expense report.", icon: "▥", art: "expense" },
  old: { title: "Old News", description: "Review previously sent news.", icon: "▣", art: "old" }
};
const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-GB");
};

function PanelHeading({ icon, title, description, action }) {
  return <div className="news-panel-heading"><span className="news-panel-heading-icon" aria-hidden="true">{icon}</span><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export default function AdminNewsPanel({ mode = "home" }) {
  const { setAdminView, inputStyle, marketersList = [], fetchMarketers, user } = usePortalContext();
  const { hide, isHidden, hideControlsVisible } = useDashboardVisibility("admin", user?.id || user?.email || "admin");
  const [message, setMessage] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [oldSelectedIds, setOldSelectedIds] = useState([]);
  const [historySelectedIds, setHistorySelectedIds] = useState([]);
  const [historyFromDraft, setHistoryFromDraft] = useState("");
  const [historyToDraft, setHistoryToDraft] = useState("");
  const [historyFilters, setHistoryFilters] = useState({ ids: [], from: "", to: "" });
  const [news, setNews] = useState([]);
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (mode !== "home") fetchMarketers().catch(() => {}); }, [mode]);
  const reload = async () => {
    setLoading(true);
    try { const result = await listNews(); setNews(result.news || []); setError(""); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (mode !== "home") void reload(); }, [mode]);

  const isForSelection = (item, ids) => !ids.length || !Array.isArray(item.recipientIds)
    || ids.some((id) => item.recipientIds.includes(id));
  const oldNews = useMemo(() => news.filter((item) => Boolean(item.deletedAt) === deleted)
    .filter((item) => isForSelection(item, oldSelectedIds)), [news, deleted, oldSelectedIds]);
  const expenseHistory = useMemo(() => news.filter((item) => !item.deletedAt && (item.kind === "expense" || (!item.kind && item.fromDate)))
    .filter((item) => isForSelection(item, historyFilters.ids))
    .filter((item) => !historyFilters.from || item.toDate >= historyFilters.from)
    .filter((item) => !historyFilters.to || item.fromDate <= historyFilters.to), [news, historyFilters]);
  const generalHistory = useMemo(() => news.filter((item) => !item.deletedAt && (item.kind === "general" || (!item.kind && !item.fromDate)))
    .filter((item) => isForSelection(item, historySelectedIds)), [news, historySelectedIds]);
  const marketerLabel = (item) => {
    if (!Array.isArray(item.recipientIds) || item.recipientIds.length === marketersList.length) return "All Marketers";
    const names = item.recipientIds.map((id) => marketersList.find((marketer) => marketer.id === id)?.name || "Marketer");
    return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
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
  const openDeleted = () => { setDeleted(true); setAdminView("news-old"); };
  const current = views[mode] || views.home;
  const bannerKey = dashboardItemKeys.banner(mode === "home" ? "news" : `news-${mode}`);

  return <div className={`news-page news-admin-page news-page--${mode}`}>
    {!isHidden(bannerKey) && <header className="news-hero">
      <span className="news-hero-icon" aria-hidden="true">{current.icon}</span>
      <div className="news-hero-copy"><h1>{current.title}</h1><p>{current.description}</p></div>
      <div className={`news-hero-art news-hero-art--${current.art}`} aria-hidden="true" />
      {hideControlsVisible && <button type="button" className="portal-dashboard-hide news-hero-hide" title="Hide news header" aria-label="Hide news header" onClick={() => hide({ key: bannerKey, title: `${current.title} header`, type: "Banner" })}><svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c5.2 0 9 4.1 10 7a13 13 0 0 1-3.1 4.7M6.2 6.2C4.2 7.6 2.8 9.8 2 12c1 2.9 4.8 7 10 7 1.7 0 3.2-.4 4.5-1.1"/></svg></button>}
    </header>}
    <div className="portal-section-toolbar news-toolbar">
      <button type="button" className="portal-section-back news-back" onClick={() => setAdminView(mode === "home" ? "home" : "news")}>← Back to {mode === "home" ? "Menu" : "News"}</button>
      {(mode === "add" || mode === "expense") && <button type="button" className="news-soft-button" onClick={openDeleted}>🗑 Deleted News</button>}
    </div>

    {mode === "home" && <div className="news-choice-grid">
      {[
        ["add", "Add News", "Write a message and send it to selected marketers.", "✉", "news-add"],
        ["expense", "Expense News", "Choose dates and send each marketer their own expense PDF.", "▥", "news-expense"],
        ["old", "Old News", "Review, delete or restore sent news.", "▣", "news-old"]
      ].map(([tone, title, description, icon, view]) => <button type="button" className={`news-choice news-choice--${tone}`} key={tone} onClick={() => { setDeleted(false); setAdminView(view); }}>
        <span className="news-choice-icon" aria-hidden="true">{icon}</span><strong>{title}</strong><small>{description}</small><b>Open <span aria-hidden="true">→</span></b><span className={`news-choice-art news-choice-art--${tone}`} aria-hidden="true" />
      </button>)}
    </div>}

    {(mode === "add" || mode === "expense") && <form className="news-card news-compose" onSubmit={send}>
      <PanelHeading icon={mode === "add" ? "➤" : "➤"} title={mode === "add" ? "Send News" : "Send Expense News"}
        description={mode === "add" ? "Send a message to all or selected marketers." : "A separate expense report PDF will be prepared for each selected marketer."} />
      <div className={`news-send-fields news-send-fields--${mode}`}>
        <MarketerMultiSelect marketers={marketersList} selected={selectedIds} onChange={setSelectedIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" label="Select Marketer(s) *" />
        {mode === "expense" ? <>
          <label>From Date *<input style={inputStyle} type="date" required value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label>To Date *<input style={inputStyle} type="date" required min={fromDate || undefined} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        </> : <label>News Message *<textarea style={inputStyle} required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your news here" rows={4} /></label>}
      </div>
      <div className="news-form-actions"><button className="news-primary" type="submit" disabled={sending}>➤ {sending ? mode === "expense" ? "Preparing PDFs..." : "Sending..." : "Send"}</button></div>
    </form>}

    {mode === "expense" && <section className="news-card news-history">
      <PanelHeading icon="▤" title="Expense News History" description="Previously sent expense reports." />
      <div className="news-history-filters">
        <MarketerMultiSelect marketers={marketersList} selected={historySelectedIds} onChange={setHistorySelectedIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" label="Select Marketer(s)" />
        <label>From Date<input style={inputStyle} type="date" value={historyFromDraft} onChange={(event) => setHistoryFromDraft(event.target.value)} /></label>
        <label>To Date<input style={inputStyle} type="date" value={historyToDraft} onChange={(event) => setHistoryToDraft(event.target.value)} /></label>
        <button type="button" className="news-primary" onClick={() => { if (historyFromDraft && historyToDraft && historyFromDraft > historyToDraft) { showNotice("From Date must be before To Date."); return; } setHistoryFilters({ ids: historySelectedIds, from: historyFromDraft, to: historyToDraft }); }}>⌕ Search</button>
        <button type="button" className="news-soft-button" onClick={() => void reload()}>↻ Refresh</button>
      </div>
      {loading && <p>Loading history...</p>}{error && <p role="alert">{error}</p>}
      {!loading && !error && <div className="news-table-scroll"><table className="news-history-table"><thead><tr><th>Sr. No.</th><th>Marketer(s)</th><th>Date Range</th><th>Sent Date</th><th>Message</th><th>Action</th></tr></thead><tbody>
        {expenseHistory.map((item, index) => <tr key={item.id}><td>{index + 1}</td><td>{marketerLabel(item)}</td><td>{item.fromDate} to {item.toDate}</td><td>{formatDate(item.createdAt)}</td><td>{item.message || "Expense report"}</td><td><button type="button" className="news-table-delete" onClick={() => void changeDeleted(item)} title="Delete expense news" aria-label="Delete expense news">🗑</button></td></tr>)}
        {!expenseHistory.length && <tr><td colSpan={6} className="news-empty-cell">No expense news found for these filters.</td></tr>}
      </tbody></table></div>}
    </section>}

    {mode === "add" && <section className="news-card news-history">
      <PanelHeading icon="▤" title="Sent News" description="Recently sent team updates." action={<button type="button" className="news-soft-button" onClick={() => void reload()}>↻ Refresh</button>} />
      <div className="news-history-filters news-history-filters--simple"><MarketerMultiSelect marketers={marketersList} selected={historySelectedIds} onChange={setHistorySelectedIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" label="Select Marketer(s)" /></div>
      {loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}
      {!loading && !error && !generalHistory.length && <p>No news sent yet.</p>}
      <div className="news-list">{generalHistory.slice(0, 8).map((item, index) => <article className={`news-entry news-entry--${index % 4}`} key={item.id}><span className="news-entry-icon">▤</span><div className="news-entry-body"><strong>News</strong><p>{item.message}</p><small>▣ {formatDate(item.createdAt)} &nbsp; | &nbsp; 👥 {marketerLabel(item)}</small></div><button type="button" className="news-entry-action" onClick={() => void changeDeleted(item)}>🗑 Delete</button></article>)}</div>
    </section>}

    {mode === "old" && <>
      <div className="news-filter-bar">
        <span className="news-filter-icon" aria-hidden="true">👥</span>
        <MarketerMultiSelect marketers={marketersList} selected={oldSelectedIds} onChange={setOldSelectedIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" label="Select Marketer(s)" />
        <button type="button" className="news-primary" onClick={() => setDeleted((value) => !value)}>{deleted ? "Old News" : "🗑 Deleted News"}</button>
      </div>
      <section className="news-card news-history">
        <PanelHeading icon="▤" title={deleted ? "Deleted News" : "Old News"} description={deleted ? "Restore deleted news." : "Previously sent messages and expense reports."} action={<button type="button" className="news-soft-button" onClick={() => void reload()}>↻ Refresh</button>} />
        {loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}
        {!loading && !error && !oldNews.length && <p>No {deleted ? "deleted" : "sent"} news found.</p>}
        <div className="news-list">{oldNews.map((item, index) => <article className={`news-entry news-entry--${index % 4}`} key={item.id}>
          <span className="news-entry-icon">▤</span>
          <div className="news-entry-body"><strong>{item.kind === "expense" || item.fromDate ? "Expense Report" : "News"}</strong><p>{item.message}</p>{item.fromDate && <span>Expense report: {item.fromDate} to {item.toDate}</span>}<small>▣ {formatDate(item.createdAt)} &nbsp; | &nbsp; 👥 {marketerLabel(item)}</small></div>
          <button type="button" className="news-entry-action" onClick={() => void changeDeleted(item)}>{deleted ? "↻ Restore" : "🗑 Delete"}</button>
        </article>)}</div>
      </section>
    </>}
  </div>;
}

import React, { useEffect, useMemo, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { deleteNews, listNews, publishNews, restoreNews } from "../../services/newsApi.js";
import { confirmAction, showNotice } from "../../ui/confirmDialog.js";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import "../../styles/news.css";

export default function AdminNewsPanel({ mode = "home" }) {
  const { setAdminView, inputStyle, marketersList, fetchMarketers } = usePortalContext();
  const [message, setMessage] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
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
  useEffect(() => { if (mode === "old") void reload(); }, [mode]);

  const shownNews = useMemo(() => news.filter((item) => Boolean(item.deletedAt) === deleted)
    .filter((item) => !selectedIds.length || !Array.isArray(item.recipientIds)
      || selectedIds.some((id) => item.recipientIds.includes(id))), [news, deleted, selectedIds]);

  const send = async (event) => {
    event.preventDefault();
    if (mode === "expense" && fromDate > toDate) { showNotice("From Date must be before To Date."); return; }
    setSending(true);
    try {
      const result = await publishNews(mode === "expense"
        ? { kind: "expense", fromDate, toDate, recipientIds: selectedIds }
        : { kind: "general", message: message.trim(), recipientIds: selectedIds });
      setMessage(""); setFromDate(""); setToDate("");
      setAdminView("news-old");
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

  return <div className="news-page">
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back news-back" onClick={() => setAdminView(mode === "home" ? "home" : "news")}>← Back to {mode === "home" ? "Menu" : "News"}</button></div>
    {mode === "home" && <div className="news-choice-grid">
      <button type="button" className="news-choice" onClick={() => setAdminView("news-add")}><span>✉️</span><strong>Add News</strong><small>Write a message and send it to selected marketers.</small><b>Open →</b></button>
      <button type="button" className="news-choice" onClick={() => setAdminView("news-expense")}><span>📄</span><strong>Expense News</strong><small>Choose dates and send each marketer their own expense PDF.</small><b>Open →</b></button>
      <button type="button" className="news-choice" onClick={() => setAdminView("news-old")}><span>🗂️</span><strong>Old News</strong><small>Review, delete or restore sent news.</small><b>Open →</b></button>
    </div>}
    {mode !== "home" && <div className="news-filter-bar">
      <MarketerMultiSelect marketers={marketersList || []} selected={selectedIds} onChange={setSelectedIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" />
      <button type="button" className="news-primary" onClick={() => { if (mode !== "old") { setDeleted(true); setAdminView("news-old"); } else setDeleted((value) => !value); }}>{mode === "old" && deleted ? "Old News" : "Deleted News"}</button>
    </div>}
    {(mode === "add" || mode === "expense") && <form className="news-card news-compose" onSubmit={send}>
      <h2>{mode === "add" ? "Add News" : "Expense News"}</h2>
      <p>{mode === "add" ? "Write a message for the selected marketers." : "A separate expense report PDF will be prepared for each selected marketer."}</p>
      {mode === "add" && <label>News Message<textarea style={inputStyle} required maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your news here" rows={5} /></label>}
      {mode === "expense" && <div className="news-date-grid"><label>From Date<input style={inputStyle} type="date" required value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To Date<input style={inputStyle} type="date" required min={fromDate || undefined} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div>}
      <button className="news-primary" type="submit" disabled={sending}>{sending ? mode === "expense" ? "Preparing PDFs..." : "Sending..." : "Send"}</button>
    </form>}
    {mode === "old" && <section className="news-card"><div className="news-section-head"><div><h2>{deleted ? "Deleted News" : "Old News"}</h2><p>{deleted ? "Restore deleted news." : "Previously sent messages and expense reports."}</p></div><button type="button" className="news-primary" onClick={() => void reload()}>↻ Refresh</button></div>
      {loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}
      {!loading && !error && !shownNews.length && <p>No {deleted ? "deleted" : "sent"} news found.</p>}
      <div className="news-list">{shownNews.map((item) => <article className="news-entry" key={item.id}><strong>{item.title || "News"}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : ""} · {item.recipientIds?.length || "All"} marketer(s)</small>{item.message && <p>{item.message}</p>}{item.fromDate && <span>Expense report: {item.fromDate} to {item.toDate}</span>}<button type="button" className="news-primary" onClick={() => void changeDeleted(item)}>{deleted ? "Restore" : "Delete"}</button></article>)}</div>
    </section>}
  </div>;
}

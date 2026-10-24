import React, { useEffect, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { listNews, publishNews } from "../../services/newsApi.js";
import { showNotice } from "../../ui/confirmDialog.js";
import "../../styles/news.css";

export default function AdminNewsPanel({ mode = "home" }) {
  const { setAdminView, inputStyle } = usePortalContext();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "old") return;
    let active = true;
    setLoading(true);
    listNews().then((result) => { if (active) { setNews(result.news || []); setError(""); } })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode]);

  const send = async (event) => {
    event.preventDefault();
    if (fromDate > toDate) { showNotice("From Date must be before To Date."); return; }
    setSending(true);
    try {
      const result = await publishNews({ title: title.trim(), message: message.trim(), fromDate, toDate });
      setTitle(""); setMessage(""); setFromDate(""); setToDate("");
      setAdminView("news-old");
      const push = result.push || {};
      showNotice(push.configured
        ? `News sent. Phone notification accepted for ${push.delivered || 0} of ${push.subscribed || 0} subscribed devices. It is also available inside the portal.`
        : "News published in the portal. Phone notifications need VAPID keys on the API server.");
    } catch (failure) { showNotice(failure.message || "News could not be sent."); }
    finally { setSending(false); }
  };

  return <div className="news-page">
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back news-back" onClick={() => setAdminView(mode === "home" ? "home" : "news")}>← Back to {mode === "home" ? "Menu" : "News"}</button></div>
    {mode === "home" && <div className="news-choice-grid">
      <button type="button" className="news-choice" onClick={() => setAdminView("news-add")}><span>✉️</span><strong>Add News</strong><small>Select a date range and send each marketer their own expense report link.</small><b>Open →</b></button>
      <button type="button" className="news-choice" onClick={() => setAdminView("news-old")}><span>🗂️</span><strong>Old News</strong><small>Review news and report ranges already sent to marketers.</small><b>Open →</b></button>
    </div>}
    {mode === "add" && <form className="news-card news-compose" onSubmit={send}>
      <h2>Add News</h2><p>Every marketer will receive a link to their own expense report for this date range.</p>
      <label>News Title<input style={inputStyle} required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Expense report is ready" /></label>
      <label>Message<textarea style={inputStyle} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a short message for your team" rows={4} /></label>
      <div className="news-date-grid"><label>From Date<input style={inputStyle} type="date" required value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To Date<input style={inputStyle} type="date" required min={fromDate || undefined} value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div>
      <button className="news-primary" type="submit" disabled={sending}>{sending ? "Sending..." : "Send Notification"}</button>
    </form>}
    {mode === "old" && <section className="news-card"><div className="news-section-head"><div><h2>Old News</h2><p>Previously published news and report ranges.</p></div><button type="button" className="news-primary" onClick={() => setAdminView("news-add")}>+ Add News</button></div>
      {loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}
      {!loading && !error && !news.length && <p>No news sent yet.</p>}
      <div className="news-list">{news.map((item) => <article className="news-entry" key={item.id}><strong>{item.title}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : ""}</small>{item.message && <p>{item.message}</p>}<span>Expense report: {item.fromDate} to {item.toDate}</span></article>)}</div>
    </section>}
  </div>;
}

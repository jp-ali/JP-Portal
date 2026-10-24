import React, { useEffect, useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import { listNews, markNewsRead, newsReportUrl } from "../../services/newsApi.js";
import { enableNewsNotifications, newsNotificationStatus } from "../../services/newsPush.js";
import "../../styles/news.css";

export default function MarketerNewsPanel({ onRead }) {
  const { openExpenseReport, setMarketerview } = usePortalContext();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    listNews().then((result) => {
      if (!active) return;
      const items = result.news || [];
      setNews(items);
      const unreadIds = items.filter((item) => !item.read).map((item) => item.id);
      if (unreadIds.length) markNewsRead(unreadIds).then(() => onRead?.(unreadIds)).catch(() => {});
      const url = new URL(window.location.href);
      const selected = items.find((item) => item.id === url.searchParams.get("news"));
      if (url.searchParams.has("news")) {
        url.searchParams.delete("news");
        window.history.replaceState(window.history.state, "", url.href);
      }
      if (selected?.kind === "expense") window.location.assign(newsReportUrl(selected.id));
      else if (selected?.fromDate) openExpenseReport({ fromDate: selected.fromDate, toDate: selected.toDate });
    })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    newsNotificationStatus().then((value) => { if (active) setEnabled(value); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const enable = async () => {
    setEnabling(true); setNotice("");
    try { await enableNewsNotifications(); setEnabled(true); setNotice("Phone notifications enabled for this device."); }
    catch (failure) { setNotice(failure.message); }
    finally { setEnabling(false); }
  };

  return <div className="news-page">
    <div className="portal-section-toolbar"><button type="button" className="portal-section-back news-back" onClick={() => setMarketerview("home")}>← Back to Menu</button></div>
    <section className="news-card news-enable"><div className="news-section-head"><div><h2>News</h2><p>Updates and expense reports from Admin.</p></div>{!enabled && <button type="button" className="news-primary" onClick={enable} disabled={enabling}>{enabling ? "Enabling..." : "Enable Notifications"}</button>}</div>
      {enabled && <p className="news-status">🔔 Phone notifications are enabled on this device.</p>}{notice && <p className="news-status" role="status">{notice}</p>}
    </section>
    <section className="news-card">{loading && <p>Loading news...</p>}{error && <p role="alert">{error}</p>}{!loading && !error && !news.length && <p>No news yet.</p>}
      <div className="news-list">{news.map((item) => <article className="news-entry" key={item.id}><strong>{item.title || "News"}</strong><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : ""}</small>{item.message && <p>{item.message}</p>}{item.fromDate && <span>Your expense report: {item.fromDate} to {item.toDate}</span>}{item.kind === "expense" ? <div className="news-entry-actions"><a className="news-primary" href={newsReportUrl(item.id)} target="_blank" rel="noopener noreferrer">Open PDF →</a><a className="news-primary" href={newsReportUrl(item.id, true)}>Download PDF</a></div> : item.fromDate && <button type="button" className="news-primary" onClick={() => openExpenseReport({ fromDate: item.fromDate, toDate: item.toDate })}>Open My Expense Report →</button>}</article>)}</div>
    </section>
  </div>;
}

import React from "react";

function latestDate(people) {
  const dates = people.flatMap((person) => person.items.map((item) => {
    const value = item.date || item.visitDate || item.createdAt;
    if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
    return String(value || "").slice(0, 10);
  })).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  if (!dates.length) return "—";
  const date = new Date(`${dates.sort().at(-1)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function MediaOverview({ people, onOpen }) {
  const pictureCount = people.reduce((count, person) => count + person.items.length, 0);
  const stats = [
    { icon: "👥", value: people.length, label: "Total Marketers", tone: "rose" },
    { icon: "🖼️", value: pictureCount, label: "Total Pictures", tone: "blue" },
    { icon: "📅", value: latestDate(people), label: "Latest Date", tone: "green" },
    { icon: "⭐", value: people.filter((person) => person.items.length > 0).length, label: "Active Marketers", tone: "gold" },
  ];
  return <div className="media-overview-desktop">
    <div className="media-overview-stats">{stats.map((stat) => <div className={`media-overview-stat media-overview-stat--${stat.tone}`} key={stat.label}><span aria-hidden="true">{stat.icon}</span><div><strong>{stat.value}</strong><small>{stat.label}</small></div></div>)}</div>
    {people.length ? <div className="media-overview-grid">{people.map((person) => <button type="button" className="media-overview-person" key={person.key} onClick={() => onOpen(person)}>
      <span className="media-overview-person-top"><span className="media-overview-avatar" aria-hidden="true">👤</span><span className="media-overview-person-info"><strong>{person.name}</strong><small>{person.area || person.email || "Marketer"}</small></span><span className="media-overview-open" aria-hidden="true">→</span></span>
      <span className="media-overview-count">▧ {person.items.length} picture(s)</span>
      <span className="media-overview-thumbs">{person.items.filter((item) => item.image).slice(0, 3).map((item, index) => <img src={item.image} alt="" loading="lazy" key={item.id || index} />)}</span>
    </button>)}</div> : <div className="media-overview-empty">No pictures found in this date range.</div>}
  </div>;
}

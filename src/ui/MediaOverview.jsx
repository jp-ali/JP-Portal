import React from "react";

export default function MediaOverview({ people, onOpen }) {
  return <div className="media-overview-desktop">
    {people.length ? <div className="media-overview-grid">{people.map((person) => <button type="button" className="media-overview-person" key={person.key} onClick={() => onOpen(person)}>
      <span className="media-overview-person-top"><span className="media-overview-avatar" aria-hidden="true">👤</span><span className="media-overview-person-info"><strong>{person.name}</strong><small>{person.area || person.email || "Marketer"}</small></span><span className="media-overview-open" aria-hidden="true">→</span></span>
      <span className="media-overview-count">▧ {person.items.length} picture(s)</span>
      <span className="media-overview-thumbs">{person.items.filter((item) => item.image).slice(0, 3).map((item, index) => <img src={item.image} alt="" loading="lazy" key={item.id || index} />)}</span>
    </button>)}</div> : <div className="media-overview-empty">No pictures found in this date range.</div>}
  </div>;
}

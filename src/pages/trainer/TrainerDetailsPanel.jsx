import React, { useState } from "react";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import defaultAvatar from "../../assets/default-marketer-avatar.svg";

function TrainerDetailCard({ trainer, onView, onEdit, onArchive, busy }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name = trainer.name || "Unnamed Trainer";
  return <article className="marketer-detail-card">
    <div className="marketer-detail-card-top">
      <button type="button" className="marketer-detail-card-avatar" onClick={onView} aria-label={`View ${name} details`}><img src={trainer.profilePhoto || defaultAvatar} alt="" /></button>
      <div className="marketer-detail-card-identity"><strong>{name}</strong><small title={trainer.email}>{trainer.email || "No email"}</small><span className={`marketer-detail-card-status${trainer.active ? "" : " trainer-detail-inactive"}`}><i />{trainer.active ? "Active" : "Inactive"}</span></div>
      <button type="button" className="marketer-detail-card-view" onClick={onView}>View Details →</button>
      <div className="marketer-detail-card-options"><button type="button" className="marketer-detail-card-more" aria-label={`${name} options`} aria-expanded={menuOpen} data-escape-close onClick={() => setMenuOpen((open) => !open)}>⋮</button>{menuOpen && <div className="marketer-detail-card-menu"><button type="button" onClick={() => { setMenuOpen(false); onView(); }}>View Details</button><button type="button" onClick={() => { setMenuOpen(false); onEdit(); }}>Edit Details</button><button type="button" disabled={busy} onClick={() => { setMenuOpen(false); onArchive(); }}>Delete Trainer</button></div>}</div>
    </div>
    <div className="marketer-detail-card-facts"><div><span aria-hidden="true">☎</span><p title={trainer.phone || "N/A"}><strong>{trainer.phone || "N/A"}</strong><small>Phone</small></p></div><div><span aria-hidden="true">▣</span><p title={trainer.designation || "Trainer"}><strong>{trainer.designation || "Trainer"}</strong><small>Designation</small></p></div></div>
  </article>;
}

function ProfileField({ icon, label, value }) {
  return <div className="marketer-profile-field"><span aria-hidden="true">{icon}</span><div><small>{label}</small><strong title={value || "N/A"}>{value || "N/A"}</strong></div></div>;
}

export default function TrainerDetailsPanel({ trainers, selectedIds, onSelectIds, search, onSearch, selectedTrainer, onSelectTrainer, onRefresh, onEdit, onArchive, onToggleActive, onExpandPhoto, busy, inputStyle }) {
  const filtered = trainers.filter((trainer) => {
    if (selectedIds.length && !selectedIds.includes(trainer.id)) return false;
    const query = search.trim().toLowerCase();
    return !query || `${trainer.name || ""} ${trainer.email || ""} ${trainer.phone || ""} ${trainer.designation || ""}`.toLowerCase().includes(query);
  });
  return <>
    {!selectedTrainer ? <>
      <h3 className="trainer-details-title">♟ Active Trainers Details</h3>
      <div className="marketer-detail-filters">
        <div className="marketer-detail-search-group"><label className="marketer-detail-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search trainer by name or email..." value={search} onChange={(event) => onSearch(event.target.value)} aria-label="Search trainers" /></label><button type="button" className="marketer-detail-refresh" onClick={onRefresh} aria-label="Refresh trainers" title="Refresh trainers">↻</button></div>
        <MarketerMultiSelect marketers={trainers} selected={selectedIds} onChange={onSelectIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Trainers" itemLabel="Trainer" pluralLabel="Trainers" height={42} />
      </div>
      {filtered.length ? <div className="marketer-detail-grid">{filtered.map((trainer) => <TrainerDetailCard key={trainer.id} trainer={trainer} onView={() => onSelectTrainer(trainer.id)} onEdit={() => onEdit(trainer)} onArchive={() => onArchive(trainer)} busy={busy} />)}</div> : <p className="trainer-empty">No trainers found.</p>}
    </> : <div className="marketer-profile"><div className="marketer-profile-main">
      <aside className="marketer-profile-side"><button type="button" className="marketer-profile-photo" onClick={() => onExpandPhoto(selectedTrainer.profilePhoto || defaultAvatar)} aria-label={`View ${selectedTrainer.name || "trainer"} photo`}><img src={selectedTrainer.profilePhoto || defaultAvatar} alt="" /></button><h2>{selectedTrainer.name || "Unnamed Trainer"}</h2><p>{selectedTrainer.designation || "Trainer"}</p><span className={`marketer-profile-status${selectedTrainer.active ? "" : " trainer-detail-inactive"}`}>● {selectedTrainer.active ? "Active" : "Inactive"}</span></aside>
      <div className="marketer-profile-content"><div className="marketer-profile-heading"><h3>👤 Personal Information</h3><div className="marketer-profile-heading-actions"><button type="button" onClick={() => onEdit(selectedTrainer)}>✎ Edit Details</button><button type="button" disabled={busy} onClick={() => onToggleActive(selectedTrainer)}>{selectedTrainer.active ? "Deactivate" : "Activate"}</button></div></div><div className="marketer-profile-fields"><ProfileField icon="👤" label="Name" value={selectedTrainer.name} /><ProfileField icon="☎" label="Phone" value={selectedTrainer.phone} /><ProfileField icon="✉" label="Email" value={selectedTrainer.email} /><ProfileField icon="▣" label="Designation" value={selectedTrainer.designation || "Trainer"} /><ProfileField icon="◉" label="Account Status" value={selectedTrainer.active ? "Active" : "Inactive"} /><ProfileField icon="▦" label="Joined" value={selectedTrainer.createdAt ? new Date(selectedTrainer.createdAt).toLocaleDateString("en-PK") : "N/A"} /></div></div>
    </div></div>}
  </>;
}

import React, { useEffect, useState } from "react";
import { cardStyle, inputStyle } from "../../ui/portalPresentation.jsx";
import { downloadTrainerPhotoArchive } from "../../services/trainerPhotoArchive.js";

export default function TrainerVisitsPanel({ view, admin, visits, trainers, trainerId, setTrainerId, filter, setFilter, expandedView, reportControls, refresh }) {
  const title = view === "today-visits" ? "Today's Visits" : "All Visits";
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoVisits = visits.filter((visit) => visit.photoAvailable);
  const trainerOptions = [...trainers, ...visits.filter((visit) => visit.trainerId?.startsWith("marketer_") && !trainers.some((trainer) => trainer.id === visit.trainerId)).map((visit) => ({ id: visit.trainerId, name: `${visit.trainerName || visit.trainerEmail || "Marketer"} (offline trainer)` }))].filter((person, index, rows) => rows.findIndex((row) => row.id === person.id) === index);
  useEffect(() => {
    const available = new Set(photoVisits.map((visit) => visit.id));
    setSelectedPhotoIds((current) => current.filter((id) => available.has(id)));
  }, [visits]);
  const selected = photoVisits.filter((visit) => selectedPhotoIds.includes(visit.id));
  const allSelected = photoVisits.length > 0 && selected.length === photoVisits.length;
  const downloadSelected = async () => {
    setDownloadBusy(true); setPhotoError("");
    try {
      await downloadTrainerPhotoArchive(selected.map((visit) => ({ type: "visit", id: visit.id, name: visit.schoolName || "School", date: visit.date })), `Trainer_Visit_Photos_${view === "today-visits" ? "Today" : "Selected"}.zip`);
    } catch (cause) { setPhotoError(cause.message || "Selected photos could not be downloaded."); }
    finally { setDownloadBusy(false); }
  };
  return <div className={`trainer-report ${expandedView === view ? "admin-report-expanded" : ""}`}>
    {reportControls(view, refresh)}
    <div style={cardStyle}><h3>{title}</h3><p>{admin ? "Review trainer school visits and photos." : "Review your school visit reports and photos."}</p>
      <div className="trainer-filters">
        {admin && <label>Trainer<select style={inputStyle} value={trainerId} onChange={(event) => setTrainerId(event.target.value)}><option value="">All trainers</option>{trainerOptions.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}</select></label>}
        {view === "visits" && <><label>From<input style={inputStyle} type="date" value={filter.from} onChange={(event) => setFilter({ ...filter, from: event.target.value })} /></label><label>To<input style={inputStyle} type="date" value={filter.to} onChange={(event) => setFilter({ ...filter, to: event.target.value })} /></label></>}
      </div>
      {!!photoVisits.length && <div className="trainer-photo-selection"><button type="button" onClick={() => setSelectedPhotoIds(allSelected ? [] : photoVisits.map((visit) => visit.id))}>{allSelected ? "Clear All" : "Select All Photos"}</button><button type="button" disabled={!selected.length || downloadBusy} onClick={downloadSelected}>{downloadBusy ? "Preparing ZIP..." : `Download Selected (${selected.length})`}</button></div>}
      {photoError && <p className="trainer-alert error" role="alert">{photoError}</p>}
      <div className="trainer-table-wrap"><table className="trainer-report-table trainer-visits-table"><thead><tr><th>Date</th>{admin && !trainerId && <th>Trainer</th>}<th>Time</th><th>City</th><th>School</th><th>Principal</th><th>Phone</th><th>Remarks</th><th>Photo</th></tr></thead><tbody>{visits.map((visit) => { const photo = `/api/trainers/visits/${encodeURIComponent(visit.id)}/photo`; return <tr key={visit.id}><td>{visit.date}</td>{admin && !trainerId && <td>{visit.trainerName}</td>}<td>{visit.visitTime}</td><td>{visit.cityName}</td><td>{visit.schoolName}</td><td>{visit.principalName}</td><td>{visit.phone}</td><td>{visit.notes || "-"}</td><td>{visit.photoAvailable && <div className="trainer-photo-cell"><label><input type="checkbox" checked={selectedPhotoIds.includes(visit.id)} onChange={(event) => setSelectedPhotoIds((current) => event.target.checked ? [...current, visit.id] : current.filter((id) => id !== visit.id))} aria-label={`Select photo for ${visit.schoolName || "school"} on ${visit.date}`} /> Select</label><a href={photo} target="_blank" rel="noopener noreferrer">View</a><a href={photo} download={`Trainer_Visit_${visit.date}.jpg`}>Download</a></div>}</td></tr>; })}</tbody></table>{!visits.length && <div className="trainer-empty">No visits found.</div>}</div>
    </div>
  </div>;
}

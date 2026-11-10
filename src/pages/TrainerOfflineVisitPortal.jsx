import React, { useEffect, useRef, useState } from "react";
import { confirmAction } from "../ui/confirmDialog.js";
import { compressCanvasToTargetDataUrl } from "../services/imageCompression.js";
import { getRequiredVisitPosition, gpsStamp } from "../services/requiredVisitLocation.js";
import { drawVisitPhotoStamp, formatVisitPhotoTimestamp } from "../services/visitPhotos.js";
import { checkTrainerCompressedPhoto, checkTrainerPhotoFile, TRAINER_VISIT_PHOTO_KB } from "../services/trainerPhotoChecks.js";
import { readTrainerOfflineCatalog } from "../services/trainerOfflineCatalog.js";
import { readOfflineVisitCatalog } from "../services/offlineVisitCatalog.js";
import { getSchoolVisitDetails } from "../domain/schoolVisitDetails.js";
import { listOfflineVisits, removeOfflineVisit, saveOfflineVisit } from "../services/offlineVisitStore.js";
import offlineCss from "../styles/offlineVisit.css?raw";

const emptyForm = { cityId: "", cityName: "", schoolId: "", schoolName: "", principalName: "", phone: "", notes: "" };

async function preparePhoto(file) {
  checkTrainerPhotoFile(file);
  const location = gpsStamp(await getRequiredVisitPosition());
  let image = file;
  if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type)) {
    const { default: convert } = await import("heic2any");
    const converted = await convert({ blob: file, toType: "image/jpeg" });
    image = Array.isArray(converted) ? converted[0] : converted;
  }
  const url = URL.createObjectURL(image);
  try {
    const picture = new Image();
    await new Promise((resolve, reject) => { picture.onload = resolve; picture.onerror = () => reject(new Error("Photo could not be opened.")); picture.src = url; });
    const scale = Math.min(1, 1600 / Math.max(picture.naturalWidth, picture.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    const capturedAt = new Date();
    drawVisitPhotoStamp(canvas, context, { ...formatVisitPhotoTimestamp(capturedAt), locationText: location, attribution: "" });
    const data = compressCanvasToTargetDataUrl(canvas, TRAINER_VISIT_PHOTO_KB * 1024, 900, .5);
    return { image: checkTrainerCompressedPhoto(data, TRAINER_VISIT_PHOTO_KB, "Visit"), capturedAt: capturedAt.toISOString() };
  } finally { URL.revokeObjectURL(url); }
}

export default function TrainerOfflineVisitPortal({ user, cachedProfile, online, onSignIn, onResume, onSync, onBackToLogin, switcher }) {
  const profile = user || cachedProfile;
  const email = String(profile?.email || "").trim().toLowerCase();
  const accountId = profile?.trainerId || profile?.marketerId || "";
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const cameraInput = useRef(null);
  const galleryInput = useRef(null);
  const refresh = () => listOfflineVisits().then((items) => setDrafts(items.filter((item) => item.mode === "trainer" && item.ownerEmail === email && item.ownerAccountId === accountId))).catch((error) => setMessage(error.message));
  useEffect(() => { if (email && accountId) refresh(); }, [email, accountId]);
  useEffect(() => {
    const changed = () => { if (email && accountId) refresh(); };
    window.addEventListener("offline-visits-changed", changed);
    return () => window.removeEventListener("offline-visits-changed", changed);
  }, [email, accountId]);
  const trainerCatalog = readTrainerOfflineCatalog(email, accountId);
  const marketerCatalog = profile?.role === "marketer" ? readOfflineVisitCatalog(email) : { cities: [], schools: [] };
  const cities = [...new Map([...trainerCatalog.cities, ...marketerCatalog.cities].filter((row) => row?.id && row?.name).map((row) => [row.id, row])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const schools = [...new Map([...trainerCatalog.schools, ...marketerCatalog.schools].filter((row) => row?.id && row?.name && row.cityId === form.cityId).map((row) => [row.id, row])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const chooseCity = (event) => {
    const city = cities.find((item) => item.id === event.target.value);
    setForm({ ...emptyForm, cityId: city?.id || "", cityName: city?.name || "" }); setPhoto(null);
  };
  const chooseSchool = (event) => {
    const school = schools.find((item) => item.id === event.target.value);
    setForm((current) => ({ ...current, schoolId: school?.id || "", schoolName: school?.name || "", ...getSchoolVisitDetails(school) }));
  };
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setPhoto(null); setBusy(true); setMessage("");
    try { setPhoto(await preparePhoto(file)); }
    catch (error) { setMessage(error.message || "Photo could not be opened."); }
    finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setMessage("");
    if (!email || !accountId) { setMessage("Sign in online once before using Trainer offline visits."); return; }
    if (!photo?.image) { setMessage("Take or choose a visit photo first."); return; }
    setBusy(true);
    try {
      await saveOfflineVisit({ ...form, cityName: form.cityName.trim(), schoolName: form.schoolName.trim(), principalName: form.principalName.trim(), phone: form.phone.trim(), notes: form.notes.trim(), image: photo.image, capturedAt: photo.capturedAt, ownerEmail: email, ownerAccountId: accountId, mode: "trainer" });
      setForm(emptyForm); setPhoto(null); setMessage("Trainer visit saved on this device. It will sync after you sign in online.");
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const syncNow = async () => {
    if (!user) { onSignIn(); return; }
    setBusy(true); setMessage("");
    try { const result = await onSync(true); await refresh(); setMessage(result.error || (result.synced ? `${result.synced} visit(s) uploaded.` : "No visits uploaded yet.")); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!await confirmAction("Delete this offline trainer visit?")) return;
    try { await removeOfflineVisit(id); await refresh(); } catch (error) { setMessage(error.message); }
  };
  return <div className="offline-portal trainer-offline-portal"><style>{offlineCss}</style>
    <header className="offline-header"><div className="offline-logo">JP.</div><div><strong>JAVED PUBLISHERS</strong><small>Trainer Visit Portal</small></div><span className="offline-badge">{online ? "Draft mode" : "Offline"}</span></header>
    <main className="offline-main">{switcher}<button className="offline-back" type="button" onClick={onBackToLogin}>← Back to Login</button>
      <div className="offline-welcome"><div><span>Welcome, {profile?.name || email}</span><h1>Trainer offline visits</h1><p>Only Add Visit is available offline. Your drafts stay on this device until sync.</p></div>{online && <button type="button" className="offline-secondary" onClick={user ? onResume : onSignIn}>{user ? "Open portal" : "Sign in to sync"}</button>}</div>
      <section className="offline-card"><div className="offline-section-heading"><div><h2>Add Visit</h2><p>Enter school details and attach a photo.</p></div><span>{drafts.length} pending</span></div>
        <form className="offline-form" onSubmit={save}>
          <div className="offline-location offline-wide"><h3>Visit Location</h3><div className="offline-location-grid">
            <label>City *<select value={form.cityId || "custom"} onChange={chooseCity}><option value="custom">Add city</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>{!form.cityId && <input value={form.cityName} onChange={setField("cityName")} placeholder="Enter city name" maxLength={120} required />}</label>
            <label>School *<select value={form.schoolId || "custom"} onChange={chooseSchool} disabled={!form.cityName}><option value="custom">Add school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select>{!form.schoolId && <input value={form.schoolName} onChange={setField("schoolName")} placeholder="Enter school name" maxLength={200} required />}</label>
          </div></div>
          <label>Contact Person *<input value={form.principalName} onChange={setField("principalName")} required maxLength={200} /></label>
          <label>Phone *<input type="tel" value={form.phone} onChange={setField("phone")} required maxLength={100} /></label>
          <label className="offline-wide">Visit Notes / Remarks<textarea value={form.notes} onChange={setField("notes")} rows="3" /></label>
          <div className="offline-photo-field offline-wide"><strong>School photo * · GPS location required ({TRAINER_VISIT_PHOTO_KB} KB maximum)</strong><div className="offline-photo-actions"><button type="button" onClick={() => cameraInput.current?.click()} disabled={busy}>📷 Take Photo</button><button type="button" onClick={() => galleryInput.current?.click()} disabled={busy}>🖼️ Choose from Gallery</button></div><input ref={cameraInput} className="offline-file-input" type="file" accept="image/*" capture="environment" onChange={choosePhoto} /><input ref={galleryInput} className="offline-file-input" type="file" accept="image/*" onChange={choosePhoto} /></div>
          {photo && <img className="offline-photo" src={photo.image} alt="School visit preview" />}
          <button className="offline-save offline-wide" type="submit" disabled={busy}>{busy ? "Saving..." : "Save visit on this device"}</button>
        </form>{message && <p className="offline-message" role="status">{message}</p>}
      </section>
      <section className="offline-card"><div className="offline-section-heading"><div><h2>Pending trainer visits</h2><p>Saved on this device until upload succeeds.</p></div>{drafts.length > 0 && <button type="button" onClick={syncNow} disabled={busy}>{online && user ? "Sync now" : "Sign in to sync"}</button>}</div>{drafts.length ? <div className="offline-drafts">{drafts.map((draft) => <div className="offline-draft" key={draft.id}><div><strong>{draft.schoolName}</strong><small>{draft.cityName} · {new Date(draft.capturedAt).toLocaleString()}</small></div><button type="button" onClick={() => remove(draft.id)}>Delete</button></div>)}</div> : <p>No pending trainer visits.</p>}</section>
    </main>
  </div>;
}

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { request } from "../../services/authApi.js";
import { getSchoolVisitDetails } from "../../domain/schoolVisitDetails.js";
import { compressCanvasToTargetDataUrl } from "../../services/imageCompression.js";
import { checkTrainerCompressedPhoto, checkTrainerPhotoFile, TRAINER_VISIT_PHOTO_KB } from "../../services/trainerPhotoChecks.js";
import { getRequiredVisitPosition, visitLocationStamp } from "../../services/requiredVisitLocation.js";
import { drawVisitPhotoStamp } from "../../services/visitPhotos.js";
import { attachCameraPreview, cameraStartMessage, CameraPlaybackRequiredError, hasCameraFrame } from "../../services/cameraPreview.js";
import { btnPrimary, cardStyle, inputStyle } from "../../ui/portalPresentation.jsx";
import { cacheTrainerOfflineCatalog } from "../../services/trainerOfflineCatalog.js";

const initial = { cityId: "", schoolId: "", principalName: "", phone: "", notes: "", image: "" };

export default function TrainerAddVisitPanel({ onBack, email, trainerId }) {
  const [form, setForm] = useState(initial);
  const [cities, setCities] = useState([]);
  const [newCity, setNewCity] = useState("");
  const [schools, setSchools] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [newSchool, setNewSchool] = useState("");
  const [editingSchool, setEditingSchool] = useState("");
  const [editingName, setEditingName] = useState("");
  const [schoolEditorMode, setSchoolEditorMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoOpen, setPhotoOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(0);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const loadCities = async () => { const result = await request("/trainers/locations/cities"); setCities(result.cities || []); cacheTrainerOfflineCatalog(email, trainerId, { cities: result.cities || [] }); };
  useEffect(() => { loadCities().catch((cause) => setError(cause.message)); }, []);
  const loadSchools = async (cityId) => {
    const result = await request(`/trainers/locations/schools?cityId=${encodeURIComponent(cityId)}`);
    setSchools(result.schools || []);
    cacheTrainerOfflineCatalog(email, trainerId, { schools: result.schools || [] });
    return result.schools || [];
  };
  useEffect(() => { if (!form.cityId) { setSchools([]); return; } loadSchools(form.cityId).catch((cause) => setError(cause.message)); }, [form.cityId]);
  useEffect(() => () => { requestRef.current += 1; streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);
  useEffect(() => {
    if (!photoOpen) return undefined;
    const close = (event) => { if (event.key === "Escape") { event.stopImmediatePropagation(); setPhotoOpen(false); } };
    window.addEventListener("keydown", close, true);
    return () => window.removeEventListener("keydown", close, true);
  }, [photoOpen]);

  const stopCamera = () => {
    requestRef.current += 1;
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPreviewActive(false); setCameraBusy(false);
  };
  const releasePreviewForPhoneCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError("Camera preview needs HTTPS. Use the phone camera button below."); return null; }
    const id = ++requestRef.current;
    setCameraBusy(true); setCameraError("");
    if (streamRef.current && videoRef.current) {
      try {
        const element = await attachCameraPreview(videoRef, streamRef.current);
        if (id !== requestRef.current) return null;
        setCameraBusy(false);
        return element;
      } catch (cause) {
        if (id !== requestRef.current) return null;
        if (cause instanceof CameraPlaybackRequiredError) {
          setCameraBusy(false); setCameraError(cause.message);
          return null;
        }
      }
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPreviewActive(false);
    try {
      await getRequiredVisitPosition();
      if (id !== requestRef.current) return null;
    } catch (cause) {
      if (id !== requestRef.current) return null;
      setCameraBusy(false);
      setCameraError(cause.message || "Allow Location access, then retry the camera.");
      return null;
    }
    setPreviewActive(true);
    let lastError;
    for (const video of [{ facingMode: { ideal: "environment" } }, true]) {
      if (id !== requestRef.current) return null;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (id !== requestRef.current) { stream.getTracks().forEach((track) => track.stop()); return null; }
        streamRef.current = stream;
        const element = await attachCameraPreview(videoRef, stream);
        if (id !== requestRef.current) return null;
        setCameraBusy(false);
        return element;
      } catch (cause) {
        lastError = cause;
        if (id !== requestRef.current) return null;
        if (cause instanceof CameraPlaybackRequiredError) {
          setCameraBusy(false); setCameraError(cause.message);
          return null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
        if (cause?.name === "NotAllowedError" || cause?.name === "SecurityError") break;
      }
    }
    if (id === requestRef.current) { stopCamera(); setCameraError(cameraStartMessage(lastError)); console.warn("Trainer camera unavailable:", lastError); }
    return null;
  };
  const stampPhoto = async (canvas, verifiedPosition) => {
    const context = canvas.getContext("2d");
    const now = new Date();
    const location = await visitLocationStamp(verifiedPosition || await getRequiredVisitPosition());
    const date = now.toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", weekday: "long", day: "2-digit", month: "short", year: "numeric" });
    const time = now.toLocaleTimeString("en-PK", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true });
    drawVisitPhotoStamp(canvas, context, { dateText: date, timeText: time, locationText: location });
    set("image", checkTrainerCompressedPhoto(compressCanvasToTargetDataUrl(canvas, TRAINER_VISIT_PHOTO_KB * 1024, 900, .5), TRAINER_VISIT_PHOTO_KB, "Visit"));
    stopCamera(); setCameraError("");
  };
  const capture = async () => {
    if (cameraBusy) return;
    set("image", "");
    let video = videoRef.current;
    if (!hasCameraFrame(video, streamRef.current)) video = await startCamera();
    if (!hasCameraFrame(video, streamRef.current)) return;
    setCameraBusy(true);
    try {
      const position = await getRequiredVisitPosition();
      if (!hasCameraFrame(video, streamRef.current)) throw new Error("Camera preview stopped. Reopen the camera and retry the photo.");
      const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext("2d"); context.drawImage(video, 0, 0); await stampPhoto(canvas, position);
    }
    catch (cause) { stopCamera(); setCameraError(cause.message || "Camera frame stopped. Try again or use the phone camera."); console.warn(cause); }
  };
  const captureFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    set("image", "");
    setCameraBusy(true); setCameraError("");
    let url;
    try {
      checkTrainerPhotoFile(file);
      let image = file;
      if (/\.(heic|heif)$/i.test(file.name) || /^image\/hei[cf]$/i.test(file.type)) { const { default: convert } = await import("heic2any"); const result = await convert({ blob: file, toType: "image/jpeg" }); image = Array.isArray(result) ? result[0] : result; }
      url = URL.createObjectURL(image);
      const picture = new Image();
      await new Promise((resolve, reject) => { picture.onload = resolve; picture.onerror = () => reject(new Error("Photo could not be opened.")); picture.src = url; });
      const scale = Math.min(1, 1600 / Math.max(picture.naturalWidth, picture.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale)); canvas.getContext("2d").drawImage(picture, 0, 0, canvas.width, canvas.height);
      await stampPhoto(canvas);
    } catch (cause) { setCameraError(cause.message || "Photo could not be opened."); }
    finally { if (url) URL.revokeObjectURL(url); setCameraBusy(false); }
  };
  const chooseSchool = (school) => { const { principalName, phone } = getSchoolVisitDetails(school); setForm((current) => ({ ...current, schoolId: school.id, principalName, phone })); setSchoolSearch(""); };
  const addCity = async () => {
    if (!newCity.trim()) return;
    setLoading(true); setError("");
    try {
      const { city } = await request("/trainers/locations/cities", { method: "POST", body: JSON.stringify({ name: newCity }) });
      await loadCities();
      setForm({ ...initial, cityId: city.id }); setSchoolSearch(""); setNewCity("");
    } catch (cause) { setError(cause.message); } finally { setLoading(false); }
  };
  const addSchool = async () => {
    if (!newSchool.trim() || !form.cityId) return;
    setLoading(true); setError("");
    try { const result = await request("/trainers/locations/schools", { method: "POST", body: JSON.stringify({ cityId: form.cityId, name: newSchool }) }); const schoolsForCity = await loadSchools(form.cityId); chooseSchool(schoolsForCity.find((school) => school.id === result.school.id) || result.school); setNewSchool(""); setSchoolEditorMode(""); }
    catch (cause) { setError(cause.message); } finally { setLoading(false); }
  };
  const saveSchoolName = async (school) => {
    setLoading(true); setError("");
    try { await request(`/trainers/locations/schools/${encodeURIComponent(school.id)}`, { method: "PATCH", body: JSON.stringify({ name: editingName }) }); await loadSchools(form.cityId); setEditingSchool(""); }
    catch (cause) { setError(cause.message); } finally { setLoading(false); }
  };
  const removeSchool = async (school) => {
    if (!window.confirm(`Remove ${school.name}?`)) return;
    setLoading(true); setError("");
    try { await request(`/trainers/locations/schools/${encodeURIComponent(school.id)}`, { method: "DELETE" }); await loadSchools(form.cityId); if (form.schoolId === school.id) setForm((current) => ({ ...current, schoolId: "", principalName: "", phone: "" })); }
    catch (cause) { setError(cause.message); } finally { setLoading(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (!form.schoolId || !form.image) { setError("Select a school and take a school photo before submitting."); return; }
    setLoading(true);
    try { await request("/trainers/visits", { method: "POST", body: JSON.stringify(form), timeoutMs: 45000 }); setSuccess("Visit report submitted. School details will fill automatically next time."); setForm(initial); setSchools([]); setSchoolEditorMode(""); setPhotoOpen(false); }
    catch (cause) { setError(cause.message); } finally { setLoading(false); }
  };
  const ownSchools = schools.filter((school) => school.source === "manual-trainer");
  const visibleSchools = schools.filter((school) => school.name.toLowerCase().includes(schoolSearch.toLowerCase()));
  return <div className="trainer-visit-page"><button type="button" className="trainer-back" onClick={() => { stopCamera(); onBack(); }}>Back to Menu</button><div style={cardStyle}>
    {error && <p className="trainer-alert error" role="alert">{error}</p>}{success && <p className="trainer-alert" role="status">{success}</p>}
    <form className="trainer-visit-form" onSubmit={submit}>
      <section className="trainer-visit-location"><h3>Visit Location</h3>
        <div className="trainer-visit-fields">
          <label>Step 1: Add City
            <div className="trainer-city-entry"><input style={inputStyle} value={newCity} onChange={(event) => setNewCity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCity(); } }} placeholder="Enter city name" maxLength={120} /><button type="button" disabled={loading || !newCity.trim()} onClick={addCity}>+ Add City</button></div>
          </label>
          <label>Choose City<select required style={inputStyle} value={form.cityId} onChange={(event) => { setForm({ ...initial, cityId: event.target.value }); setSchoolSearch(""); setSchoolEditorMode(""); }}><option value="">Select city</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
        </div>
        <label>Step 2: Select School<input type="search" style={inputStyle} disabled={!form.cityId} placeholder="Search school in this city" value={schoolSearch} onChange={(event) => setSchoolSearch(event.target.value)} /></label>
        {form.cityId && <><div className="trainer-school-list" role="radiogroup" aria-label="Select school">{visibleSchools.map((school) => <label key={school.id}><input type="radio" name="trainer-school" checked={form.schoolId === school.id} onChange={() => chooseSchool(school)} /><span>{school.name}</span></label>)}{!visibleSchools.length && <p>No schools found in this city. Add a school below.</p>}</div>
          <div className="trainer-school-actions"><button type="button" onClick={() => setSchoolEditorMode((current) => current === "add" ? "" : "add")}>+ Add School</button><button type="button" onClick={() => setSchoolEditorMode((current) => current === "edit" ? "" : "edit")}>✎ Edit School</button></div>
          {schoolEditorMode === "add" && <div className="trainer-school-editor"><div><input style={inputStyle} value={newSchool} onChange={(event) => setNewSchool(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSchool(); } }} placeholder="Enter school name" maxLength={200} /><button type="button" disabled={loading || !newSchool.trim()} onClick={addSchool}>Add</button></div></div>}
          {schoolEditorMode === "edit" && <div className="trainer-school-editor"><h4>Your Added Schools</h4>{ownSchools.length ? ownSchools.map((school) => <div key={school.id}>{editingSchool === school.id ? <><input style={inputStyle} value={editingName} onChange={(event) => setEditingName(event.target.value)} /><button type="button" disabled={loading || !editingName.trim()} onClick={() => saveSchoolName(school)}>Save</button><button type="button" onClick={() => setEditingSchool("")}>Cancel</button></> : <><span>{school.name}</span><button type="button" onClick={() => { setEditingSchool(school.id); setEditingName(school.name); }}>Edit spelling</button><button type="button" onClick={() => removeSchool(school)}>Remove</button></>}</div>) : <p>No schools added by you in this city yet.</p>}</div>}
        </>}
      </section>
      <div className="trainer-visit-fields"><label>Principal Name<input style={inputStyle} required value={form.principalName} onChange={(event) => set("principalName", event.target.value)} placeholder="Enter principal name" /></label><label>Phone Number<input style={inputStyle} required type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Contact number" /></label></div>
      <label>Visit Notes / Remarks<textarea style={inputStyle} rows="3" value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Write visit summary or remarks" /></label>
      <section className="trainer-visit-photo">
        <h3>📷 School Photo (Detailed Address, Date, Day & Time Stamped)</h3>
        <small className="trainer-photo-limit">Location access is required. Turn on Location Services and allow this site to use your location.</small>
        <small className="trainer-photo-limit">Photo upload automatically compresses to {TRAINER_VISIT_PHOTO_KB} KB or less.</small>
        {!previewActive && !form.image && !cameraError && (navigator.mediaDevices?.getUserMedia
          ? <button type="button" className="trainer-open-camera" onClick={startCamera} disabled={cameraBusy}>📸 Open Camera & Take Photo</button>
          : <label className="trainer-phone-camera trainer-open-camera">📸 Open Phone Camera & Take Photo<input type="file" accept="image/*" capture="environment" onClick={releasePreviewForPhoneCamera} onChange={captureFile} disabled={cameraBusy} /></label>)}
        {cameraBusy && !previewActive && !form.image && <p role="status">Checking location permission, then opening camera...</p>}
        {previewActive && <><video ref={videoRef} autoPlay playsInline muted /><div className="trainer-camera-actions"><button type="button" disabled={cameraBusy} onClick={cameraError ? startCamera : capture}>{cameraBusy ? "Opening camera..." : cameraError ? "▶ Start preview" : "🟢 Capture Snap"}</button><button type="button" onClick={stopCamera}>❌ Cancel</button></div></>}
        {cameraError && !form.image && <div className="trainer-camera-error"><p role="status">{cameraError}</p>{navigator.mediaDevices?.getUserMedia && <button type="button" onClick={startCamera} disabled={cameraBusy}>{previewActive ? "Start preview" : "Retry preview"}</button>}<label className="trainer-phone-camera">Use phone camera<input type="file" accept="image/*" capture="environment" onClick={releasePreviewForPhoneCamera} onChange={captureFile} disabled={cameraBusy} /></label></div>}
        {form.image && !previewActive && <><p className="trainer-photo-success">✅ Photo captured & stamped successfully!</p><button type="button" className="trainer-photo-preview-button" onClick={() => setPhotoOpen(true)}><img src={form.image} alt="School photo preview" /></button><button type="button" onClick={() => { set("image", ""); startCamera(); }}>🔄 Retake Photo</button></>}
      </section>
      <button type="submit" style={btnPrimary} disabled={loading || cameraBusy}>{loading ? "Submitting Report..." : "Submit Visit Report"}</button>
    </form>
    {photoOpen && form.image && createPortal(<div className="trainer-photo-modal" role="dialog" aria-modal="true" aria-label="School photo preview" onClick={() => setPhotoOpen(false)}><div onClick={(event) => event.stopPropagation()}><div><button type="button" onClick={() => setPhotoOpen(false)}>Close</button><a href={form.image} download="Trainer_School_Photo.jpg">Download</a></div><img src={form.image} alt="Stamped school photo" /></div></div>, document.body)}
  </div></div>;
}

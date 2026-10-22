import { confirmAction } from "../ui/confirmDialog.js";
import React, { useEffect, useState } from "react";
import { compressCanvasToTargetDataUrl } from "../services/imageCompression.js";
import { listOfflineVisits, removeOfflineVisit, saveOfflineVisit } from "../services/offlineVisitStore.js";
import { readOfflineVisitCatalog } from "../services/offlineVisitCatalog.js";
import NumberOrCustomField from "../ui/NumberOrCustomField.jsx";
import offlineCss from "../styles/offlineVisit.css?raw";

const emptyForm = { cityId: "", cityName: "", areaId: "", areaName: "", schoolId: "", schoolName: "", principalName: "", phone: "", session: "", branches: "", strength: "", purpose: "", notes: "" };
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const purposes = ["FirstVisit", "Sampling", "FollowUp", "Sample Return", "Final Visit", "PR Packages", "After Sale Services", "Training", "Courtesy Visit", "Books Delivery", "Recovery", "Complimentary Visit", "Books Return"];
const readStoredRows = (key) => {
  try { const rows = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(rows) ? rows : []; }
  catch { return []; }
};

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const picture = new Image();
    picture.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1600 / Math.max(picture.naturalWidth, picture.naturalHeight));
        canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
        canvas.getContext("2d").drawImage(picture, 0, 0);
        resolve(compressCanvasToTargetDataUrl(canvas, 140 * 1024, 1100, 0.7));
      } catch (error) { reject(error); }
      finally { URL.revokeObjectURL(url); }
    };
    picture.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this photo.")); };
    picture.src = url;
  });
}

export default function OfflineVisitPortal({ user, cachedProfile, online, onSignIn, onResume, onSync }) {
  const [profile, setProfile] = useState(() => user || cachedProfile || null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [catalog, setCatalog] = useState({ cities: [], areas: [], schools: [] });
  const [schoolCustom, setSchoolCustom] = useState(false);
  const [formResetKey, setFormResetKey] = useState(0);

  const ownerEmail = String(user?.email || profile?.email || "").trim().toLowerCase();
  const refresh = () => listOfflineVisits().then((items) => setDrafts(items.filter((item) => item.ownerEmail === ownerEmail))).catch((error) => setMessage(error.message));
  useEffect(() => { if (ownerEmail) refresh(); }, [ownerEmail]);
  useEffect(() => { if (ownerEmail) setCatalog(readOfflineVisitCatalog(ownerEmail)); }, [ownerEmail]);
  useEffect(() => { if (user) setProfile(user); }, [user]);
  useEffect(() => {
    if (!online || !user) return;
    let active = true;
    onSync().then(() => { if (active) refresh(); });
    return () => { active = false; };
  }, [online, user?.email]);

  const saveProfile = (event) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setProfile({ email: cleanEmail, name: name.trim() || cleanEmail.split("@")[0], unverified: true });
  };
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const assignedCityIds = catalog.assignedCityIds?.length ? catalog.assignedCityIds : (user?.assignedCityIds || profile?.assignedCityIds || []);
  const assignedAreaIds = catalog.assignedAreaIds?.length ? catalog.assignedAreaIds : (user?.assignedAreaIds || profile?.assignedAreaIds || []);
  const cities = catalog.cities.filter((item) => assignedCityIds.includes(item.id));
  const cachedAreas = form.cityId ? readStoredRows(`javed_portal_areas_${form.cityId}`) : [];
  const areas = [...new Map([...catalog.areas, ...cachedAreas].map((item) => [item.id, item])).values()].filter((item) => item.cityId === form.cityId && assignedAreaIds.includes(item.id));
  const cachedSchools = form.areaId ? readStoredRows(`javed_portal_schools_${form.areaId}`) : [];
  const schools = [...new Map([...catalog.schools, ...cachedSchools].map((item) => [item.id, item])).values()].filter((item) => item.areaId === form.areaId && (!form.cityId || item.cityId === form.cityId));
  const selectCity = (event) => {
    const city = cities.find((item) => item.id === event.target.value);
    setSchoolCustom(false);
    setForm((current) => ({ ...current, cityId: city?.id || "", cityName: city?.name || "", areaId: "", areaName: "", schoolId: "", schoolName: "" }));
  };
  const selectArea = (event) => {
    const area = areas.find((item) => item.id === event.target.value);
    setSchoolCustom(false);
    setForm((current) => ({ ...current, areaId: area?.id || "", areaName: area?.name || "", schoolId: "", schoolName: "" }));
  };
  const selectSchool = (event) => {
    const school = schools.find((item) => item.id === event.target.value);
    setSchoolCustom(event.target.value === "custom");
    setForm((current) => ({ ...current, schoolId: school?.id || "", schoolName: school?.name || "" }));
  };
  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setMessage("");
    try { setPhoto(await readPhoto(file)); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    if (!photo) { setMessage("Please take or select a visit photo."); return; }
    setBusy(true); setMessage("");
    try {
      await saveOfflineVisit({
        ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value).trim()])),
        image: photo, ownerEmail, capturedAt: new Date().toISOString()
      });
      setForm(emptyForm); setSchoolCustom(false); setFormResetKey((value) => value + 1); setPhoto("");
      const photoInput = document.getElementById("offline-visit-photo");
      if (photoInput) photoInput.value = "";
      setMessage("Visit saved on this device. Sign in online with the same marketer email, then tap Sync.");
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!await confirmAction("Delete this offline draft?")) return;
    try { await removeOfflineVisit(id); await refresh(); }
    catch (error) { setMessage(error.message); }
  };
  const syncNow = async () => {
    if (!user) { onSignIn(); return; }
    setMessage("");
    const result = await onSync(true);
    await refresh();
    setMessage(result?.error || (result?.synced ? `${result.synced} visit(s) uploaded.` : "No visits uploaded yet. Check your connection and try again."));
  };

  return <div className="offline-portal">
    <style>{offlineCss}</style>
    <header className="offline-header"><div className="offline-logo">JP.</div><div><strong>JAVED PUBLISHERS</strong><small>School Visit Portal</small></div><span className="offline-badge">{online ? "Draft mode" : "Offline"}</span></header>
    <main className="offline-main">
      {!profile ? <section className="offline-card offline-identity">
        <h1>Work offline</h1>
        <p>Enter your marketer email to keep drafts separate on this device. This does not verify your account. Sign in when online to upload visits.</p>
        <form onSubmit={saveProfile}><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label><label>Marketer email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></label><button type="submit">Continue to Add Visit</button></form>
        {online && <button className="offline-secondary" type="button" onClick={onSignIn}>Go to sign in</button>}
      </section> : <>
        <div className="offline-welcome"><div><span>Welcome, {user?.name || profile.name || ownerEmail}</span><h1>Offline visit workspace</h1><p>Other portal sections need internet. Add Visit is available here.</p></div>{online && <button className="offline-secondary" type="button" onClick={user ? onResume : onSignIn}>{user ? "Open portal" : "Sign in to sync"}</button>}</div>
        <div className="offline-categories" aria-label="Portal sections"><div className="offline-category active">＋<strong>Add Visit</strong><small>Available</small></div>{["Attendance", "Today's Visits", "All Visits & Reports", "Expense Report"].map((title) => <div className="offline-category muted" aria-disabled="true" key={title}>◻<strong>{title}</strong><small>Needs internet</small></div>)}</div>
        <section className="offline-card"><div className="offline-section-heading"><div><h2>Add Visit</h2><p>Save school details and a photo, even without a connection.</p></div><span>{drafts.length} pending</span></div>
          <form className="offline-form" onSubmit={save}>
            <div className="offline-location offline-wide"><h3>Assigned Visit Location</h3><div className="offline-location-grid">
              <label>Step 1: Select City *{cities.length ? <select value={form.cityId} onChange={selectCity} required><option value="">Select city</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select> : <input value={form.cityName} onChange={setField("cityName")} placeholder="Enter city" required autoComplete="address-level2" />}</label>
              <label>Step 2: Select Area *{areas.length ? <select value={form.areaId} onChange={selectArea} required><option value="">Select area</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select> : <input value={form.areaName} onChange={setField("areaName")} placeholder="Enter area" required />}</label>
              <label>Step 3: Select School *{schools.length ? <><select value={schoolCustom ? "custom" : form.schoolId} onChange={selectSchool} required><option value="">Select school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}<option value="custom">Add new school</option></select>{schoolCustom && <input value={form.schoolName} onChange={setField("schoolName")} placeholder="New school name" required />}</> : <input value={form.schoolName} onChange={setField("schoolName")} placeholder="Enter school name" required />}</label>
            </div></div>
            <label>Contact Person<input value={form.principalName} onChange={setField("principalName")} /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={setField("phone")} /></label>
            <label>Session *<select value={form.session} onChange={setField("session")} required><option value="">Select session month</option>{months.map((month) => <option key={month} value={month}>{month}</option>)}</select></label>
            <NumberOrCustomField label="Branches" value={form.branches} onChange={(value) => setForm((current) => ({ ...current, branches: value }))} values={Array.from({ length: 10 }, (_, index) => String(index + 1))} inputStyle={{}} resetKey={formResetKey} required />
            <NumberOrCustomField label="Strength" value={form.strength} onChange={(value) => setForm((current) => ({ ...current, strength: value }))} values={Array.from({ length: 10 }, (_, index) => String((index + 1) * 100))} inputStyle={{}} resetKey={formResetKey} required />
            <label className="offline-wide">Purpose of Visit *<select value={form.purpose} onChange={setField("purpose")} required><option value="">Select purpose</option>{purposes.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}</select></label>
            <label className="offline-wide">Remarks<textarea value={form.notes} onChange={setField("notes")} rows="2" /></label>
            <label className="offline-wide">Visit photo *<input id="offline-visit-photo" type="file" accept="image/*" capture="environment" onChange={choosePhoto} required={!photo} /></label>
            {photo && <img className="offline-photo" src={photo} alt="Visit preview" />}
            <button className="offline-save offline-wide" type="submit" disabled={busy}>{busy ? "Saving..." : "Save visit on this device"}</button>
          </form>
          {message && <p className="offline-message" role="status">{message}</p>}
        </section>
        <section className="offline-card"><div className="offline-section-heading"><div><h2>Pending visits</h2><p>Saved on this device until upload succeeds.</p></div>{drafts.length > 0 && <button type="button" onClick={syncNow}>{online && user ? "Sync now" : "Sign in to sync"}</button>}</div>{drafts.length ? <div className="offline-drafts">{drafts.map((draft) => <div className="offline-draft" key={draft.id}><div><strong>{draft.schoolName}</strong><small>{draft.cityName} · {new Date(draft.capturedAt).toLocaleString()}</small></div><button type="button" onClick={() => remove(draft.id)}>Delete</button></div>)}</div> : <p>No pending visits.</p>}</section>
      </>}
    </main>
  </div>;
}

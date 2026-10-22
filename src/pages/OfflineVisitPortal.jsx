import React, { useEffect, useState } from "react";
import { compressCanvasToTargetDataUrl } from "../services/imageCompression.js";
import { listOfflineVisits, removeOfflineVisit, saveOfflineVisit } from "../services/offlineVisitStore.js";
import offlineCss from "../styles/offlineVisit.css?raw";

const emptyForm = { cityName: "", areaName: "", schoolName: "", principalName: "", phone: "", session: "", branches: "", strength: "", purpose: "", notes: "" };

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

  const ownerEmail = String(user?.email || profile?.email || "").trim().toLowerCase();
  const refresh = () => listOfflineVisits().then((items) => setDrafts(items.filter((item) => item.ownerEmail === ownerEmail))).catch((error) => setMessage(error.message));
  useEffect(() => { if (ownerEmail) refresh(); }, [ownerEmail]);
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
        ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])),
        image: photo, ownerEmail, capturedAt: new Date().toISOString()
      });
      setForm(emptyForm); setPhoto("");
      const photoInput = document.getElementById("offline-visit-photo");
      if (photoInput) photoInput.value = "";
      setMessage("Visit saved on this device. It will sync after you sign in online.");
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this offline draft?")) return;
    try { await removeOfflineVisit(id); await refresh(); }
    catch (error) { setMessage(error.message); }
  };
  const syncNow = async () => {
    setMessage("");
    const result = await onSync();
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
            <label>City *<input value={form.cityName} onChange={setField("cityName")} required autoComplete="address-level2" /></label>
            <label>Area *<input value={form.areaName} onChange={setField("areaName")} required /></label>
            <label>School Name *<input value={form.schoolName} onChange={setField("schoolName")} required /></label>
            <label>Contact Person<input value={form.principalName} onChange={setField("principalName")} /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={setField("phone")} /></label>
            <label>Session *<input value={form.session} onChange={setField("session")} placeholder="e.g. 2026-27" required /></label>
            <label>Branches *<input type="number" min="1" value={form.branches} onChange={setField("branches")} required /></label>
            <label>Strength *<input type="number" min="1" value={form.strength} onChange={setField("strength")} required /></label>
            <label className="offline-wide">Purpose / Details<textarea value={form.purpose} onChange={setField("purpose")} rows="2" /></label>
            <label className="offline-wide">Remarks<textarea value={form.notes} onChange={setField("notes")} rows="2" /></label>
            <label className="offline-wide">Visit photo *<input id="offline-visit-photo" type="file" accept="image/*" capture="environment" onChange={choosePhoto} required={!photo} /></label>
            {photo && <img className="offline-photo" src={photo} alt="Visit preview" />}
            <button className="offline-save offline-wide" type="submit" disabled={busy}>{busy ? "Saving..." : "Save visit on this device"}</button>
          </form>
          {message && <p className="offline-message" role="status">{message}</p>}
        </section>
        <section className="offline-card"><div className="offline-section-heading"><div><h2>Pending visits</h2><p>Saved on this device until upload succeeds.</p></div>{online && user && <button type="button" onClick={syncNow}>Sync now</button>}</div>{drafts.length ? <div className="offline-drafts">{drafts.map((draft) => <div className="offline-draft" key={draft.id}><div><strong>{draft.schoolName}</strong><small>{draft.cityName} · {new Date(draft.capturedAt).toLocaleString()}</small></div><button type="button" onClick={() => remove(draft.id)}>Delete</button></div>)}</div> : <p>No pending visits.</p>}</section>
      </>}
    </main>
  </div>;
}

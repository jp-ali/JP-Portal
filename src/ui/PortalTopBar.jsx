import React, { useRef, useState } from "react";
import defaultAvatar from "../assets/default-marketer-avatar.svg";
import { deleteOwnProfilePhoto, saveOwnProfilePhoto } from "../services/marketerApi.js";
import { deleteAdminProfilePhoto, saveAdminProfilePhoto } from "../services/authApi.js";
import { prepareProfilePhoto } from "../services/profilePhoto.js";

export default function PortalTopBar({ role, name, items, onNavigate, onMenu, onLogout, profilePhoto, onProfilePhotoChange, onExpandProfilePhoto, onSync, syncState, online }) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const matches = query.trim()
    ? items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 5)
    : [];
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date());
  const displayName = name || (role === "admin" ? "Admin" : "Marketer");
  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const photo = await prepareProfilePhoto(file);
      const result = await (role === "admin" ? saveAdminProfilePhoto(photo) : saveOwnProfilePhoto(photo));
      onProfilePhotoChange?.(result.profilePhoto);
      setProfileOpen(false);
    } catch (error) { setPhotoError(error.message); }
    finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await (role === "admin" ? deleteAdminProfilePhoto() : deleteOwnProfilePhoto());
      onProfilePhotoChange?.(null);
      setProfileOpen(false);
    } catch (error) { setPhotoError(error.message); }
    finally { setPhotoBusy(false); }
  };
  return <header className="portal-topbar">
    <button type="button" className="portal-topbar-menu" onClick={onMenu} aria-label="Open menu"><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
    <div className="portal-topbar-greeting"><strong>Welcome Back, <span>{displayName}</span> 👋</strong><small>{role === "admin" ? "Manage team activity, visits and reports, all in one place." : "Keep your visits, reports and daily activity in one place."}</small></div>
    <div className={`portal-topbar-search ${searchOpen ? "search-open" : ""}`}><button type="button" className="portal-topbar-search-toggle" aria-label="Search sections" onClick={() => { setSearchOpen((open) => !open); window.setTimeout(() => searchInputRef.current?.focus(), 0); }}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m15.5 15.5 5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button><input ref={searchInputRef} aria-label="Search portal sections" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { onNavigate(matches[0].key); setQuery(""); setSearchOpen(false); event.currentTarget.blur(); } }} placeholder="Search here..." />{focused && matches.length > 0 && <div className="portal-topbar-search-results">{matches.map((item) => <button type="button" key={item.key} onMouseDown={(event) => event.preventDefault()} onClick={() => { onNavigate(item.key); setQuery(""); setSearchOpen(false); setFocused(false); }}>{item.icon}<span>{item.label}</span></button>)}</div>}</div>
    <div className="portal-topbar-date"><span aria-hidden="true">▣</span><span>{date}</span></div>
    {role === "marketer" && <div className="portal-topbar-sync"><button type="button" onClick={() => onSync?.(true)} disabled={!online || syncState?.busy} aria-label={`Sync offline visits${syncState?.pending ? `, ${syncState.pending} pending` : ""}`} title={syncState?.message || "Sync offline visits"}><span aria-hidden="true">↻</span><span>Sync{syncState?.pending ? ` ${syncState.pending}` : ""}</span></button>{syncState?.message && <small role="status">{syncState.message}</small>}</div>}
    <div className="portal-topbar-user">
      <button type="button" className="portal-topbar-avatar portal-topbar-avatar-button" onClick={() => setProfileOpen((open) => !open)} title="Profile picture options" aria-label="Profile picture options" aria-expanded={profileOpen} data-escape-close><img src={profilePhoto || defaultAvatar} alt="" /></button>
      <span>{displayName}</span>
      <input ref={fileInputRef} className="portal-profile-file-input" type="file" accept="image/*" onChange={changePhoto} aria-label="Upload profile picture" />
      {profileOpen && <div className="portal-topbar-profile-menu"><strong>{displayName}</strong><small>{role === "admin" ? "Administrator" : "Marketer"}</small>
        <><button type="button" disabled={photoBusy} onClick={() => { onExpandProfilePhoto?.(profilePhoto || defaultAvatar); setProfileOpen(false); }}>Expand picture</button><button type="button" disabled={photoBusy} onClick={() => fileInputRef.current?.click()}>{profilePhoto ? "Change picture" : "Upload picture"}</button>{profilePhoto && <><button type="button" disabled={photoBusy} onClick={removePhoto}>Delete picture</button><a href={profilePhoto} download={`${role}-profile.jpg`}>Download picture</a></>}{photoBusy && <small>Saving picture…</small>}{photoError && <small role="alert" className="portal-profile-error">{photoError}</small>}</>
        <button type="button" onClick={onLogout}>Logout</button>
      </div>}
    </div>
  </header>;
}

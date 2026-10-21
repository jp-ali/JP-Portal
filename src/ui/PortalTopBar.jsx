import React, { useRef, useState } from "react";
import defaultAvatar from "../assets/default-marketer-avatar.svg";
import { deleteOwnProfilePhoto, saveOwnProfilePhoto } from "../services/marketerApi.js";
import { prepareProfilePhoto } from "../services/profilePhoto.js";

export default function PortalTopBar({ role, name, items, onNavigate, onMenu, onLogout, profilePhoto, onProfilePhotoChange, onExpandProfilePhoto }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);
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
      const result = await saveOwnProfilePhoto(photo);
      onProfilePhotoChange?.(result.profilePhoto);
      setProfileOpen(false);
    } catch (error) { setPhotoError(error.message); }
    finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await deleteOwnProfilePhoto();
      onProfilePhotoChange?.(null);
      setProfileOpen(false);
    } catch (error) { setPhotoError(error.message); }
    finally { setPhotoBusy(false); }
  };
  return <header className="portal-topbar">
    <button type="button" className="portal-topbar-menu" onClick={onMenu} aria-label="Open menu">☰</button>
    <div className="portal-topbar-greeting"><strong>Welcome Back, <span>{displayName}</span> 👋</strong><small>{role === "admin" ? "Manage team activity, visits and reports, all in one place." : "Keep your visits, reports and daily activity in one place."}</small></div>
    <div className="portal-topbar-search"><span aria-hidden="true">⌕</span><input aria-label="Search portal sections" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { onNavigate(matches[0].key); setQuery(""); event.currentTarget.blur(); } }} placeholder="Search here..." />{focused && matches.length > 0 && <div className="portal-topbar-search-results">{matches.map((item) => <button type="button" key={item.key} onMouseDown={(event) => event.preventDefault()} onClick={() => { onNavigate(item.key); setQuery(""); setFocused(false); }}>{item.icon}<span>{item.label}</span></button>)}</div>}</div>
    <div className="portal-topbar-date"><span aria-hidden="true">▣</span><span>{date}</span></div>
    <div className="portal-topbar-user">
      {role === "marketer" ? <button type="button" className="portal-topbar-avatar portal-topbar-avatar-button" onClick={() => setProfileOpen((open) => !open)} title="Profile picture options" aria-label="Profile picture options" aria-expanded={profileOpen} data-escape-close><img src={profilePhoto || defaultAvatar} alt="" /></button> : <span className="portal-topbar-avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>}
      <span>{displayName}</span>
      <button type="button" onClick={() => setProfileOpen((open) => !open)} title="Account menu" aria-label="Account menu" aria-expanded={profileOpen} data-escape-close>⌄</button>
      {role === "marketer" && <input ref={fileInputRef} className="portal-profile-file-input" type="file" accept="image/*" onChange={changePhoto} aria-label="Upload profile picture" />}
      {profileOpen && <div className="portal-topbar-profile-menu"><strong>{displayName}</strong><small>{role === "admin" ? "Administrator" : "Marketer"}</small>
        {role === "marketer" && <><button type="button" disabled={photoBusy} onClick={() => { onExpandProfilePhoto?.(profilePhoto || defaultAvatar); setProfileOpen(false); }}>Expand picture</button><button type="button" disabled={photoBusy} onClick={() => fileInputRef.current?.click()}>{profilePhoto ? "Change picture" : "Upload picture"}</button>{profilePhoto && <button type="button" disabled={photoBusy} onClick={removePhoto}>Delete picture</button>}{photoBusy && <small>Saving picture…</small>}{photoError && <small role="alert" className="portal-profile-error">{photoError}</small>}</>}
        <button type="button" onClick={onLogout}>Logout</button>
      </div>}
    </div>
  </header>;
}

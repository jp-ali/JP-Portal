import React, { useRef, useState } from "react";
import defaultAvatar from "../assets/default-marketer-avatar.svg";
import { deleteMarketerProfilePhoto, saveMarketerProfilePhoto } from "../services/marketerApi.js";
import { prepareProfilePhoto } from "../services/profilePhoto.js";

export default function MarketerPhotoControl({ marketer, setMarketersList, onExpand, variant = "detail" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const photo = marketer?.profilePhoto || defaultAvatar;
  const updateList = (updated) => setMarketersList((list) => list.map((item) => item.id === updated.id ? updated : item));
  const change = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !marketer?.id) return;
    setBusy(true); setError("");
    try {
      const prepared = await prepareProfilePhoto(file);
      const { marketer: updated } = await saveMarketerProfilePhoto(marketer.id, prepared);
      updateList(updated);
      setOpen(false);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError("");
    try {
      const { marketer: updated } = await deleteMarketerProfilePhoto(marketer.id);
      updateList(updated);
      setOpen(false);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <div className={`marketer-profile-photo-wrap ${variant === "form" ? "marketer-form-photo-wrap" : ""}`}>
    <button type="button" className={variant === "form" ? "marketer-form-avatar" : "marketer-profile-photo"} onClick={() => { setOpen((value) => !value); setError(""); }} title="Profile picture options" aria-label={`${marketer?.name || "Marketer"} picture options`} aria-expanded={open}><img src={photo} alt="" /></button>
    {open && <div className="marketer-profile-photo-menu"><button type="button" onClick={() => { onExpand(photo); setOpen(false); }}>Expand</button><button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>Edit picture</button><button type="button" disabled={busy || !marketer?.profilePhoto} onClick={remove}>Remove</button><a href={photo} download={`${(marketer?.name || "marketer").replace(/[^a-z0-9_-]/gi, "-")}-profile.${marketer?.profilePhoto ? "jpg" : "svg"}`}>Download</a><button type="button" onClick={() => setOpen(false)}>Close</button>{error && <small role="alert">{error}</small>}</div>}
    <input ref={inputRef} type="file" accept="image/*" className="portal-profile-file-input" onChange={change} aria-label="Choose marketer profile picture" />
  </div>;
}

import React, { useState } from "react";
import { usePortalContext } from "../../context/PortalContext.jsx";
import defaultAvatar from "../../assets/default-marketer-avatar.svg";
import MarketerPhotoControl from "../../ui/MarketerPhotoControl.jsx";
import { notifyAction } from "../../ui/confirmDialog.js";

export default function AdminAddMarketerPanel() {
  const c = usePortalContext();
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const editing = Boolean(c.editingId);
  const marketer = c.marketersList.find((item) => item.id === c.editingId);

  const cancel = () => {
    const returnToDetails = c.editingReturnToMarketerDetails;
    c.setEditingId(null);
    c.setEditingReturnToMarketerDetails(false);
    c.setMarketerName(""); c.setMarketerPhone(""); c.setMarketerEmail(""); c.setMarketerPass("");
    c.setMarketerDesignation(""); c.setMarketerAssignedKms("");
    c.setSubordinateMarketerIds([]); c.setSubordinatePickerOpen(false); c.setSubordinateSearch("");
    c.setMarketerWhatsappGroupName(""); c.setMarketerWhatsappGroupLink("");
    c.resetMarketerAssignmentForm();
    c.setAdminView(returnToDetails ? "marketers-detail" : "home");
  };
  const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    const random = new Uint32Array(16);
    crypto.getRandomValues(random);
    const password = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
    c.setMarketerPass(password);
    setConfirmPassword(password);
    setShowPassword(true);
    setShowConfirm(true);
    setPasswordCopied(false);
  };
  const copyPassword = async () => {
    try { await navigator.clipboard.writeText(c.marketerPass); setPasswordCopied(true); }
    catch { setFormError("Copy is unavailable. Show the password and copy it from the field."); }
  };
  const submit = (event) => {
    event.preventDefault();
    if (c.marketerPass !== confirmPassword) { notifyAction("New password and confirmation must match.", "Check password"); return; }
    setFormError("");
    c.handleSaveMarketer(event);
  };
  const field = (icon, label, content, extraClass = "") => <div className={`marketer-form-field ${extraClass}`}><span className="marketer-form-field-icon" aria-hidden="true">{icon}</span><div className="marketer-form-field-body"><span>{label}</span>{content}</div></div>;
  const passwordInput = (value, onChange, visible, setVisible, placeholder, required = false) => <div className="marketer-form-password"><input type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} minLength={value ? 8 : undefined} required={required} autoComplete="new-password" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? "◉" : "◎"}</button></div>;

  return <div className="marketer-form-page">
    <button type="button" className="marketer-form-back" onClick={cancel}>← Back</button>
    <div className="marketer-form-hero">{editing ? <MarketerPhotoControl marketer={marketer} setMarketersList={c.setMarketersList} onExpand={c.setFullScreenImage} variant="form" /> : <span className="marketer-form-avatar"><img src={defaultAvatar} alt="" /></span>}<span className="marketer-form-hero-icon">♟</span><div><h2>{editing ? "Edit Marketer Details" : "Add Marketer"}</h2><p>{editing ? "Update the information of this marketer." : "Create a marketer account and assign its areas."}</p></div></div>
    <form onSubmit={submit}>
      <section className="marketer-form-section"><h3><span>♟</span> Basic Information</h3><div className="marketer-form-grid">
        {field("♟", "Name *", <input aria-label="Name" type="text" value={c.marketerName} onChange={(e) => c.setMarketerName(e.target.value)} required placeholder="Full name" />)}
        {field("☎", "Phone *", <input aria-label="Phone" type="tel" value={c.marketerPhone} onChange={(e) => c.setMarketerPhone(e.target.value)} required placeholder="Phone number" />)}
        {field("✉", "Email *", <input aria-label="Email" type="email" value={c.marketerEmail} onChange={(e) => c.setMarketerEmail(e.target.value)} required placeholder="Email address" />)}
        {field("●", "City", <div className="marketer-form-city-summary">{c.assignedCityIds.map((id) => c.citiesList.find((city) => city.id === id)?.name).filter(Boolean).join(", ") || "Select cities below"}</div>)}
        {field("▣", "Designation *", <><input aria-label="Designation" type="text" list="marketer-designations" value={c.marketerDesignation} onChange={(e) => c.setMarketerDesignation(e.target.value)} required placeholder="Designation" /><datalist id="marketer-designations"><option value="Regional Manager"/><option value="Senior Sales Manager"/><option value="Sales Officer"/><option value="Marketing Coordinator"/></datalist></>)}
        {field("◉", "Assigned KM / Litre *", <input aria-label="Assigned kilometres per litre" type="number" min="0.1" step="0.1" value={c.marketerAssignedKms} onChange={(e) => c.setMarketerAssignedKms(e.target.value)} required placeholder="e.g. 14" />)}
      </div></section>

      <section className="marketer-form-section"><h3><span>♙</span> {editing ? "Change Password" : "Set Password"}</h3><p className="marketer-form-hint">{editing ? "Leave the new password blank to keep the current password." : "Use at least 8 characters and share the password after saving."}</p><div className="marketer-form-grid marketer-form-password-grid">
        {editing && field("♙", "Current Password", <input type="text" value="" disabled placeholder="Stored securely; cannot be shown" />)}
        {field("♙", editing ? "New Password" : "Password *", passwordInput(c.marketerPass, (e) => { c.setMarketerPass(e.target.value); setPasswordCopied(false); }, showPassword, setShowPassword, "Enter new password", !editing))}
        {field("♙", editing ? "Confirm New Password" : "Confirm Password *", passwordInput(confirmPassword, (e) => setConfirmPassword(e.target.value), showConfirm, setShowConfirm, "Confirm password", !editing))}
      </div><div className="marketer-form-password-actions"><button type="button" onClick={generatePassword}>Generate Password</button>{c.marketerPass && <button type="button" onClick={copyPassword}>{passwordCopied ? "Copied" : "Copy Password"}</button>}</div></section>

      <section className="marketer-form-section"><h3><span>●</span> City &amp; Area Assignment</h3><p className="marketer-form-hint">Assign only the cities and areas this marketer is allowed to visit. Schools are selected or added during Add Visit.</p><div className="marketer-form-grid">
        {field("▥", "Select City", <div className="marketer-form-picker"><button type="button" onClick={() => c.setAdminCityAssignOpen((open) => !open)}>1. Assign City <span>{c.assignedCityIds.length} selected ▾</span></button>{c.adminCityAssignOpen && <div className="marketer-form-picker-menu"><input type="search" placeholder="Search city..." value={c.adminCitySearch} onChange={(e) => c.setAdminCitySearch(e.target.value)} /><div className="marketer-form-options">{c.citiesList.filter((city) => city.name.toLowerCase().includes(c.adminCitySearch.toLowerCase())).map((city) => <label key={city.id}><input type="checkbox" checked={c.assignedCityIds.includes(city.id)} onChange={() => c.toggleCityAssignment(city.id)} />{city.name}</label>)}</div><div className="marketer-form-add-row"><input type="text" placeholder="Add missing city" value={c.newCityName} onChange={(e) => c.setNewCityName(e.target.value)} /><button type="button" onClick={c.handleAddCity}>+ Add</button></div></div>}</div>)}
        {field("◧", "Select Area", <div className="marketer-form-picker"><button type="button" disabled={!c.assignedCityIds.length} onClick={() => c.setAdminAreaAssignOpen((open) => !open)}>2. Assign Area <span>{c.assignedAreaIds.length} selected ▾</span></button>{c.adminAreaAssignOpen && c.assignedCityIds.length > 0 && <div className="marketer-form-picker-menu"><select value={c.assignmentCityFocusId} onChange={(e) => { const id = e.target.value; c.setAssignmentCityFocusId(id); c.setAdminAreaSearch(""); if (id) { const city = c.citiesList.find((item) => item.id === id); c.readCachedAreasForCity(id); c.fetchAreasForCity(id).then((rows) => { if (city && (!rows.length || Number(city.areaCatalogVersion || 0) < 8)) c.syncAreasForCityFromOpenStreetMap(city, false); }).catch(() => {}); } }}><option value="">Choose city</option>{c.assignedCityIds.map((id) => c.citiesList.find((city) => city.id === id)).filter(Boolean).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>{c.assignmentCityFocusId && <><input type="search" placeholder="Search area..." value={c.adminAreaSearch} onChange={(e) => c.setAdminAreaSearch(e.target.value)} /><button type="button" className="marketer-form-refresh" disabled={c.areaSyncingCityId === c.assignmentCityFocusId} onClick={() => { const city = c.citiesList.find((item) => item.id === c.assignmentCityFocusId); if (city) c.syncAreasForCityFromOpenStreetMap(city, true); }}>{c.areaSyncingCityId === c.assignmentCityFocusId ? "Loading..." : "↻ Refresh Areas"}</button>{c.areaSyncMessage && <small>{c.areaSyncMessage}</small>}<div className="marketer-form-options">{c.areasList.filter((area) => area.cityId === c.assignmentCityFocusId && area.name.toLowerCase().includes(c.adminAreaSearch.toLowerCase())).map((area) => <label key={area.id}><input type="checkbox" checked={c.assignedAreaIds.includes(area.id)} onChange={() => c.toggleAreaAssignment(area.id)} />{area.name}</label>)}</div><div className="marketer-form-add-row"><input type="text" placeholder="Add missing area" value={c.newAreaName} onChange={(e) => c.setNewAreaName(e.target.value)} /><button type="button" onClick={c.handleAddArea}>+ Add</button></div></>}</div>}</div>)}
      </div><small className="marketer-form-count">{c.assignedCityIds.length} city/cities · {c.assignedAreaIds.length} area(s) assigned</small></section>

      <section className="marketer-form-section"><div className="marketer-form-section-heading"><h3><span>♟</span> Marketers under this account</h3><button type="button" onClick={() => { c.setSubordinatePickerOpen((open) => !open); c.setSubordinateSearch(""); }}>{c.subordinatePickerOpen ? "Close Team" : "+ Add Marketer"}</button></div>{c.subordinatePickerOpen ? <><p className="marketer-form-hint">Select the marketers whose visit history this account can view.</p><input className="marketer-form-team-search" type="search" value={c.subordinateSearch} onChange={(e) => c.setSubordinateSearch(e.target.value)} placeholder="Search marketer..." /><div className="marketer-form-options marketer-form-team-list">{c.marketersList.filter((item) => item.id !== c.editingId && `${item.name || ""} ${item.email || ""}`.toLowerCase().includes(c.subordinateSearch.toLowerCase())).sort((a,b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""))).map((item) => <label key={item.id}><input type="checkbox" checked={c.subordinateMarketerIds.includes(item.id)} onChange={() => c.setSubordinateMarketerIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} />{item.name || item.email}</label>)}</div></> : <small className="marketer-form-count">{c.subordinateMarketerIds.length} selected</small>}</section>
      {formError && <p className="marketer-form-error" role="alert">{formError}</p>}
      <div className="marketer-form-footer"><button type="submit">▣ &nbsp;{editing ? "Update Marketer" : "Create Marketer"}</button><button type="button" onClick={cancel}>✕ &nbsp;Cancel</button></div>
    </form>
  </div>;
}

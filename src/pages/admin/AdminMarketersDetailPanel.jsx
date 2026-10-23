import { usePortalContext } from "../../context/PortalContext.jsx";
import React, { useEffect, useMemo, useState } from "react";
import { marketerCityNames } from "../../domain/marketerCities.js";
import MarketerPhotoControl from "../../ui/MarketerPhotoControl.jsx";
import MarketerMultiSelect from "../../ui/MarketerMultiSelect.jsx";
import defaultAvatar from "../../assets/default-marketer-avatar.svg";

function MarketerDetailListCard({ marketer, citiesList, onView, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <article className="marketer-detail-card">
    <div className="marketer-detail-card-top">
      <button type="button" className="marketer-detail-card-avatar" onClick={onView} aria-label={`View ${marketer.name || "marketer"} details`}><img src={marketer.profilePhoto || defaultAvatar} alt="" /></button>
      <div className="marketer-detail-card-identity"><strong>{marketer.name || "Unnamed Marketer"}</strong><small title={marketer.email}>{marketer.email || "No email"}</small><span className="marketer-detail-card-status"><i />Active</span></div>
      <button type="button" className="marketer-detail-card-view" onClick={onView}>View Details →</button>
      <div className="marketer-detail-card-options"><button type="button" className="marketer-detail-card-more" aria-label={`${marketer.name || "Marketer"} options`} aria-expanded={menuOpen} data-escape-close onClick={() => setMenuOpen((open) => !open)}>⋮</button>{menuOpen && <div className="marketer-detail-card-menu"><button type="button" onClick={() => { setMenuOpen(false); onView(); }}>View Details</button><button type="button" onClick={() => { setMenuOpen(false); onEdit(); }}>Edit Details</button><button type="button" onClick={() => { setMenuOpen(false); onDelete(); }}>Delete Marketer</button></div>}</div>
    </div>
    <div className="marketer-detail-card-facts"><div><span aria-hidden="true">☎</span><p title={marketer.phone || "N/A"}><strong>{marketer.phone || "N/A"}</strong><small>Phone</small></p></div><div><span aria-hidden="true">●</span><p title={marketerCityNames(marketer, citiesList)}><strong>{marketerCityNames(marketer, citiesList)}</strong><small>City</small></p></div><div><span aria-hidden="true">▣</span><p title={marketer.designation || "Regional Manager"}><strong>{marketer.designation || "Regional Manager"}</strong><small>Designation</small></p></div></div>
  </article>;
}

export default function AdminMarketersDetailPanel() {
  const { cardStyle, citiesList, downloadMarketersExcel, downloadMarketersPDF, fetchMarketers, handleDeleteMarketer, handleEditMarketer, inputStyle, marketerSearch, marketersList, renderExpandedReportChrome, renderMarketerPersonIcon, renderReportExpandButton, reportViewClass, selectedMarketerDetailBox, setAdminView, setFullScreenImage, setMarketerSearch, setMarketersList, setSelectedMarketerDetailBox, setSubordinatePickerOpen } = usePortalContext();
  const [selectedMarketerIds, setSelectedMarketerIds] = useState([]);
  const [selectedCityKeys, setSelectedCityKeys] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const cityKeysFor = (marketer) => {
    const ids = Array.isArray(marketer.assignedCityIds) ? marketer.assignedCityIds.filter(Boolean) : [];
    if (ids.length) return ids.map((id) => `id:${String(id)}`);
    const name = String(marketer.cityName || marketer.city || "").trim();
    return name ? [`name:${name.toLowerCase()}`] : [];
  };
  const cityOptions = useMemo(() => {
    const names = new Map(citiesList.map((city) => [String(city.id), city.name]));
    const options = new Map();
    marketersList.forEach((marketer) => {
      cityKeysFor(marketer).forEach((key) => {
        const name = key.startsWith("id:") ? names.get(key.slice(3)) || key.slice(3) : marketer.cityName || marketer.city;
        options.set(key, name);
      });
    });
    return [...options].sort((a, b) => String(a[1]).localeCompare(String(b[1]))).map(([id, name]) => ({ id, name }));
  }, [citiesList, marketersList]);
  useEffect(() => {
    const ids = new Set(marketersList.map((marketer) => marketer.id));
    setSelectedMarketerIds((current) => current.filter((id) => ids.has(id)));
  }, [marketersList]);
  useEffect(() => {
    const keys = new Set(cityOptions.map((city) => city.id));
    setSelectedCityKeys((current) => current.filter((key) => keys.has(key)));
  }, [cityOptions]);
  const filteredMarketers = useMemo(() => marketersList.filter((marketer) => {
    if (selectedMarketerIds.length && !selectedMarketerIds.includes(marketer.id)) return false;
    if (selectedCityKeys.length && !cityKeysFor(marketer).some((key) => selectedCityKeys.includes(key))) return false;
    const query = marketerSearch.trim().toLowerCase();
    return !query || `${marketer.name || ""} ${marketer.email || ""}`.toLowerCase().includes(query);
  }), [marketersList, marketerSearch, selectedMarketerIds, selectedCityKeys]);
  const visibleForExport = selectedMarketerDetailBox ? marketersList.filter((marketer) => marketer.id === selectedMarketerDetailBox) : filteredMarketers;
  const refresh = async () => { setRefreshing(true); try { await fetchMarketers(true); } finally { setRefreshing(false); } };
  return (<div className={reportViewClass("marketers-detail")}>
              {renderExpandedReportChrome("marketers-detail")}
              <div className="report-normal-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                <button 
onClick={() => {
if (selectedMarketerDetailBox) {
setSelectedMarketerDetailBox(null);
} else {
setAdminView("home");
}
}} 
style={{ padding: "8px 14px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "10px", fontWeight: "600", cursor: "pointer", fontSize: "13px" }}
>
                  ← Back
                </button>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
onClick={() => {
const visible = visibleForExport;
const selected = visible[0];
const safeName = String(selected?.name || "All_Marketers").replace(/[^a-z0-9_-]+/gi, "_");
downloadMarketersExcel(visible, selectedMarketerDetailBox ? `${safeName}_Marketer_Details.xlsx` : "All_Marketers_Details.xlsx", citiesList);
}}
style={{ padding: "6px 12px", background: "#15803d", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📥 Excel
                  </button>
                  <button
onClick={() => {
const visible = visibleForExport;
const selected = visible[0];
const safeName = String(selected?.name || "All_Marketers").replace(/[^a-z0-9_-]+/gi, "_");
downloadMarketersPDF(visible, selectedMarketerDetailBox ? `${safeName}_Marketer_Details` : "All_Marketers_Details", citiesList);
}}
style={{ padding: "6px 12px", background: "linear-gradient(135deg,#6f0b24,#86132f)", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
>
                    📄 PDF
                  </button>
                  {renderReportExpandButton("marketers-detail", "Expand marketer details")}
                </div>
              </div>
              <div style={cardStyle}>
                {!selectedMarketerDetailBox ? (
<>
                    <h3 style={{ marginTop: 0, color: "#3b2329", fontSize: "17px", marginBottom: "12px" }}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:"7px"}}>{renderMarketerPersonIcon(20, true)}</span>Active Marketers Details</h3>
                    <div className="marketer-detail-filters">
                      <label className="marketer-detail-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search marketer by name or email..." value={marketerSearch} onChange={(event) => setMarketerSearch(event.target.value)} aria-label="Search marketers" /></label>
                      <MarketerMultiSelect marketers={marketersList} selected={selectedMarketerIds} onChange={setSelectedMarketerIds} inputStyle={inputStyle} valueKey="id" emptyLabel="All Marketers" height={42} />
                      <MarketerMultiSelect marketers={cityOptions} selected={selectedCityKeys} onChange={setSelectedCityKeys} inputStyle={inputStyle} valueKey="id" emptyLabel="All Cities" itemLabel="City" pluralLabel="Cities" height={42} />
                      <button type="button" className="marketer-detail-refresh" onClick={refresh} disabled={refreshing} aria-label="Refresh marketers" title="Refresh marketers">↻</button>
                    </div>
                    {filteredMarketers.length === 0 ? (
<p style={{ color: "#78686d", fontSize: "14px" }}>No marketers found.</p>
) : (
<div className="marketer-detail-grid">
                          {filteredMarketers.map((m) => <MarketerDetailListCard key={m.id} marketer={m} citiesList={citiesList} onView={() => setSelectedMarketerDetailBox(m.id)} onEdit={() => handleEditMarketer(m)} onDelete={() => handleDeleteMarketer(m)} />)}
                        </div>
)}
                  </>
) : (
(() => {
const m = marketersList.find(item => item.id === selectedMarketerDetailBox);
if (!m) return <p style={{ color: "#78686d" }}>Marketer details not found.</p>;
return <div className="marketer-profile">
  <div className="marketer-profile-main">
    <aside className="marketer-profile-side">
      <MarketerPhotoControl marketer={m} setMarketersList={setMarketersList} onExpand={setFullScreenImage} />
      <h2>{m.name || "Unnamed Marketer"}</h2><p>{m.designation || "Regional Manager"}</p><span className="marketer-profile-status">● Active</span>
    </aside>
    <div className="marketer-profile-content">
      <div className="marketer-profile-heading"><h3>👤 Personal Information</h3><button type="button" onClick={() => handleEditMarketer(m)}>✎ Edit Details</button></div>
      <div className="marketer-profile-fields">
        <div className="marketer-profile-field"><span>👤</span><div><small>Name</small><strong>{m.name || "N/A"}</strong></div></div>
        <div className="marketer-profile-field"><span>📞</span><div><small>Phone</small><strong>{m.phone || "N/A"}</strong></div></div>
        <div className="marketer-profile-field"><span>✉️</span><div><small>Email</small><strong>{m.email || "N/A"}</strong></div></div>
        <div className="marketer-profile-field"><span>📍</span><div><small>City</small><strong>{marketerCityNames(m, citiesList)}</strong></div></div>
        <div className="marketer-profile-field"><span>💼</span><div><small>Designation</small><strong>{m.designation || "Regional Manager"}</strong></div></div>
      </div>
      <div className="marketer-profile-metrics"><div><span>⛽</span><div><small>Assigned KMs / Litre</small><strong>{m.assignedKms ?? "—"}</strong></div></div><div><span>👥</span><div><small>Account Marketers</small><strong>{(m.subordinateMarketerIds || []).length}</strong></div></div></div>
    </div>
  </div>
  <section className="marketer-profile-team"><div className="marketer-profile-team-heading"><h3>👥 Marketers under this account</h3><button type="button" onClick={() => { handleEditMarketer(m); setSubordinatePickerOpen(true); }}>+ Add Marketer</button></div>
    {(m.subordinateMarketerIds || []).length ? <div className="marketer-profile-members">{m.subordinateMarketerIds.map((id) => marketersList.find((item) => item.id === id)).filter(Boolean).map((member) => <span key={member.id}>{renderMarketerPersonIcon(15)} {member.name || member.email}</span>)}</div> : <div className="marketer-profile-empty"><span aria-hidden="true">👥</span><strong>No marketers assigned under this account.</strong><small>You can add a marketer to manage attendance pictures.</small></div>}
  </section>
</div>;
})()
)}
              </div>
            </div>);
}

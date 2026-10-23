import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";
import "../../styles/catalogueControls.css";

export default function AdminCataloguesPanel() {
  const { cardStyle, catalogueActionId, catalogueFileInputRef, catalogueLoading, catalogueSearch, catalogueTitle, catalogueUploadProgress, catalogueUploading, deleteCatalogue, downloadCatalogue, fetchCatalogues, formatCatalogueFileSize, getFilteredCatalogues, handleUploadCatalogue, inputStyle, setAdminView, setCatalogueFile, setCatalogueSearch, setCatalogueTitle, viewCatalogue } = usePortalContext();
  return (<div>
              <button type="button" onClick={() => setAdminView("home")} style={{ marginBottom:"14px", padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back to Menu</button>
              <div style={cardStyle}>
                <div style={{ marginBottom:"16px" }}>
                  <h3 style={{ margin:"0 0 4px", color:"#3b2329", fontSize:"18px" }}>📚 Catalogues</h3>
                  <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>Upload PDF catalogues for marketers. Only Admin can add or delete catalogue files.</p>
                </div>
                <form onSubmit={handleUploadCatalogue} style={{ display:"grid", gridTemplateColumns:"minmax(180px,1fr) minmax(220px,1.25fr) auto", gap:"9px", alignItems:"end", marginBottom:"18px", padding:"14px", border:"1px solid #eadce0", borderRadius:"12px", background:"#fffafa" }}>
                  <div>
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:800, marginBottom:"5px" }}>Catalogue Title</label>
                    <input type="text" value={catalogueTitle} onChange={(e)=>setCatalogueTitle(e.target.value)} placeholder="e.g. School Catalogue 2026" disabled={catalogueUploading} style={{ ...inputStyle, height:"42px", background:"#fff" }} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:"11px", color:"#5c484e", fontWeight:800, marginBottom:"5px" }}>Select PDF</label>
                    <input ref={catalogueFileInputRef} type="file" accept="application/pdf,.pdf" onChange={(e)=>setCatalogueFile(e.target.files?.[0] || null)} disabled={catalogueUploading} style={{ width:"100%", minHeight:"42px", padding:"8px", border:"1px solid #ddcbd0", borderRadius:"9px", background:"#fff", color:"#3f3035", fontSize:"11px" }} />
                  </div>
                  <button type="submit" disabled={catalogueUploading} style={{ height:"42px", padding:"0 16px", border:"none", borderRadius:"9px", background:catalogueUploading?"#8d7d81":"linear-gradient(135deg,#6f0b24,#86132f)", color:"#fff", fontWeight:900, fontSize:"11px", cursor:catalogueUploading?"wait":"pointer", whiteSpace:"nowrap" }}>{catalogueUploading ? `Uploading ${catalogueUploadProgress}%` : "➕ Upload PDF"}</button>
                  {catalogueUploading && <div style={{ gridColumn:"1 / -1", height:"6px", borderRadius:"999px", background:"#eadde1", overflow:"hidden" }}><div style={{ width:`${catalogueUploadProgress}%`, height:"100%", background:"linear-gradient(90deg,#6f0b24,#a52a4d)", transition:"width .2s ease" }} /></div>}
                </form>
                <div className="catalogue-search-row" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
                  <input type="text" value={catalogueSearch} onChange={(e)=>setCatalogueSearch(e.target.value)} placeholder="🔍 Search catalogues..." style={{ ...inputStyle, maxWidth:"360px", height:"40px", background:"#fff" }} />
                  <button type="button" aria-label="Refresh catalogues" onClick={fetchCatalogues} disabled={catalogueLoading} style={{ width:"42px", height:"40px", border:"1px solid #ddcbd0", borderRadius:"9px", background:"#fff", color:"#7a0f2b", fontWeight:900, fontSize:"18px", cursor:catalogueLoading?"wait":"pointer" }}>↻</button>
                </div>
                {catalogueLoading ? (
<div style={{ padding:"24px", textAlign:"center", color:"#7a0f2b", fontWeight:800 }}>Loading catalogues...</div>
) : getFilteredCatalogues().length === 0 ? (
<div style={{ padding:"24px", textAlign:"center", border:"1px dashed #ddcbd0", borderRadius:"12px", color:"#78686d", fontSize:"12px" }}>No catalogue PDF found.</div>
) : (
<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))", gap:"12px" }}>
                    {getFilteredCatalogues().map((catalogue) => {
const busy = catalogueActionId.endsWith(`:${catalogue.id}`);
const uploadedDate = catalogue.uploadedAt?.toDate ? catalogue.uploadedAt.toDate().toLocaleDateString("en-GB") : "N/A";
return (
<div key={catalogue.id} style={{ padding:"14px", border:"1px solid #e3d2d7", borderRadius:"13px", background:"#fff", boxShadow:"0 5px 14px rgba(78,20,36,.07)" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:"11px", marginBottom:"12px" }}>
                          <div style={{ width:"46px", height:"52px", borderRadius:"10px", display:"grid", placeItems:"center", background:"#f9e9ed", border:"1px solid #e4c9d1", fontSize:"25px", flex:"0 0 auto" }}>📕</div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ color:"#3b2329", fontSize:"13px", fontWeight:900, lineHeight:1.35, wordBreak:"break-word" }}>{catalogue.title || "Catalogue"}</div>
                            <div style={{ color:"#78686d", fontSize:"10.5px", marginTop:"4px", wordBreak:"break-word" }}>{catalogue.fileName || "catalogue.pdf"}</div>
                            <div style={{ color:"#8a757b", fontSize:"10px", marginTop:"4px" }}>{formatCatalogueFileSize(catalogue.fileSize)} • {uploadedDate}</div>
                          </div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"6px" }}>
                          <button type="button" disabled={busy} onClick={()=>viewCatalogue(catalogue)} style={{ height:"36px", border:"1px solid #d8c5cb", borderRadius:"8px", background:"#fff", color:"#6f0b24", fontWeight:800, fontSize:"10.5px", cursor:busy?"wait":"pointer" }}>👁 View</button>
                          <button type="button" disabled={busy} onClick={()=>downloadCatalogue(catalogue)} style={{ height:"36px", border:"none", borderRadius:"8px", background:"#15803d", color:"#fff", fontWeight:800, fontSize:"10.5px", cursor:busy?"wait":"pointer" }}>⬇ Download</button>
                          <button type="button" disabled={busy} onClick={()=>deleteCatalogue(catalogue)} style={{ height:"36px", border:"none", borderRadius:"8px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"#fff", fontWeight:800, fontSize:"10.5px", cursor:busy?"wait":"pointer" }}>🗑 Delete</button>
                        </div>
                      </div>
);
})}
                  </div>
)}
              </div>
            </div>);
}

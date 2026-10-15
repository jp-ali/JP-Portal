import { usePortalContext } from "../../context/PortalContext.jsx";
import React from "react";

export default function MarketerCataloguesPanel() {
  const { cardStyle, catalogueActionId, catalogueLoading, catalogueSearch, downloadCatalogue, fetchCatalogues, formatCatalogueFileSize, getFilteredCatalogues, inputStyle, setCatalogueSearch, setMarketerview, viewCatalogue } = usePortalContext();
  return (<div>
            <button type="button" onClick={() => setMarketerview("home")} style={{ marginBottom:"14px", padding:"8px 14px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, cursor:"pointer", fontSize:"13px" }}>← Back to Menu</button>
            <div style={cardStyle}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:"10px", flexWrap:"wrap", marginBottom:"14px" }}>
                <div>
                  <h3 style={{ margin:"0 0 4px", color:"#3b2329", fontSize:"18px" }}>📚 Catalogues</h3>
                  <p style={{ margin:0, color:"#78686d", fontSize:"11.5px" }}>Open or download the latest PDF catalogues shared by Admin.</p>
                </div>
                <button type="button" onClick={fetchCatalogues} disabled={catalogueLoading} style={{ width:"42px", height:"40px", border:"1px solid #ddcbd0", borderRadius:"9px", background:"#fff", color:"#7a0f2b", fontWeight:900, fontSize:"18px", cursor:catalogueLoading?"wait":"pointer" }}>↻</button>
              </div>
              <input type="text" value={catalogueSearch} onChange={(e)=>setCatalogueSearch(e.target.value)} placeholder="🔍 Search catalogues..." style={{ ...inputStyle, maxWidth:"420px", height:"40px", background:"#fff", marginBottom:"14px" }} />
              {catalogueLoading ? (
<div style={{ padding:"24px", textAlign:"center", color:"#7a0f2b", fontWeight:800 }}>Loading catalogues...</div>
) : getFilteredCatalogues().length === 0 ? (
<div style={{ padding:"24px", textAlign:"center", border:"1px dashed #ddcbd0", borderRadius:"12px", color:"#78686d", fontSize:"12px" }}>No catalogue has been uploaded by Admin yet.</div>
) : (
<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"12px" }}>
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
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px" }}>
                        <button type="button" disabled={busy} onClick={()=>viewCatalogue(catalogue)} style={{ height:"38px", border:"1px solid #d8c5cb", borderRadius:"8px", background:"#fff", color:"#6f0b24", fontWeight:800, fontSize:"11px", cursor:busy?"wait":"pointer" }}>👁 View</button>
                        <button type="button" disabled={busy} onClick={()=>downloadCatalogue(catalogue)} style={{ height:"38px", border:"none", borderRadius:"8px", background:"linear-gradient(135deg,#6f0b24,#86132f)", color:"#fff", fontWeight:800, fontSize:"11px", cursor:busy?"wait":"pointer" }}>⬇ Download</button>
                      </div>
                    </div>
);
})}
                </div>
)}
            </div>
          </div>);
}

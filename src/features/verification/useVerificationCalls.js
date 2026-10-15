import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { formatActionPlanDate } from "../../domain/dates.js";

export function useVerificationCalls({ reports, setReports, marketersList, fetchAllReports, fetchMarketers, formatTime12, getMarketerName, getTodayInputDate, groupRowsByMarketerAndDate, setAdminView, setExpandedReportKey, isDateInRange }) {
const [verificationFromDate, setVerificationFromDate] = useState("");
const [verificationToDate, setVerificationToDate] = useState("");
const [verificationMarketerIds, setVerificationMarketerIds] = useState([]);
const [verificationPickerOpen, setVerificationPickerOpen] = useState(false);
const [verificationSavingId, setVerificationSavingId] = useState("");
const verificationRemarkOptions = [
"Sample Required",
"Verified & Confirmed",
"Unreachable / No Answer",
"Busy / Line Engaged",
"Invalid / Wrong Number",
"Callback Requested",
"Marketer Did Not Arrive",
"Meeting Not Held",
"Others"
];
const openVerificationCalls = async () => {
setExpandedReportKey("");
const today = getTodayInputDate();
setVerificationFromDate(today);
setVerificationToDate(today);
setVerificationMarketerIds([]);
setVerificationPickerOpen(false);
setAdminView("verification-calls");
await Promise.all([fetchAllReports(), fetchMarketers()]);
};
const getFilteredVerificationRows = () => {
const chosen = verificationMarketerIds.map((id) => marketersList.find((m) => m.id === id)).filter(Boolean);
return reports.filter((row) => {
if (!row?.createdAt || !isDateInRange(row.createdAt, verificationFromDate, verificationToDate)) return false;
if (!chosen.length) return true;
return chosen.some((m) => String(row.marketerId || "") === String(m.id) || String(row.marketerEmail || "").toLowerCase() === String(m.email || "").toLowerCase());
}).slice().sort((a,b) => {
const at = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
const bt = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
return bt - at;
});
};
const getVerificationRemarkText = (row) => row?.verificationRemark === "Others"
? (row?.verificationCustomRemark || "Others")
: (row?.verificationRemark || "—");
const saveVerificationRemark = async (row, remark, customText = "") => {
if (!row?.id) return;
const custom = remark === "Others" ? String(customText || "") : "";
setVerificationSavingId(row.id);
setReports((prev) => prev.map((item) => item.id === row.id ? { ...item, verificationRemark: remark, verificationCustomRemark: custom } : item));
try {
await updateDoc(doc(db, "visits", row.id), {
verificationRemark: remark,
verificationCustomRemark: custom,
verificationUpdatedAt: serverTimestamp()
});
} catch (err) {
console.error("Verification remark update error:", err);
alert("Remarks could not be saved. Please try again.");
await fetchAllReports();
} finally {
setVerificationSavingId("");
}
};
const downloadVerificationExcel = () => {
const rows = getFilteredVerificationRows();
if (!rows.length) { alert("No verification calls found for the selected range."); return; }
if (!window.XLSX) { alert("Excel library is still loading. Please try again in a moment."); return; }
const data = rows.map((row, index) => ({
"Sr.": index + 1,
"Date": row.createdAt?.toDate ? row.createdAt.toDate().toLocaleDateString("en-GB") : "N/A",
"Time": formatTime12(row.visitTime || (row.createdAt?.toDate ? row.createdAt.toDate() : null), "N/A"),
"Marketer Name": getMarketerName(row.marketerEmail, row.marketerName || row.marketerEmail || "N/A"),
"Area": row.areaName || "N/A",
"School Name": row.schoolName || (Array.isArray(row.schoolNames) ? row.schoolNames.join(", ") : "N/A"),
"Principal Name": row.principalName || "N/A",
"Principal Number": row.phone || "N/A",
"Remarks": getVerificationRemarkText(row)
}));
const ws = window.XLSX.utils.json_to_sheet(data);
ws["!cols"] = [{wch:6},{wch:14},{wch:13},{wch:24},{wch:24},{wch:36},{wch:24},{wch:20},{wch:34}];
const wb = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(wb, ws, "Verification Calls");
window.XLSX.writeFile(wb, `Verification_Calls_${verificationFromDate || "All"}_to_${verificationToDate || "All"}.xlsx`);
};
const downloadVerificationPDF = () => {
const rows = getFilteredVerificationRows();
if (!rows.length) { alert("No verification calls found for the selected range."); return; }
try {
const clean=(v)=>String(v??"N/A").replace(/[\r\n]+/g," ").trim()||"N/A",ascii=(v)=>clean(v).replace(/[^\x20-\x7E]/g,"?");
const PW=841.89,PH=595.28,MM=72/25.4,L=7,R=290,TOP=38,BOTTOM=193;
const cols=[["Sr.",8],["Marketer Name",32],["Date",24],["Sr#",8],["Time",20],["Area",32],["School Name",47],["Principal Name",34],["Number",28],["Remarks",50]];
const esc=(v)=>ascii(v).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"),tw=(t,z)=>ascii(t).length*z*.50;
const wrap=(v,max,z)=>{const t=ascii(v),n=Math.max(1,Math.floor(max/(z*.50))),w=t.split(/\s+/),a=[];let line="";w.forEach(x=>{const c=line?`${line} ${x}`:x;if(c.length<=n)line=c;else{if(line)a.push(line);line=x;}});if(line)a.push(line);return a.length?a:["N/A"];};
const y=(top)=>PH-top*MM;
const rect=(x,top,w,h,stroke=.45,fill=null)=>{const a=[];if(fill)a.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);a.push(`${stroke} w`,`${(x*MM).toFixed(2)} ${(PH-(top+h)*MM).toFixed(2)} ${(w*MM).toFixed(2)} ${(h*MM).toFixed(2)} re`,fill?"B":"S");return a.join("\n");};
const text=(x,top,t,z=7,align="left",bold=false)=>{let xx=x*MM,w=tw(t,z);if(align==="center")xx-=w/2;if(align==="right")xx-=w;return `BT ${bold?"/F2":"/F1"} ${z} Tf 0.10 0.12 0.15 rg 1 0 0 1 ${xx.toFixed(2)} ${(y(top)-z*.80).toFixed(2)} Tm (${esc(t)}) Tj ET`;};
const wrapped=(x,top,w,h,t,z=5.6,bold=false)=>{const lines=wrap(t,w*MM-4*MM,z),lh=z*1.22,max=Math.max(1,Math.floor((h*MM-2.2*MM)/lh)),vis=lines.slice(0,max);if(lines.length>max&&vis.length)vis[vis.length-1]=`${vis[vis.length-1].slice(0,Math.max(1,vis[vis.length-1].length-4))}...`;const bh=vis.length*lh,st=top+Math.max(1.7,(h*MM-bh)/MM/2+z*.65/MM);return vis.map((line,i)=>text(x+w/2,st+i*lh/MM,line,z,"center",bold)).join("\n");};
const selectedLabel=verificationMarketerIds.length?`${verificationMarketerIds.length} Marketer(s)`:"All Marketers",range=`${verificationFromDate||"All"} to ${verificationToDate||"All"}`,pages=[];
const newPage=()=>{const c=[];c.push(rect(L,5,R-L,24,.55,[.995,.965,.972]),text(148.5,9,"JAVED PUBLISHERS",18,"center",true),text(148.5,15.5,"VERIFICATION CALLS REPORT",11.5,"center",true),text(10,22.5,`Report Date: ${new Date().toLocaleDateString("en-GB")}`,6.5),text(148.5,22.5,`Range: ${range}`,6.5,"center"),text(287,22.5,selectedLabel,6.3,"right"));let x=L;cols.forEach(([h,w])=>{c.push(rect(x,TOP,w,9,.55,[.985,.915,.935]),wrapped(x,TOP,w,9,h,5.7,true));x+=w;});return{content:c,y:TOP+9};};
let page=newPage();pages.push(page);const drawCell=(x,top,w,h,val,bold=false,size=5.45,fill=null)=>{page.content.push(rect(x,top,w,h,.42,fill),wrapped(x,top,w,h,val,size,bold));};
const people=groupRowsByMarketerAndDate(rows,{getDateValue:(r)=>r?.createdAt});
people.forEach((person,personIndex)=>{const flat=[];[...person.dates.entries()].forEach(([dateKey,entries])=>entries.forEach((item,itemIndex)=>flat.push({dateKey,item,itemIndex})));let offset=0;while(offset<flat.length){let available=BOTTOM-page.y;if(available<8){page=newPage();pages.push(page);available=BOTTOM-page.y;}const chunk=[];let used=0;for(let i=offset;i<flat.length;i++){const e=flat[i],r=e.item,vals=[formatTime12(r.visitTime||(r.createdAt?.toDate?r.createdAt.toDate():null),"N/A"),r.areaName||"N/A",r.schoolName||(Array.isArray(r.schoolNames)?r.schoolNames.join(", "):"N/A"),r.principalName||"N/A",r.phone||"N/A",getVerificationRemarkText(r)],widths=[20,32,47,34,28,50],h=Math.min(22,Math.max(8,2.8+Math.max(...vals.map((v,k)=>wrap(v,widths[k]*MM-4*MM,5.35).length))*3.0));if(chunk.length&&used+h>available)break;if(!chunk.length&&h>available)break;chunk.push({...e,h});used+=h;}if(!chunk.length){page=newPage();pages.push(page);continue;}drawCell(L,page.y,8,used,personIndex+1,true,5.4,[.985,.985,.985]);drawCell(L+8,page.y,32,used,person.name,true,5.45,[.985,.985,.985]);let yy=page.y,cursor=0;while(cursor<chunk.length){const dateKey=chunk[cursor].dateKey;let end=cursor,dateH=0;while(end<chunk.length&&chunk[end].dateKey===dateKey){dateH+=chunk[end].h;end++;}drawCell(L+40,yy,24,dateH,formatActionPlanDate(dateKey),true,5.25,[.985,.985,.985]);for(let i=cursor;i<end;i++){const e=chunk[i],r=e.item,fill=(i-cursor)%2?[.995,.995,.995]:null;let x=L+64;drawCell(x,yy,8,e.h,e.itemIndex+1,false,5.25,fill);x+=8;drawCell(x,yy,20,e.h,formatTime12(r.visitTime||(r.createdAt?.toDate?r.createdAt.toDate():null),"N/A"),false,5.25,fill);x+=20;drawCell(x,yy,32,e.h,r.areaName||"N/A",false,5.35,fill);x+=32;drawCell(x,yy,47,e.h,r.schoolName||(Array.isArray(r.schoolNames)?r.schoolNames.join(", "):"N/A"),false,5.35,fill);x+=47;drawCell(x,yy,34,e.h,r.principalName||"N/A",false,5.35,fill);x+=34;drawCell(x,yy,28,e.h,r.phone||"N/A",false,5.25,fill);x+=28;drawCell(x,yy,50,e.h,getVerificationRemarkText(r),false,5.35,fill);yy+=e.h;}cursor=end;}page.y+=used;offset+=chunk.length;}});
pages.forEach((pg,i)=>{pg.content.push(rect(L,197,R-L,10,.45,[.995,.958,.968]),text(148.5,203,"Created by Ali Ashfaq",7.5,"center",true),text(10,203,"Verification Calls Report",6.3),text(287,203,`Page ${i+1} of ${pages.length}`,6.3,"right"));});
const objs=[],add=(b)=>{objs.push(b);return objs.length;},f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),cids=[],pids=[];pages.forEach(pg=>{const st=pg.content.join("\n")+"\n";cids.push(add(`<< /Length ${st.length} >>\nstream\n${st}\nendstream`));pids.push(0);});const pagesId=add("");pages.forEach((pg,i)=>{pids[i]=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cids[i]} 0 R >>`);});objs[pagesId-1]=`<< /Type /Pages /Kids [${pids.map(id=>`${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;const root=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offs=[0];objs.forEach((o,i)=>{offs[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xr=pdf.length;pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objs.length;i++)pdf+=`${String(offs[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objs.length+1} /Root ${root} 0 R >>\nstartxref\n${xr}\n%%EOF`;const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;const blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Verification_Calls_${verificationFromDate||"All"}_to_${verificationToDate||"All"}.pdf`;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
} catch(err){console.error("Verification PDF error:",err);alert("Verification PDF could not be downloaded. Please try again.");}
};
return { verificationFromDate, setVerificationFromDate, verificationToDate, setVerificationToDate, verificationMarketerIds, setVerificationMarketerIds, verificationPickerOpen, setVerificationPickerOpen, verificationSavingId, setVerificationSavingId, verificationRemarkOptions, openVerificationCalls, getFilteredVerificationRows, saveVerificationRemark, downloadVerificationExcel, downloadVerificationPDF };
}

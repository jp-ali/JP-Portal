import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getSession } from "../../services/authApi";
import { formatActionPlanDate } from "../../domain/dates.js";
import { mergedReportSheet } from "../../services/mergedReportSheet.js";
import { PDF_BANNER, PDF_TABLE_HEAD, PDF_FOOTER, pdfTextFill } from "../../services/pdfTheme.js";

export function useActionPlans({ user, setUser, setMarketerview, getTodayInputDate, formatTime12, groupRowsByMarketerAndDate, fetchTodayAttendance, getAttendanceDocId }) {
const [actionPlanDate, setActionPlanDate] = useState(getTodayInputDate());
const [actionPlanAreaText, setActionPlanAreaText] = useState("");
const [actionPlanPurpose, setActionPlanPurpose] = useState("");
const [actionPlanSubmitting, setActionPlanSubmitting] = useState(false);
const [actionPlanSuccess, setActionPlanSuccess] = useState("");
const [actionPlans, setActionPlans] = useState([]);
const [adminActionPlanFromDate, setAdminActionPlanFromDate] = useState(getTodayInputDate());
const [adminActionPlanToDate, setAdminActionPlanToDate] = useState(getTodayInputDate());
const [adminActionPlanSearch, setAdminActionPlanSearch] = useState("");
const copyTextToClipboard = async (value) => {
const textValue = String(value || "");
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(textValue);
return true;
}
const textarea = document.createElement("textarea");
textarea.value = textValue;
textarea.style.position = "fixed";
textarea.style.opacity = "0";
document.body.appendChild(textarea);
textarea.focus();
textarea.select();
const ok = document.execCommand("copy");
textarea.remove();
return ok;
};
const buildActionPlanMessage = ({ date, areaName, purposeValue, marketerNameValue, designationValue }) => `Assalam U Alaikum!!
Action Plan
${formatActionPlanDate(date)}
Area: ${areaName}
purpose : ${purposeValue}
Regards : ${designationValue || "Regional Manager"}
${marketerNameValue}`;
const fetchActionPlans = async () => {
try {
const snap = await getDocs(collection(db, "action_plans"));
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
rows.sort((a, b) => {
const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
return tb - ta;
});
setActionPlans(rows);
return rows;
} catch (err) {
console.error("Action plan fetch error:", err);
return [];
}
};
const getFilteredActionPlans = () => {
const q = adminActionPlanSearch.trim().toLowerCase();
return actionPlans.filter((p) => {
const planDate = String(p.date || "");
const matchesFrom = !adminActionPlanFromDate || (planDate && planDate >= adminActionPlanFromDate);
const matchesTo = !adminActionPlanToDate || (planDate && planDate <= adminActionPlanToDate);
const matchesSearch = !q || [
p.marketerName,
p.marketerEmail,
p.designation,
p.areaName,
p.cityName,
p.purpose,
p.whatsappGroupName
].some((v) => String(v || "").toLowerCase().includes(q));
return matchesFrom && matchesTo && matchesSearch;
});
};
const downloadActionPlanExcel = () => {
const rows = getFilteredActionPlans();
if (!rows.length) {
alert("No action plans found in the selected date range.");
return;
}
if (!window.XLSX) {
alert("Excel library is still loading. Please try again in a moment.");
return;
}
const formatted = rows.map((p, index) => ({
"Sr.": index + 1,
"Date": formatActionPlanDate(p.date),
"Submitted Time": formatTime12(p.createdAt?.toDate ? p.createdAt.toDate() : null),
"Marketer": p.marketerName || p.marketerEmail || "Marketer",
"Designation": p.designation || "Regional Manager",
"City": p.cityName || "N/A",
"Area": p.areaName || "N/A",
"Purpose": p.purpose || "N/A"
}));
const worksheet = mergedReportSheet(window.XLSX, formatted, "Action Plans Report");
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Action Plans");
const fromPart = adminActionPlanFromDate || "All";
const toPart = adminActionPlanToDate || "All";
window.XLSX.writeFile(workbook, `Action_Plans_${fromPart}_to_${toPart}.xlsx`);
};
const downloadActionPlanPDF = () => {
const rows = getFilteredActionPlans();
if (!rows.length) { alert("No action plans found in the selected date range."); return; }
try {
const clean=(v)=>String(v??"N/A").replace(/[\r\n]+/g," ").trim()||"N/A", ascii=(v)=>clean(v).replace(/[^\x20-\x7E]/g,"?");
const PW=841.89,PH=595.28,MM=72/25.4,L=7,R=290,TOP=38,BOTTOM=193;
const cols=[["Sr.",8],["Name",34],["Action Plan Date",26],["Sr#",8],["Submitted Time",20],["Area",55],["Purpose",87],["Designation",45]];
const esc=(v)=>ascii(v).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"),tw=(t,z)=>ascii(t).length*z*.50;
const wrap=(v,max,z)=>{const t=ascii(v),n=Math.max(1,Math.floor(max/(z*.50))),w=t.split(/\s+/),a=[];let line="";w.forEach(x=>{const c=line?`${line} ${x}`:x;if(c.length<=n)line=c;else{if(line)a.push(line);line=x;}});if(line)a.push(line);return a.length?a:["N/A"];};
const y=(top)=>PH-top*MM;
const rect=(x,top,w,h,stroke=.45,fill=null)=>{const a=[];if(fill)a.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);a.push(`${stroke} w`,`${(x*MM).toFixed(2)} ${(PH-(top+h)*MM).toFixed(2)} ${(w*MM).toFixed(2)} ${(h*MM).toFixed(2)} re`,fill?"B":"S");return a.join("\n");};
const text=(x,top,t,z=7,align="left",bold=false)=>{let xx=x*MM,w=tw(t,z);if(align==="center")xx-=w/2;if(align==="right")xx-=w;return `BT ${bold?"/F2":"/F1"} ${z} Tf ${pdfTextFill(top)} rg 1 0 0 1 ${xx.toFixed(2)} ${(y(top)-z*.80).toFixed(2)} Tm (${esc(t)}) Tj ET`;};
const wrapped=(x,top,w,h,t,z=5.8,bold=false)=>{const lines=wrap(t,w*MM-4*MM,z),lh=z*1.22,max=Math.max(1,Math.floor((h*MM-2.2*MM)/lh)),vis=lines.slice(0,max);if(lines.length>max&&vis.length)vis[vis.length-1]=`${vis[vis.length-1].slice(0,Math.max(1,vis[vis.length-1].length-4))}...`;const bh=vis.length*lh,st=top+Math.max(1.7,(h*MM-bh)/MM/2+z*.65/MM);return vis.map((line,i)=>text(x+w/2,st+i*lh/MM,line,z,"center",bold)).join("\n");};
const range=`${adminActionPlanFromDate||"All"} to ${adminActionPlanToDate||"All"}`,pages=[];
const newPage=()=>{const c=[];c.push(rect(L,5,R-L,24,.55,PDF_BANNER),text(148.5,9,"JAVED PUBLISHERS",18,"center",true),text(148.5,15.5,"DAILY ACTION PLAN REPORT",11.5,"center",true),text(10,22.5,`Report Date: ${new Date().toLocaleDateString("en-GB")}`,6.5),text(148.5,22.5,`Total Records: ${rows.length}`,6.5,"center"),text(287,22.5,`Range: ${range}`,6.0,"right"));let x=L;cols.forEach(([h,w])=>{c.push(rect(x,TOP,w,9,.55,PDF_TABLE_HEAD),wrapped(x,TOP,w,9,h,5.8,true));x+=w;});return{content:c,y:TOP+9};};
let page=newPage();pages.push(page);
const drawCell=(x,top,w,h,val,bold=false,size=5.55,fill=null)=>{page.content.push(rect(x,top,w,h,.42,fill),wrapped(x,top,w,h,val,size,bold));};
const people=groupRowsByMarketerAndDate(rows,{getDateValue:(p)=>p?.date});
people.forEach((person,personIndex)=>{
const flat=[];[...person.dates.entries()].forEach(([dateKey,entries])=>entries.forEach((item)=>flat.push({dateKey,item,serial:flat.length+1,dateCount:entries.length})));
let offset=0;
while(offset<flat.length){let available=BOTTOM-page.y;if(available<8){page=newPage();pages.push(page);available=BOTTOM-page.y;}const chunk=[];let used=0;for(let i=offset;i<flat.length;i++){const e=flat[i],p=e.item,vals=[formatTime12(p.createdAt?.toDate?p.createdAt.toDate():null),p.areaName||"N/A",p.purpose||"N/A",p.designation||"Regional Manager"],widths=[20,55,87,45],sizes=[5.4,5.5,5.5,5.4],h=Math.min(22,Math.max(8,2.8+Math.max(...vals.map((v,k)=>wrap(v,widths[k]*MM-4*MM,sizes[k]).length))*3.05));if(chunk.length&&used+h>available)break;if(!chunk.length&&h>available)break;chunk.push({...e,h});used+=h;}if(!chunk.length){page=newPage();pages.push(page);continue;}drawCell(L,page.y,8,used,personIndex+1,true,5.5,[.985,.985,.985]);drawCell(L+8,page.y,34,used,person.name,true,5.6,[.985,.985,.985]);let yy=page.y,cursor=0;while(cursor<chunk.length){const dateKey=chunk[cursor].dateKey;let end=cursor,dateH=0;while(end<chunk.length&&chunk[end].dateKey===dateKey){dateH+=chunk[end].h;end++;}drawCell(L+42,yy,26,dateH,formatActionPlanDate(dateKey),true,5.3,[.985,.985,.985]);for(let i=cursor;i<end;i++){const e=chunk[i],p=e.item,fill=(i-cursor)%2?[.995,.995,.995]:null;let x=L+68;drawCell(x,yy,8,e.h,e.serial,false,5.3,fill);x+=8;drawCell(x,yy,20,e.h,formatTime12(p.createdAt?.toDate?p.createdAt.toDate():null),false,5.3,fill);x+=20;drawCell(x,yy,55,e.h,p.areaName||"N/A",false,5.5,fill);x+=55;drawCell(x,yy,87,e.h,p.purpose||"N/A",false,5.5,fill);x+=87;drawCell(x,yy,45,e.h,p.designation||"Regional Manager",false,5.4,fill);yy+=e.h;}cursor=end;}page.y+=used;offset+=chunk.length;}
});
pages.forEach((pg,i)=>{pg.content.push(rect(L,197,R-L,10,.45,PDF_FOOTER),text(148.5,203,"Created by Ali Ashfaq",7.5,"center",true),text(10,203,"Daily Action Plan Report",6.3),text(287,203,`Page ${i+1} of ${pages.length}`,6.3,"right"));});
const objs=[],add=(b)=>{objs.push(b);return objs.length;},f1=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),f2=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"),cids=[],pids=[];pages.forEach(pg=>{const st=pg.content.join("\n")+"\n";cids.push(add(`<< /Length ${st.length} >>\nstream\n${st}\nendstream`));pids.push(0);});const pagesId=add("");pages.forEach((pg,i)=>{pids[i]=add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cids[i]} 0 R >>`);});objs[pagesId-1]=`<< /Type /Pages /Kids [${pids.map(id=>`${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;const root=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offs=[0];objs.forEach((o,i)=>{offs[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xr=pdf.length;pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objs.length;i++)pdf+=`${String(offs[i]).padStart(10,"0")} 00000 n \n`;pdf+=`trailer\n<< /Size ${objs.length+1} /Root ${root} 0 R >>\nstartxref\n${xr}\n%%EOF`;const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;const blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`Daily_Action_Plan_Report_${new Date().toISOString().slice(0,10)}.pdf`;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
} catch(err){console.error("Action plan PDF error:",err);alert("Action Plan PDF could not be downloaded. Please try again.");}
};
const handleDeleteActionPlan = async (plan) => {
if (!plan?.id) return;
const who = plan.marketerName || plan.marketerEmail || "this marketer";
if (!window.confirm(`Delete this action plan for ${who}? This cannot be undone.`)) return;
try {
await deleteDoc(doc(db, "action_plans", plan.id));
setActionPlans((prev) => prev.filter((p) => p.id !== plan.id));
} catch (err) {
alert("Error deleting action plan: " + err.message);
}
};
const openActionPlanForm = async () => {
const attendance = await fetchTodayAttendance();
if (!attendance?.startMarked) {
alert("Please mark Start Time attendance first. Action Plan will unlock after Start Time is marked.");
return;
}
setActionPlanDate(getTodayInputDate());
setActionPlanAreaText("");
setActionPlanPurpose("");
setActionPlanSuccess("");
setMarketerview("action-plan");
};
const handleSendActionPlan = async (e) => {
e.preventDefault();
const typedArea = actionPlanAreaText.trim();
const typedPurpose = actionPlanPurpose.trim();
if (!actionPlanDate || !typedArea || !typedPurpose) {
alert("Please enter date, area and purpose.");
return;
}
const attendanceBeforePlan = await fetchTodayAttendance();
if (!attendanceBeforePlan?.startMarked || attendanceBeforePlan?.status === "leave") {
alert("Please mark Start Time attendance first. Action Plan is available after attendance is marked.");
return;
}
const whatsappWindow = window.open("about:blank", "_blank");
setActionPlanSubmitting(true);
try {
let profile = {
designation: user?.designation || "Regional Manager",
whatsappGroupName: user?.whatsappGroupName || "",
whatsappGroupLink: user?.whatsappGroupLink || ""
};
if (user?.marketerId) {
const latest = await getSession();
if (latest?.role === "marketer") {
profile = {
designation: latest.designation || "Regional Manager",
whatsappGroupName: latest.whatsappGroupName || "",
whatsappGroupLink: latest.whatsappGroupLink || ""
};
setUser((prev) => ({ ...prev, ...profile }));
}
}
const message = buildActionPlanMessage({
date: actionPlanDate,
areaName: typedArea,
purposeValue: typedPurpose,
marketerNameValue: user?.name || user?.email || "Marketer",
designationValue: profile.designation
});
const actionPlanDoc = await addDoc(collection(db, "action_plans"), {
marketerId: user?.marketerId || "",
marketerEmail: user?.email || "",
marketerName: user?.name || user?.email || "Marketer",
designation: profile.designation,
date: actionPlanDate,
areaId: "",
areaName: typedArea,
cityId: "",
cityName: "",
purpose: typedPurpose,
whatsappGroupName: profile.whatsappGroupName,
whatsappGroupLink: profile.whatsappGroupLink,
message,
createdAt: serverTimestamp()
});
if (actionPlanDate === getTodayInputDate()) {
const attendanceId = getAttendanceDocId(user?.marketerId, user?.email, getTodayInputDate());
await setDoc(doc(db, "attendance", attendanceId), {
actionPlanSent: true,
actionPlanId: actionPlanDoc.id,
actionPlanSentAt: serverTimestamp(),
updatedAt: serverTimestamp()
}, { merge: true });
await fetchTodayAttendance();
}
const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
try { await copyTextToClipboard(message); } catch (_) {}
if (whatsappWindow && !whatsappWindow.closed) {
whatsappWindow.location.href = whatsappUrl;
} else {
window.location.href = whatsappUrl;
}
setActionPlanSuccess(
"Action plan saved. WhatsApp opened with the message ready. Select the required group/chat and press Send."
);
fetchActionPlans().catch(() => {});
} catch (err) {
if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
alert("Error saving action plan: " + err.message);
} finally {
setActionPlanSubmitting(false);
}
};
return { actionPlanDate, setActionPlanDate, actionPlanAreaText, setActionPlanAreaText, actionPlanPurpose, setActionPlanPurpose, actionPlanSubmitting, actionPlanSuccess, adminActionPlanFromDate, setAdminActionPlanFromDate, adminActionPlanToDate, setAdminActionPlanToDate, adminActionPlanSearch, setAdminActionPlanSearch, formatActionPlanDate, buildActionPlanMessage, fetchActionPlans, getFilteredActionPlans, downloadActionPlanExcel, downloadActionPlanPDF, openActionPlanForm, handleSendActionPlan, handleDeleteActionPlan };
}

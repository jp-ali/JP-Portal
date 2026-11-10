export const formatAddressForStamp = (address = {}) => {
const house = address.house_number ? `House #${address.house_number}` : "";
const streetValue = address.road || address.street || address.pedestrian || address.path || "";
const street = streetValue ? `Street #${streetValue.replace(/^street\s*#?\s*/i, "")}` : "";
const blockValue = address.block || address.neighbourhood || address.suburb || address.residential || address.quarter || "";
const block = blockValue ? (/^block\b/i.test(blockValue) ? blockValue : `Block ${blockValue}`) : "";
const city = address.city || address.town || address.municipality || address.village || address.city_district || "";
const districtValue = address.state_district || address.county || "";
const district = districtValue && !/\bdistrict\b/i.test(districtValue) ? `${districtValue} District` : districtValue;
const province = address.state || "";
const country = address.country || "";
const local = [...new Set([house, street, block].filter(Boolean))].join(", ");
const region = [...new Set([city, district, province, country].filter(Boolean))].join(", ");
return [local, region].filter(Boolean).join(",\n");
};

export function formatVisitPhotoTimestamp(date = new Date()) {
  const timeZone = "Asia/Karachi";
  const day = date.toLocaleDateString("en-GB", { timeZone, weekday: "long" });
  const numeric = date.toLocaleDateString("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" });
  const timeText = date.toLocaleTimeString("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: true });
  return { dateText: `${day}, ${numeric}`, timeText };
}

function drawStampIcon(context, kind, x, y, size) {
  context.save();
  context.translate(x, y); context.scale(size / 20, size / 20);
  if (kind === "calendar") {
    context.fillStyle = "#ffffff"; context.fillRect(2, 3, 16, 15);
    context.fillStyle = "#f04444"; context.fillRect(2, 3, 16, 5);
    context.fillStyle = "#bbbbbb"; context.fillRect(5, 1, 2, 4); context.fillRect(13, 1, 2, 4);
    context.fillStyle = "#444444";
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) context.fillRect(5 + col * 4, 10 + row * 4, 2, 2);
  } else if (kind === "clock") {
    context.strokeStyle = "#f04444"; context.lineWidth = 2;
    context.beginPath(); context.moveTo(3, 3); context.lineTo(6, 1); context.moveTo(14, 1); context.lineTo(17, 3); context.stroke();
    context.fillStyle = "#ffffff"; context.beginPath(); context.arc(10, 10, 7, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#f04444"; context.stroke();
    context.strokeStyle = "#555555"; context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(10, 5); context.lineTo(10, 10); context.lineTo(14, 10); context.stroke();
  } else {
    context.fillStyle = "#f04444";
    context.beginPath(); context.arc(10, 7, 6, Math.PI, 0); context.bezierCurveTo(16, 12, 10, 19, 10, 19); context.bezierCurveTo(10, 19, 4, 12, 4, 7); context.fill();
    context.fillStyle = "#ffffff"; context.beginPath(); context.arc(10, 7, 2, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

export function drawDateTimePhotoStamp(canvas, context, capturedAt = new Date()) {
  const { dateText, timeText } = formatVisitPhotoTimestamp(capturedAt);
  const padding = Math.max(10, canvas.width * .022);
  const font = Math.max(14, canvas.width * .030);
  const lineHeight = font * 1.43;
  const height = 15 + 2 * lineHeight + 10;
  let y = canvas.height - height + 15;
  context.fillStyle = "rgba(0,0,0,.72)";
  context.fillRect(0, canvas.height - height, canvas.width, height);
  context.fillStyle = "#ffffff";
  context.textBaseline = "top";
  context.font = `600 ${font}px sans-serif`;
  for (const [icon, text] of [["calendar", `Day & Date: ${dateText}`], ["clock", `Time: ${timeText}`]]) {
    drawStampIcon(context, icon, padding, y + font * .05, font);
    context.fillText(text, padding + font * 1.4, y);
    y += lineHeight;
  }
}

export function drawVisitPhotoStamp(canvas, context, { dateText, timeText, locationText, attribution = "© OpenStreetMap contributors" }) {
  const padding = Math.max(10, canvas.width * .022);
  let font = Math.max(14, canvas.width * .030);
  let lineHeight, locationFont, locationStep, footerFont, footerHeight, lines, height;
  // Fit the full address, rather than cutting off its district/province/country.
  do {
    lineHeight = font * 1.43;
    locationFont = font * .86;
    locationStep = lineHeight * .92;
    footerFont = Math.max(10, font * .45);
    footerHeight = attribution ? footerFont + 12 : 10;
    context.font = `600 ${locationFont}px sans-serif`;
    lines = [];
    for (const paragraph of String(locationText).split("\n")) {
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > canvas.width - padding * 2 - font * 1.2) {
          lines.push(line); line = word;
        } else line = next;
      }
      if (line) lines.push(line);
    }
    height = 15 + 3 * lineHeight + lines.length * locationStep + footerHeight;
    if (height <= canvas.height - 12 || font <= 10) break;
    font *= .9;
  } while (true);
  const top = canvas.height - height;
  context.fillStyle = "rgba(0, 0, 0, 0.72)";
  context.fillRect(0, top, canvas.width, height);
  context.fillStyle = "#ffffff";
  context.textBaseline = "top";
  context.font = `600 ${font}px sans-serif`;
  let y = top + 15;
  const headings = [["calendar", `Day & Date: ${dateText}`], ["clock", `Time: ${timeText}`], ["pin", "Current Location:"]];
  for (const [icon, text] of headings) {
    drawStampIcon(context, icon, padding, y + font * .05, font);
    context.fillText(text, padding + font * 1.4, y); y += lineHeight;
  }
  context.font = `600 ${locationFont}px sans-serif`;
  for (const text of lines) { context.fillText(text, padding + font * 1.2, y); y += locationStep; }
  context.font = `${footerFont}px sans-serif`;
  if (attribution) context.fillText(attribution, padding, canvas.height - footerHeight + 4);
}

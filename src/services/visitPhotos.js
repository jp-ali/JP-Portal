export const formatAddressForStamp = (address = {}) => {
const house = address.house_number ? `House #${address.house_number}` : "";
const streetValue = address.road || address.street || address.pedestrian || address.path || "";
const street = streetValue;
const blockValue = address.block || address.neighbourhood || address.suburb || address.residential || address.quarter || "";
const block = blockValue;
const city = address.city || address.town || address.municipality || address.village || address.city_district || "";
const district = address.state_district || address.county || "";
const province = address.state || "";
const country = address.country || "";
const parts = [...new Set([house, street, block, city, district, province, country].filter(Boolean))];
return parts.join(", ");
};

export function drawVisitPhotoStamp(canvas, context, { dateText, timeText, locationText }) {
  const padding = 20;
  const font = Math.max(16, canvas.width * .022);
  const lineHeight = Math.max(24, canvas.width * .025);
  const locationFont = Math.max(14, font * .86);
  const locationStep = lineHeight * .92;
  const footerFont = Math.max(12, font * .55);
  const footerHeight = footerFont + 12;
  context.font = `600 ${locationFont}px sans-serif`;
  const lines = [];
  for (const paragraph of String(locationText).split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > canvas.width - padding * 2 - 18) {
        lines.push(line); line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  const shown = lines.slice(0, 6);
  if (lines.length > shown.length) shown[shown.length - 1] += " ...";
  const height = 15 + 3 * lineHeight + shown.length * locationStep + footerHeight;
  const top = canvas.height - height;
  context.fillStyle = "rgba(0, 0, 0, 0.72)";
  context.fillRect(0, top, canvas.width, height);
  context.fillStyle = "#ffffff";
  context.textBaseline = "top";
  context.font = `600 ${font}px sans-serif`;
  let y = top + 15;
  for (const text of [`Day & Date: ${dateText}`, `Time: ${timeText}`, "Current Location:"]) {
    context.fillText(text, padding, y); y += lineHeight;
  }
  context.font = `600 ${locationFont}px sans-serif`;
  for (const text of shown) { context.fillText(text, padding + 18, y); y += locationStep; }
  context.font = `${footerFont}px sans-serif`;
  context.fillText("Address © OpenStreetMap contributors", padding, canvas.height - footerHeight + 4);
}

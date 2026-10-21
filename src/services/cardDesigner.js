const escapeXml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);

export const defaultCardFields = [
  { id: "depotName", label: "Book depot name", x: 8.5, y: 24, fontSize: 68, color: "#242424", align: "left", bold: false },
  { id: "name", label: "Name", x: 8.5, y: 33, fontSize: 58, color: "#242424", align: "left", bold: false },
  { id: "designation", label: "Designation", x: 8.5, y: 41, fontSize: 45, color: "#555555", align: "left", bold: false },
  { id: "phone", label: "Phone", x: 13.2, y: 65.5, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "email", label: "Email", x: 13.2, y: 75, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "website", label: "Website", x: 64.5, y: 75, fontSize: 42, color: "#242424", align: "left", bold: false },
  { id: "address", label: "Address", x: 13.2, y: 87, fontSize: 42, color: "#242424", align: "left", bold: false }
];

export const defaultCardValues = {
  depotName: "Muhammad Ali Ashfaq",
  name: "",
  designation: "Marketing Coordinator",
  phone: "+92-3068482000",
  phone2: "",
  email: "info@javedpublishers.com",
  website: "javedpublishers.com",
  address: "Main outfall road, sanint nagar, Lahore, Punjab"
};

export function cardRenderEntries(template, values) {
  return template.fields.map((field) => {
    let value = String(values[field.id] || "");
    let y = field.y;
    let x = field.x;
    if (field.id === "phone2") {
      if (!value) return { field, value: "" };
      const first = template.fields.find((item) => item.id === "phone");
      if (!first || !values.phone) return { field, value: "" };
      x = Math.min(98, first.x + String(values.phone).length * first.fontSize * 0.55 / template.imageWidth * 100 + 1.2);
      y = first.y;
      value = `| ${value}`;
    }
    if (field.id === "designation" && !values.name && field.y === 41) y = 33;
    return { field: { ...field, x, y }, value };
  }).filter((entry) => entry.value);
}

export async function prepareCardImage(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose a card image (PNG, JPEG or WebP).");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(100, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(100, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.82 - attempt * 0.08);
      if (data.length <= 700000) return { image: data, imageWidth: canvas.width, imageHeight: canvas.height };
      scale *= 0.78;
    }
    throw new Error("This card image is too large. Choose a smaller image.");
  } finally { URL.revokeObjectURL(url); }
}

function linesFor(value) { return String(value ?? "").split(/\r?\n/).filter((line) => line.length); }

export function cardSvg(template, values) {
  const { image, imageWidth: width, imageHeight: height, widthMm, fields } = template;
  const heightMm = widthMm * height / width;
  const labels = cardRenderEntries(template, values).flatMap(({ field, value }) => linesFor(value).map((line, index) => {
    const x = field.x * width / 100;
    const y = field.y * height / 100 + index * field.fontSize * 1.2;
    const anchor = { left: "start", center: "middle", right: "end" }[field.align];
    return `<text x="${x}" y="${y}" fill="${field.color}" font-family="Arial, sans-serif" font-size="${field.fontSize}" font-weight="${field.bold ? 700 : 400}" text-anchor="${anchor}">${escapeXml(line)}</text>`;
  })).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${widthMm}mm" height="${heightMm}mm" viewBox="0 0 ${width} ${height}">\n<image x="0" y="0" width="${width}" height="${height}" xlink:href="${image}"/>\n${labels}\n</svg>`;
}

function cardFileName(values, extension) {
  const name = String(values.depotName || values.name || "card").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 55) || "card";
  return `${name}.${extension}`;
}

function saveDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 60000);
  return fileName;
}

export function downloadCardSvg(template, values) {
  const blob = new Blob([cardSvg(template, values)], { type: "image/svg+xml;charset=utf-8" });
  return saveDownload(blob, cardFileName(values, "svg"));
}

export async function downloadCardPdf(template, values) {
  const { jsPDF } = await import("jspdf");
  const { image, imageWidth: width, imageHeight: height, widthMm, fields } = template;
  const heightMm = widthMm * height / width;
  const pdf = new jsPDF({ unit: "mm", format: [widthMm, heightMm], orientation: widthMm >= heightMm ? "landscape" : "portrait" });
  pdf.addImage(image, "JPEG", 0, 0, widthMm, heightMm);
  cardRenderEntries(template, values).forEach(({ field, value }) => {
    const rgb = field.color.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16));
    pdf.setTextColor(...rgb);
    pdf.setFont("helvetica", field.bold ? "bold" : "normal");
    pdf.setFontSize(Math.max(4, field.fontSize * widthMm / width * 72 / 25.4));
    pdf.text(value, field.x * widthMm / 100, field.y * heightMm / 100, { align: field.align, baseline: "alphabetic" });
  });
  return saveDownload(pdf.output("blob"), cardFileName(values, "pdf"));
}

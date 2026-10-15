export const compressCanvasToTargetDataUrl = (sourceCanvas, targetBytes = 65 * 1024, maxWidth = 560, initialQuality = 0.48) => {
const estimateBytes = (dataUrl) => {
const base64 = String(dataUrl || "").split(",")[1] || "";
return Math.ceil((base64.length * 3) / 4);
};
let working = document.createElement("canvas");
const initialScale = Math.min(1, maxWidth / Math.max(1, sourceCanvas.width));
working.width = Math.max(1, Math.round(sourceCanvas.width * initialScale));
working.height = Math.max(1, Math.round(sourceCanvas.height * initialScale));
working.getContext("2d").drawImage(sourceCanvas, 0, 0, working.width, working.height);
let quality = initialQuality;
let dataUrl = working.toDataURL("image/jpeg", quality);
let passes = 0;
while (estimateBytes(dataUrl) > targetBytes && passes < 9) {
if (quality > 0.24) {
quality = Math.max(0.24, quality - 0.05);
} else if (working.width > 380) {
const smaller = document.createElement("canvas");
smaller.width = Math.max(380, Math.round(working.width * 0.86));
smaller.height = Math.max(1, Math.round(working.height * (smaller.width / working.width)));
smaller.getContext("2d").drawImage(working, 0, 0, smaller.width, smaller.height);
working = smaller;
quality = 0.38;
} else {
break;
}
dataUrl = working.toDataURL("image/jpeg", quality);
passes += 1;
}
return dataUrl;
};

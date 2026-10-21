export async function prepareProfilePhoto(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 360;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not process the image.");
    context.fillStyle = "#fff7fa";
    context.fillRect(0, 0, 360, 360);
    const scale = Math.min(324 / image.naturalWidth, 324 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (360 - width) / 2, (360 - height) / 2, width, height);
    let quality = 0.82;
    let photo = canvas.toDataURL("image/jpeg", quality);
    while (photo.length > 180000 && quality > 0.4) {
      quality -= 0.1;
      photo = canvas.toDataURL("image/jpeg", quality);
    }
    if (photo.length > 200000) throw new Error("This image could not be reduced enough. Choose a smaller image.");
    return photo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 360, 360);
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

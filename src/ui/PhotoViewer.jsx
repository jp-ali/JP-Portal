import React, { useState } from "react";
import { createPortal } from "react-dom";

export default function PhotoViewer({ image, mediaRecord, onClose, onDelete, onRestore, viewOnly = false, allowDownload = false }) {
  const [shareError, setShareError] = useState("");
  if (!image) return null;

  const canSaveToPhotos = allowDownload && /^data:image\/jpeg;base64,/.test(image)
    && typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)
    && typeof navigator.share === "function" && typeof navigator.canShare === "function";
  const saveToPhotos = async () => {
    setShareError("");
    try {
      const bytes = Uint8Array.from(atob(image.slice(image.indexOf(",") + 1)), (character) => character.charCodeAt(0));
      const file = new File([bytes], "visit-photo.jpg", { type: "image/jpeg" });
      if (!navigator.canShare({ files: [file] })) {
        setShareError("Photo sharing is unavailable. Use Download image instead.");
        return;
      }
      await navigator.share({ files: [file] });
    } catch (error) {
      if (error?.name !== "AbortError") setShareError("Could not open Photos sharing. Use Download image instead.");
    }
  };

  return createPortal(
    <div
      className="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Full size photo"
      onClick={onClose}
    >
      <img className="photo-viewer-image" src={image} alt="Full view" />
      <div className="photo-viewer-actions" onClick={(event) => event.stopPropagation()}>
        {canSaveToPhotos && <button type="button" onClick={saveToPhotos}>Save to Photos</button>}
        {(!viewOnly || allowDownload) && <a href={image} download="photo.jpg">Download image</a>}
        {!viewOnly && onDelete && mediaRecord?.type === "active" && (
          <button type="button" onClick={() => onDelete(mediaRecord.record)}>Delete picture</button>
        )}
        {!viewOnly && onRestore && mediaRecord?.type === "deleted" && (
          <button type="button" onClick={() => onRestore(mediaRecord.record)}>Restore picture</button>
        )}
        <button type="button" onClick={onClose}>Close</button>
        {shareError && <span role="status">{shareError}</span>}
      </div>
    </div>,
    document.fullscreenElement || document.body
  );
}

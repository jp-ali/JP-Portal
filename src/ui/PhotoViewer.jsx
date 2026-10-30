import React from "react";
import { createPortal } from "react-dom";

export default function PhotoViewer({ image, mediaRecord, onClose, onDelete, onRestore, viewOnly = false, allowDownload = false }) {
  if (!image) return null;

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
        {(!viewOnly || allowDownload) && <a href={image} download="photo.jpg">Download image</a>}
        {!viewOnly && onDelete && mediaRecord?.type === "active" && (
          <button type="button" onClick={() => onDelete(mediaRecord.record)}>Delete picture</button>
        )}
        {!viewOnly && onRestore && mediaRecord?.type === "deleted" && (
          <button type="button" onClick={() => onRestore(mediaRecord.record)}>Restore picture</button>
        )}
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>,
    document.fullscreenElement || document.body
  );
}

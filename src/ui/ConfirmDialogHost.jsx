import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeConfirmHost, takeConfirmRequest } from "./confirmDialog.js";
import "../styles/confirmDialog.css";

export default function ConfirmDialogHost() {
  const [request, setRequest] = useState(null);
  const requestRef = useRef(null);
  const locked = useRef(false);
  const cancelButton = useRef(null);

  useEffect(() => subscribeConfirmHost(() => {
    if (requestRef.current) return;
    const next = takeConfirmRequest();
    if (!next) return;
    requestRef.current = next;
    setRequest(next);
  }), []);
  useEffect(() => {
    if (!request) return;
    cancelButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      finish(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    const onBrowserBack = () => finish(false);
    window.addEventListener("popstate", onBrowserBack, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("popstate", onBrowserBack, true);
    };
  }, [request]);

  const finish = (confirmed) => {
    if (!requestRef.current || locked.current) return;
    locked.current = true;
    requestRef.current.resolve(confirmed);
    const next = takeConfirmRequest();
    requestRef.current = next;
    setRequest(next);
    queueMicrotask(() => { locked.current = false; });
  };

  if (!request) return null;
  return createPortal(<div className="portal-confirm-overlay" data-confirm-dialog onMouseDown={(event) => { if (event.target === event.currentTarget) finish(false); }}>
    <div className="portal-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="portal-confirm-title" aria-describedby="portal-confirm-message">
      <span className="portal-confirm-icon" aria-hidden="true">?</span>
      <h2 id="portal-confirm-title">Please confirm</h2>
      <p id="portal-confirm-message">{request.message}</p>
      <div className="portal-confirm-actions">
        <button ref={cancelButton} type="button" className="portal-confirm-cancel" onClick={() => finish(false)}>Cancel</button>
        <button type="button" className="portal-confirm-accept" onClick={() => finish(true)}>Confirm</button>
      </div>
    </div>
  </div>, document.body);
}

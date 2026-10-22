import { useEffect, useState } from "react";

const storageKey = (role, accountId) => `jp-portal-hidden-v1:${role}:${String(accountId || role).toLowerCase()}`;
const controlsKey = (role, accountId) => `jp-portal-hide-controls-v1:${role}:${String(accountId || role).toLowerCase()}`;
const controlsEvent = "jp-portal-hide-controls-change";
const readControls = (key) => {
  try { return localStorage.getItem(key) !== "off"; } catch { return true; }
};

function readHidden(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.key === "string" && typeof item.title === "string") : [];
  } catch { return []; }
}

export function useDashboardVisibility(role, accountId) {
  const key = storageKey(role, accountId);
  const eyeKey = controlsKey(role, accountId);
  const [hidden, setHidden] = useState(() => readHidden(key));
  const [hideControlsVisible, setHideControlsVisibleState] = useState(() => readControls(eyeKey));
  useEffect(() => { setHidden(readHidden(key)); }, [key]);
  useEffect(() => {
    setHideControlsVisibleState(readControls(eyeKey));
    const sync = (event) => { if (!event.key || event.key === eyeKey) setHideControlsVisibleState(readControls(eyeKey)); };
    const syncLocal = (event) => { if (event.detail?.key === eyeKey) setHideControlsVisibleState(event.detail.visible); };
    window.addEventListener("storage", sync);
    window.addEventListener(controlsEvent, syncLocal);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(controlsEvent, syncLocal); };
  }, [eyeKey]);
  const setHideControlsVisible = (visible) => {
    const next = Boolean(visible);
    setHideControlsVisibleState(next);
    try { localStorage.setItem(eyeKey, next ? "on" : "off"); } catch { /* Keep this session usable. */ }
    window.dispatchEvent(new CustomEvent(controlsEvent, { detail: { key: eyeKey, visible: next } }));
  };
  const update = (next) => {
    setHidden((current) => {
      const updated = next(current);
      try { localStorage.setItem(key, JSON.stringify(updated)); } catch { /* Keep the current session usable. */ }
      return updated;
    });
  };
  const hide = (item) => update((current) => current.some((entry) => entry.key === item.key) ? current : [...current, item]);
  const restore = (itemKey) => update((current) => current.filter((item) => item.key !== itemKey));
  return { hidden, hide, restore, isHidden: (itemKey) => hidden.some((item) => item.key === itemKey), hideControlsVisible, setHideControlsVisible };
}

export const dashboardItemKeys = {
  hero: "hero",
  imprints: "imprints",
  banner: (view) => `banner:${view}`,
  stat: (label) => `stat:${label}`,
  section: (title) => `section:${title}`,
  card: (sectionTitle, title) => `card:${sectionTitle}:${title}`
};

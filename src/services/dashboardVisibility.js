import { useEffect, useState } from "react";

const storageKey = (role, accountId) => `jp-portal-hidden-v1:${role}:${String(accountId || role).toLowerCase()}`;

function readHidden(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.key === "string" && typeof item.title === "string") : [];
  } catch { return []; }
}

export function useDashboardVisibility(role, accountId) {
  const key = storageKey(role, accountId);
  const [hidden, setHidden] = useState(() => readHidden(key));
  useEffect(() => { setHidden(readHidden(key)); }, [key]);
  const update = (next) => {
    setHidden((current) => {
      const updated = next(current);
      try { localStorage.setItem(key, JSON.stringify(updated)); } catch { /* Keep the current session usable. */ }
      return updated;
    });
  };
  const hide = (item) => update((current) => current.some((entry) => entry.key === item.key) ? current : [...current, item]);
  const restore = (itemKey) => update((current) => current.filter((item) => item.key !== itemKey));
  return { hidden, hide, restore, isHidden: (itemKey) => hidden.some((item) => item.key === itemKey) };
}

export const dashboardItemKeys = {
  hero: "hero",
  imprints: "imprints",
  banner: (view) => `banner:${view}`,
  stat: (label) => `stat:${label}`,
  section: (title) => `section:${title}`,
  card: (sectionTitle, title) => `card:${sectionTitle}:${title}`
};

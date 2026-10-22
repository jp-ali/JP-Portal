const keyFor = (email) => `jp-offline-visit-catalog:${String(email || "").trim().toLowerCase()}`;

export function readOfflineVisitCatalog(email) {
  try {
    const data = JSON.parse(localStorage.getItem(keyFor(email)) || "null");
    return data && typeof data === "object" ? data : { cities: [], areas: [], schools: [] };
  } catch {
    return { cities: [], areas: [], schools: [] };
  }
}

export function cacheOfflineVisitCatalog(user, cities = [], areas = [], schools = []) {
  if (user?.role !== "marketer" || !user.email) return;
  const previous = readOfflineVisitCatalog(user.email);
  const merge = (oldRows, newRows) => [...new Map([...(oldRows || []), ...newRows].filter((row) => row?.id).map((row) => [row.id, row])).values()];
  const cityIds = user.assignedCityIds || [];
  const areaIds = user.assignedAreaIds || [];
  const catalog = {
    assignedCityIds: cityIds,
    assignedAreaIds: areaIds,
    cities: merge(previous.cities, cities.filter((row) => cityIds.includes(row.id))),
    areas: merge(previous.areas, areas.filter((row) => areaIds.includes(row.id))),
    schools: merge(previous.schools, schools.filter((row) => areaIds.includes(row.areaId)))
  };
  try { localStorage.setItem(keyFor(user.email), JSON.stringify(catalog)); } catch { /* Storage may be full. */ }
}

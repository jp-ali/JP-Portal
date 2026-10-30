import { useEffect, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from "../../services/dataGateway.js";
import { db } from "../../services/dataGateway.js";
import { PAKISTAN_CITY_CATALOG, PAKISTAN_CITY_DATA_URL, normalizeEntityName, makeCityId, makeAreaId, makeSchoolId } from "../../domain/catalog.js";
import { fetchOverpassJson, resolvePakistanCityFromNominatim, extractAreaRecords, resolvePakistanAreaFromNominatim, extractSchoolRecords, buildSchoolQuery } from "../../services/openStreetMap.js";

export function useLocationCatalog({ visitAreaId, visitCityId, assignmentAreaFocusId, setSchoolName, setVisitSchoolIds, setVisitSchoolLoadError, setVisitSchoolSearch, setVisitSchoolsLoading }) {
const [citiesList, setCitiesList] = useState([]);
const [areasList, setAreasList] = useState([]);
const [schoolsList, setSchoolsList] = useState([]);
const [cityCatalogSyncing, setCityCatalogSyncing] = useState(false);
const [cityCatalogSyncMessage, setCityCatalogSyncMessage] = useState("");
const [areaSyncingCityId, setAreaSyncingCityId] = useState("");
const [areaSyncMessage, setAreaSyncMessage] = useState("");
const [schoolSyncingAreaId, setSchoolSyncingAreaId] = useState("");
const [schoolSyncMessage, setSchoolSyncMessage] = useState("");
const schoolAutoSyncedAreasRef = useRef(new Set());
const areaSchoolsMemoryCacheRef = useRef(new Map());
const areaSyncPromiseRef = useRef(new Map());
const schoolSyncPromiseRef = useRef(new Map());
const mergeSchoolsIntoState = (areaId, areaSchools) => {
const clean = (areaSchools || []).filter(isUsableSchoolRecord)
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
areaSchoolsMemoryCacheRef.current.set(areaId, clean);
try { localStorage.setItem(`javed_portal_schools_${areaId}`, JSON.stringify(clean)); } catch (_) {}
setSchoolsList(prev => {
const keepAreaIds = new Set([visitAreaId, assignmentAreaFocusId, areaId].filter(Boolean));
const keepOtherAreas = prev.filter((school) => school.areaId !== areaId && keepAreaIds.has(school.areaId));
return [...keepOtherAreas, ...clean].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
});
return clean;
};
const readCachedSchoolsForArea = (areaId) => {
const memory = areaSchoolsMemoryCacheRef.current.get(areaId);
if (Array.isArray(memory) && memory.length) return memory;
try {
const parsed = JSON.parse(localStorage.getItem(`javed_portal_schools_${areaId}`) || "[]");
if (Array.isArray(parsed) && parsed.length) return mergeSchoolsIntoState(areaId, parsed);
} catch (_) {}
return [];
};
const mergeAreasIntoState = (cityId, cityAreas) => {
const clean = (cityAreas || [])
.filter((a) => a?.id && a?.cityId === cityId)
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
try { localStorage.setItem(`javed_portal_areas_${cityId}`, JSON.stringify(clean)); } catch (_) {}
setAreasList((prev) => {
const keepOtherCities = prev.filter((a) => a.cityId !== cityId);
return [...keepOtherCities, ...clean];
});
return clean;
};
const readCachedAreasForCity = (cityId) => {
if (!cityId) return [];
const inState = areasList.filter((a) => a.cityId === cityId);
if (inState.length) return inState;
try {
const parsed = JSON.parse(localStorage.getItem(`javed_portal_areas_${cityId}`) || "[]");
if (Array.isArray(parsed) && parsed.length) return mergeAreasIntoState(cityId, parsed);
} catch (_) {}
return [];
};
const fetchAreasForCity = async (cityId) => {
if (!cityId) return [];
const cached = readCachedAreasForCity(cityId);
try {
const snap = await getDocs(query(collection(db, "areas"), where("cityId", "==", cityId)));
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
return mergeAreasIntoState(cityId, rows);
} catch (err) {
console.error("City area load error:", err);
return cached;
}
};
const fetchAreasForCities = async (cityIds = []) => {
const uniqueIds = [...new Set((cityIds || []).filter(Boolean))];
uniqueIds.forEach((id) => readCachedAreasForCity(id));
if (!uniqueIds.length) return [];
try {
const all = [];
for (let i = 0; i < uniqueIds.length; i += 30) {
const chunk = uniqueIds.slice(i, i + 30);
const snap = await getDocs(query(collection(db, "areas"), where("cityId", "in", chunk)));
snap.docs.forEach((d) => all.push({ id: d.id, ...d.data() }));
}
uniqueIds.forEach((cityId) => {
mergeAreasIntoState(cityId, all.filter((a) => a.cityId === cityId));
});
return all;
} catch (err) {
console.error("Assigned area load error:", err);
return areasList.filter((a) => uniqueIds.includes(a.cityId));
}
};
const getLightBaseCities = () => [...new Set(PAKISTAN_CITY_CATALOG)]
.map((name) => ({
id: makeCityId(name),
name,
normalizedName: normalizeEntityName(name),
country: "Pakistan",
source: "built-in"
}))
.sort((a, b) => a.name.localeCompare(b.name));
const mergeCitiesIntoState = (rows = []) => {
setCitiesList((prev) => {
const map = new Map();
getLightBaseCities().forEach((c) => map.set(c.id, c));
prev.forEach((c) => { if (c?.id) map.set(c.id, { ...map.get(c.id), ...c }); });
rows.forEach((c) => { if (c?.id) map.set(c.id, { ...map.get(c.id), ...c }); });
return [...map.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
});
};
const fetchLocationCatalog = async () => {
const baseCities = getLightBaseCities();
let cachedManual = [];
try {
cachedManual = JSON.parse(localStorage.getItem("javed_portal_manual_cities_v1") || "[]");
if (!Array.isArray(cachedManual)) cachedManual = [];
} catch (_) { cachedManual = []; }
const instantMap = new Map(baseCities.map((c) => [c.id, c]));
cachedManual.forEach((c) => { if (c?.id) instantMap.set(c.id, { ...instantMap.get(c.id), ...c }); });
const instantCities = [...instantMap.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
setCitiesList(instantCities);
try {
const manualSnap = await getDocs(query(collection(db, "cities"), where("source", "==", "manual-admin")));
const manualCities = manualSnap.docs
.map((d) => ({ id: d.id, ...d.data() }))
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
try { localStorage.setItem("javed_portal_manual_cities_v1", JSON.stringify(manualCities)); } catch (_) {}
const map = new Map(baseCities.map((c) => [c.id, c]));
manualCities.forEach((c) => map.set(c.id, { ...map.get(c.id), ...c }));
const cities = [...map.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
setCitiesList(cities);
return { cities, areas: areasList, schools: schoolsList };
} catch (err) {
console.error("Manual city catalog load error:", err);
return { cities: instantCities, areas: areasList, schools: schoolsList };
}
};
const fetchCitiesByIds = async (cityIds = []) => {
const ids = [...new Set((cityIds || []).filter(Boolean))];
if (!ids.length) return [];
const baseRows = getLightBaseCities().filter((c) => ids.includes(c.id));
if (baseRows.length) mergeCitiesIntoState(baseRows);
try {
const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "cities", id))));
const storedRows = snaps
.filter((snap) => snap.exists())
.map((snap) => ({ id: snap.id, ...snap.data() }));
const map = new Map(baseRows.map((c) => [c.id, c]));
storedRows.forEach((c) => map.set(c.id, { ...map.get(c.id), ...c }));
const rows = [...map.values()];
mergeCitiesIntoState(rows);
return rows;
} catch (err) {
console.error("Assigned city load error:", err);
return baseRows.length ? baseRows : citiesList.filter((c) => ids.includes(c.id));
}
};
const isUsableSchoolRecord = (school) => {
if (!school) return false;
return Boolean(school.id && school.name && school.cityId && school.areaId);
};
const fetchSchoolsForArea = async (areaId, cityId = "") => {
if (!areaId) return [];
const cached = readCachedSchoolsForArea(areaId)
.filter((school) => isUsableSchoolRecord(school) && (!cityId || school.cityId === cityId));
try {
const schoolsQuery = query(
collection(db, "schools"),
where("areaId", "==", areaId)
);
const snap = await getDocs(schoolsQuery);
const areaSchools = snap.docs
.map((d) => ({ id: d.id, ...d.data() }))
.filter((school) =>
isUsableSchoolRecord(school) &&
school.areaId === areaId &&
(!cityId || school.cityId === cityId)
)
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
return mergeSchoolsIntoState(areaId, areaSchools);
} catch (err) {
console.error("Area school load error:", err);
return cached;
}
};
useEffect(() => {
let cancelled = false;
const loadVisitSchools = async () => {
setVisitSchoolIds([]);
setSchoolName("");
setVisitSchoolSearch("");
setVisitSchoolLoadError("");
if (!visitCityId || !visitAreaId) {
setVisitSchoolsLoading(false);
return;
}
readCachedSchoolsForArea(visitAreaId);
setVisitSchoolsLoading(true);
try {
const rows = await fetchSchoolsForArea(visitAreaId, visitCityId);
if (cancelled) return;
if (!rows.length) {
setVisitSchoolLoadError("No schools found in this area.");
}
} catch (err) {
if (cancelled) return;
console.error("Visit school dropdown load error:", err);
setVisitSchoolLoadError("Schools could not be loaded. You can add a school below.");
} finally {
if (!cancelled) setVisitSchoolsLoading(false);
}
};
loadVisitSchools();
return () => { cancelled = true; };
}, [visitCityId, visitAreaId]);
const prefetchAssignedAreaSchools = (areaIds = []) => {
[...new Set(areaIds)].forEach((areaId) => {
if (areaId) readCachedSchoolsForArea(areaId);
});
};
const ensurePakistanCitiesSeeded = async () => {
const baseCities = getLightBaseCities();
setCitiesList((prev) => {
const map = new Map(baseCities.map((c) => [c.id, c]));
prev.forEach((c) => { if (c?.id) map.set(c.id, { ...map.get(c.id), ...c }); });
return [...map.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
});
return baseCities;
};
const writeDocsInChunks = async (collectionName, records, idGetter) => {
const chunkSize = 400;
for (let i = 0; i < records.length; i += chunkSize) {
const batch = writeBatch(db);
records.slice(i, i + chunkSize).forEach((record) => {
const id = idGetter(record);
batch.set(doc(db, collectionName, id), record.data, { merge: true });
});
await batch.commit();
}
};
const syncPakistanCitiesFromOpenStreetMap = async (force = false) => {
if (cityCatalogSyncing) return;
setCityCatalogSyncing(true);
setCityCatalogSyncMessage("Loading Pakistan cities/towns A-Z...");
try {
const metaRef = doc(db, "system_meta", "pakistan_city_catalog_v4");
const metaSnap = await getDoc(metaRef);
if (!force && metaSnap.exists()) {
setCityCatalogSyncMessage("Pakistan city catalog is already synced.");
return;
}
const unique = new Map();
const upsertCity = (city) => {
const name = String(city?.name || "").trim().replace(/\s+/g, " ");
if (!name) return;
const key = normalizeEntityName(name);
if (!key) return;
const prev = unique.get(key) || {};
unique.set(key, {
...prev,
...city,
name,
province: city.province || prev.province || "",
lat: city.lat ?? prev.lat ?? null,
lon: city.lon ?? prev.lon ?? null,
osmType: city.osmType || prev.osmType || "",
osmId: city.osmId || prev.osmId || null,
placeType: city.placeType || prev.placeType || ""
});
};
[...new Set(PAKISTAN_CITY_CATALOG)].forEach((name) => upsertCity({ name, source: "built-in" }));
try {
const response = await fetch(PAKISTAN_CITY_DATA_URL, { cache: "no-store" });
if (response.ok) {
const dataset = await response.json();
(Array.isArray(dataset) ? dataset : []).forEach((item) => {
if (String(item?.country || "").toLowerCase() !== "pakistan" && String(item?.iso2 || "").toUpperCase() !== "PK") return;
upsertCity({
name: item.city,
province: item.admin_name || "",
lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
lon: Number.isFinite(Number(item.lng)) ? Number(item.lng) : null,
placeType: item.capital ? "city" : "town",
source: "public-city-dataset"
});
});
}
} catch (datasetErr) {
console.warn("Pakistan city dataset could not load; continuing with OSM/fallback.", datasetErr);
}
try {
const overpassQuery = `[out:json][timeout:120];
area["ISO3166-1"="PK"]["boundary"="administrative"]->.country;
(
  nwr["place"~"^(city|town|village|municipality)$"](area.country);
);
out center tags;`;
const data = await fetchOverpassJson(overpassQuery);
(data.elements || []).forEach((el) => {
const tags = el.tags || {};
const name = String(tags["name:en"] || tags.name || "").trim().replace(/\s+/g, " ");
if (!name) return;
upsertCity({
name,
province: tags["is_in:state"] || tags["addr:state"] || tags["is_in:province"] || "",
osmType: el.type || "",
osmId: el.id || null,
lat: el.lat ?? el.center?.lat ?? null,
lon: el.lon ?? el.center?.lon ?? null,
placeType: tags.place || "",
source: "openstreetmap"
});
});
} catch (osmErr) {
console.warn("Expanded OSM city sync could not complete; using other city sources.", osmErr);
}
const cities = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
if (!cities.length) throw new Error("No Pakistan cities were available from any source.");
await writeDocsInChunks("cities", cities.map((city) => ({
city,
data: {
name: city.name,
normalizedName: normalizeEntityName(city.name),
country: "Pakistan",
province: city.province || "",
source: city.source || "merged-catalog",
osmType: city.osmType || "",
osmId: city.osmId || null,
lat: city.lat ?? null,
lon: city.lon ?? null,
placeType: city.placeType || "",
catalogVersion: 4,
syncedAt: serverTimestamp()
}
})), (record) => makeCityId(record.city.name));
await setDoc(metaRef, {
version: 4,
syncedAt: serverTimestamp(),
cityCount: cities.length,
source: "Merged Pakistan city catalog + OpenStreetMap"
}, { merge: true });
await fetchLocationCatalog();
setCityCatalogSyncMessage(`${cities.length} Pakistan cities/towns loaded A-Z.`);
} catch (err) {
console.error("Pakistan city sync error:", err);
setCityCatalogSyncMessage(`City sync could not complete: ${err.message}. Existing saved cities are still available.`);
} finally {
setCityCatalogSyncing(false);
}
};
const syncAreasForCityFromOpenStreetMap = async (city, force = false) => {
if (!city?.id) return [];
if (areaSyncPromiseRef.current.has(city.id)) return areaSyncPromiseRef.current.get(city.id);
try {
const citySnap = await getDoc(doc(db, "cities", city.id));
if (citySnap.exists()) city = { ...city, ...citySnap.data(), id: city.id };
} catch (_) {}
const existingForCity = readCachedAreasForCity(city.id);
if (!force && Number(city.areaCatalogVersion || 0) >= 8 && existingForCity.length > 0) return existingForCity;
const task = (async () => {
setAreaSyncingCityId(city.id);
setAreaSyncMessage("");
try {
const allElements = [];
const addElements = (data) => { if (Array.isArray(data?.elements)) allElements.push(...data.elements); };
const areaBody = (selector) => `[out:json][timeout:30];
(
  nwr["place"~"^(suburb|neighbourhood|quarter|locality|borough|hamlet|village|city_block)$"]${selector};
  nwr["boundary"="administrative"]["admin_level"~"^(7|8|9|10|11)$"]${selector};
  nwr["landuse"="residential"]["name"]${selector};
);
out center tags;`;
let resolved = null;
let boundaryType = city.resolvedOsmType || city.osmType || "";
let boundaryId = city.resolvedOsmId || city.osmId || null;
let resolvedBoundingBox = Array.isArray(city.resolvedBoundingBox) ? city.resolvedBoundingBox : [];
if (["relation", "way"].includes(boundaryType) && boundaryId) {
const selector = boundaryType === "relation" ? "rel" : "way";
const queryText = `[out:json][timeout:30];
${selector}(${Number(boundaryId)});
map_to_area -> .cityArea;
(
  nwr["place"~"^(suburb|neighbourhood|quarter|locality|borough|hamlet|village|city_block)$"](area.cityArea);
  nwr["boundary"="administrative"]["admin_level"~"^(7|8|9|10|11)$"](area.cityArea);
  nwr["landuse"="residential"]["name"](area.cityArea);
);
out center tags;`;
try { addElements(await fetchOverpassJson(queryText)); }
catch (err) { console.warn("Exact city area lookup failed.", err); }
}
if (!allElements.length) {
try {
resolved = await resolvePakistanCityFromNominatim(city.name);
boundaryType = resolved?.osm_type || boundaryType;
boundaryId = resolved?.osm_id || boundaryId;
resolvedBoundingBox = resolved?.boundingbox || resolvedBoundingBox;
} catch (err) {
console.warn("City lookup failed; using saved bounds if available.", err);
}
if (["relation", "way"].includes(boundaryType) && boundaryId) {
const selector = boundaryType === "relation" ? "rel" : "way";
const queryText = `[out:json][timeout:30];
${selector}(${Number(boundaryId)});
map_to_area -> .cityArea;
(
  nwr["place"~"^(suburb|neighbourhood|quarter|locality|borough|hamlet|village|city_block)$"](area.cityArea);
  nwr["boundary"="administrative"]["admin_level"~"^(7|8|9|10|11)$"](area.cityArea);
  nwr["landuse"="residential"]["name"](area.cityArea);
);
out center tags;`;
try { addElements(await fetchOverpassJson(queryText)); }
catch (err) { console.warn("Resolved city area lookup failed.", err); }
}
}
if (!allElements.length) {
const bbox = Array.isArray(resolvedBoundingBox) ? resolvedBoundingBox.map(Number) : [];
if (bbox.length === 4 && bbox.every(Number.isFinite)) {
const [south, north, west, east] = bbox;
try { addElements(await fetchOverpassJson(areaBody(`(${south},${west},${north},${east})`))); }
catch (err) { console.warn("City bounding-box area lookup failed.", err); }
}
}
const discovered = extractAreaRecords(allElements, city);
if (!discovered.length) {
setAreaSyncMessage("No mapped areas found. Add the missing area below.");
return existingForCity;
}
await writeDocsInChunks("areas", discovered.map((area) => ({
area,
data: {
name: area.name,
normalizedName: normalizeEntityName(area.name),
cityId: city.id,
cityName: city.name,
source: "openstreetmap",
osmType: area.osmType,
osmId: area.osmId,
lat: area.lat ?? null,
lon: area.lon ?? null,
resolvedSchoolAreaBoundingBox: Array.isArray(area.bounds) ? area.bounds : [],
category: area.category,
catalogVersion: 8,
syncedAt: serverTimestamp()
}
})), (record) => makeAreaId(city.id, record.area.name));
const cityPatch = {
areaCatalogVersion: 8,
areasSyncedAt: serverTimestamp(),
resolvedOsmType: resolved?.osm_type || boundaryType || "",
resolvedOsmId: resolved?.osm_id || boundaryId || null,
resolvedBoundingBox: resolved?.boundingbox || resolvedBoundingBox || [],
resolvedDisplayName: resolved?.display_name || city.resolvedDisplayName || "",
resolvedLat: Number(resolved?.lat ?? city.resolvedLat ?? city.lat) || null,
resolvedLon: Number(resolved?.lon ?? city.resolvedLon ?? city.lon) || null
};
await setDoc(doc(db, "cities", city.id), cityPatch, { merge: true });
setCitiesList((prev) => prev.map((c) => c.id === city.id ? { ...c, ...cityPatch, areaCatalogVersion: 8 } : c));
const loaded = await fetchAreasForCity(city.id);
setAreaSyncMessage(`${loaded.length} areas ready for ${city.name}.`);
return loaded;
} catch (err) {
console.error("Area map sync error:", err);
setAreaSyncMessage("Map lookup failed. Add the missing area below.");
return existingForCity;
} finally {
setAreaSyncingCityId((current) => current === city.id ? "" : current);
}
})();
areaSyncPromiseRef.current.set(city.id, task);
try { return await task; }
finally { areaSyncPromiseRef.current.delete(city.id); }
};
const deleteImportedSchoolsForArea = async (areaId) => {
const snap = await getDocs(query(collection(db, "schools"), where("areaId", "==", areaId)));
const imported = snap.docs.filter(d => d.data()?.source !== "manual-marketer");
for (let i = 0; i < imported.length; i += 400) {
const batch = writeBatch(db);
imported.slice(i, i + 400).forEach(d => batch.delete(d.ref));
await batch.commit();
}
};
const syncSchoolsForAreaFromOpenStreetMap = async (area, force = false) => {
if (!area?.id) return [];
if (schoolSyncPromiseRef.current.has(area.id)) return schoolSyncPromiseRef.current.get(area.id);
const city = citiesList.find((c) => c.id === area.cityId);
if (!city) return [];
const savedNow = readCachedSchoolsForArea(area.id)
.filter((school) => school.areaId === area.id && isUsableSchoolRecord(school));
if (!force && Number(area.schoolCatalogVersion || 0) >= 8 && savedNow.length > 0) return savedNow;
const task = (async () => {
setSchoolSyncingAreaId(area.id);
setSchoolSyncMessage("");
try {
const allElements = [];
const addElements = (data) => {
if (Array.isArray(data?.elements)) allElements.push(...data.elements);
};
let resolved = null;
const runExactBoundaryQuery = async (osmType, osmId) => {
if (!["relation", "way"].includes(osmType) || !osmId) return false;
const selector = osmType === "relation" ? "rel" : "way";
const queryText = `[out:json][timeout:20];
${selector}(${Number(osmId)});
map_to_area -> .selectedArea;
(
  nwr["amenity"="school"]["name"](area.selectedArea);
);
out center tags;`;
try {
const data = await fetchOverpassJson(queryText);
addElements(data);
return true;
} catch (err) {
console.warn("Exact area school lookup failed.", err);
return false;
}
};
await runExactBoundaryQuery(area.osmType, area.osmId);
if (!allElements.length) {
try { resolved = await resolvePakistanAreaFromNominatim(area, city); }
catch (err) { console.warn("Area boundary lookup failed.", err); }
if (resolved && ["relation", "way"].includes(resolved.osm_type) && resolved.osm_id) {
if (!(resolved.osm_type === area.osmType && Number(resolved.osm_id) === Number(area.osmId))) {
await runExactBoundaryQuery(resolved.osm_type, resolved.osm_id);
}
}
}
if (!allElements.length) {
const savedBox = Array.isArray(area.resolvedSchoolAreaBoundingBox) ? area.resolvedSchoolAreaBoundingBox : [];
const boxSource = Array.isArray(resolved?.boundingbox) && resolved.boundingbox.length === 4
? resolved.boundingbox
: savedBox;
const bbox = boxSource.map(Number);
if (bbox.length === 4 && bbox.every(Number.isFinite)) {
const [south, north, west, east] = bbox;
try { addElements(await fetchOverpassJson(buildSchoolQuery(`(${south},${west},${north},${east})`))); }
catch (err) { console.warn("Area bounding-box school lookup failed.", err); }
}
}
const discovered = extractSchoolRecords(allElements);
if (!discovered.length) return savedNow;
const manualExisting = schoolsList.filter((school) =>
school.areaId === area.id && school.source === "manual-marketer"
);
const manualNames = new Set(manualExisting.map((school) => normalizeEntityName(school.name || "")));
const schoolsToWrite = discovered.filter((school) => !manualNames.has(normalizeEntityName(school.name)));
if (schoolsToWrite.length) {
await writeDocsInChunks("schools", schoolsToWrite.map((school) => ({
school,
data: {
name: school.name,
normalizedName: normalizeEntityName(school.name),
cityId: city.id,
cityName: city.name,
areaId: area.id,
areaName: area.name,
source: "openstreetmap",
osmType: school.osmType,
osmId: school.osmId,
lat: school.lat ?? null,
lon: school.lon ?? null,
operator: school.operator,
schoolType: "school",
catalogVersion: 8,
syncedAt: serverTimestamp()
}
})), (record) => makeSchoolId(area.id, record.school.name));
}
const savedById = new Map(schoolsList.filter((school) => school.areaId === area.id).map((school) => [school.id, school]));
const importedForState = schoolsToWrite.map((school) => ({
...savedById.get(makeSchoolId(area.id, school.name)),
id: makeSchoolId(area.id, school.name),
name: school.name,
normalizedName: normalizeEntityName(school.name),
cityId: city.id,
cityName: city.name,
areaId: area.id,
areaName: area.name,
source: "openstreetmap",
osmType: school.osmType,
osmId: school.osmId,
lat: school.lat ?? null,
lon: school.lon ?? null,
operator: school.operator,
schoolType: "school",
catalogVersion: 8
}));
const mergedSchools = [...manualExisting, ...importedForState]
.filter(isUsableSchoolRecord)
.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
mergeSchoolsIntoState(area.id, mergedSchools);
const areaPatch = {
schoolCatalogVersion: 8,
schoolsSyncedAt: serverTimestamp(),
resolvedSchoolAreaOsmType: resolved?.osm_type || area.osmType || "",
resolvedSchoolAreaOsmId: resolved?.osm_id || area.osmId || null,
resolvedSchoolAreaBoundingBox: resolved?.boundingbox || area.resolvedSchoolAreaBoundingBox || [],
resolvedSchoolAreaLat: Number(resolved?.lat ?? area.lat) || null,
resolvedSchoolAreaLon: Number(resolved?.lon ?? area.lon) || null
};
await setDoc(doc(db, "areas", area.id), areaPatch, { merge: true });
const sameCityAreas = areasList
.filter((a) => a.cityId === area.cityId)
.map((a) => a.id === area.id ? { ...a, ...areaPatch, schoolCatalogVersion: 8 } : a);
if (sameCityAreas.length) mergeAreasIntoState(area.cityId, sameCityAreas);
schoolAutoSyncedAreasRef.current.add(area.id);
return mergedSchools;
} catch (err) {
console.error("School map sync error:", err);
return savedNow;
} finally {
setSchoolSyncingAreaId((current) => current === area.id ? "" : current);
setSchoolSyncMessage("");
}
})();
schoolSyncPromiseRef.current.set(area.id, task);
try { return await task; }
finally { schoolSyncPromiseRef.current.delete(area.id); }
};
return { citiesList, setCitiesList, areasList, setAreasList, schoolsList, setSchoolsList, cityCatalogSyncing, setCityCatalogSyncing, cityCatalogSyncMessage, setCityCatalogSyncMessage, areaSyncingCityId, setAreaSyncingCityId, areaSyncMessage, setAreaSyncMessage, schoolSyncingAreaId, setSchoolSyncingAreaId, schoolSyncMessage, setSchoolSyncMessage, mergeSchoolsIntoState, readCachedSchoolsForArea, mergeAreasIntoState, readCachedAreasForCity, fetchAreasForCity, fetchAreasForCities, getLightBaseCities, mergeCitiesIntoState, fetchLocationCatalog, fetchCitiesByIds, isUsableSchoolRecord, fetchSchoolsForArea, prefetchAssignedAreaSchools, ensurePakistanCitiesSeeded, syncPakistanCitiesFromOpenStreetMap, syncAreasForCityFromOpenStreetMap, syncSchoolsForAreaFromOpenStreetMap };
}

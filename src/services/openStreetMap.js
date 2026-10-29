import { normalizeEntityName } from "../domain/catalog.js";

export const fetchOverpassJson = async (queryText) => {
const endpoints = [
"https://overpass.kumi.systems/api/interpreter",
"https://overpass-api.de/api/interpreter"
];
const controllers = [];
const requestOne = async (endpoint) => {
const controller = new AbortController();
controllers.push(controller);
const timer = setTimeout(() => controller.abort(), 9000);
try {
const response = await fetch(endpoint, {
method: "POST",
headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
body: new URLSearchParams({ data: queryText }).toString(),
signal: controller.signal
});
if (!response.ok) throw new Error(`Map service returned ${response.status}`);
return await response.json();
} finally {
clearTimeout(timer);
}
};
try {
const result = await Promise.any(endpoints.map(requestOne));
controllers.forEach((controller) => { try { controller.abort(); } catch (_) {} });
return result;
} catch (err) {
controllers.forEach((controller) => { try { controller.abort(); } catch (_) {} });
throw new Error("Unable to reach map service quickly. The saved catalog will still be used.");
}
};

export const resolvePakistanCityFromNominatim = async (cityName) => {
const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&addressdetails=1&namedetails=1&limit=8&q=${encodeURIComponent(`${cityName}, Pakistan`)}`;
const response = await fetch(url, { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(12000) });
if (!response.ok) throw new Error(`Location lookup returned ${response.status}`);
const results = await response.json();
if (!Array.isArray(results) || !results.length) throw new Error(`Could not locate ${cityName} in Pakistan.`);
const normalized = normalizeEntityName(cityName);
const scored = results.map((r) => {
const display = normalizeEntityName(r.display_name || "");
const resultName = normalizeEntityName(r.namedetails?.name || r.name || "");
let score = 0;
if (resultName === normalized) score += 5;
if (display.startsWith(normalized)) score += 3;
if (["city", "town", "administrative"].includes(r.type)) score += 2;
if (["relation", "way"].includes(r.osm_type)) score += 1;
return { r, score };
}).sort((a, b) => b.score - a.score);
return scored[0].r;
};
export const extractAreaRecords = (elements, city) => {
const unique = new Map();
(elements || []).forEach((el) => {
const tags = el.tags || {};
const name = String(tags["name:en"] || tags.name || "").trim().replace(/\s+/g, " ");
if (!name) return;
if (normalizeEntityName(name) === normalizeEntityName(city.name)) return;
const key = normalizeEntityName(name);
if (!key || unique.has(key)) return;
unique.set(key, {
name,
osmType: el.type || "",
osmId: el.id || null,
lat: el.lat ?? el.center?.lat ?? null,
lon: el.lon ?? el.center?.lon ?? null,
bounds: el.bounds ? [el.bounds.minlat, el.bounds.maxlat, el.bounds.minlon, el.bounds.maxlon] : [],
category: tags.place || (tags.boundary ? `admin-${tags.admin_level || ""}` : tags.landuse || "area")
});
});
return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const resolvePakistanAreaFromNominatim = async (area, city) => {
const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pk&addressdetails=1&namedetails=1&limit=8&q=${encodeURIComponent(`${area.name}, ${city.name}, Pakistan`)}`;
const response = await fetch(url, { headers: { "Accept-Language": "en" }, signal: AbortSignal.timeout(12000) });
if (!response.ok) throw new Error(`Area lookup returned ${response.status}`);
const results = await response.json();
if (!Array.isArray(results) || !results.length) throw new Error(`Could not locate ${area.name}, ${city.name}.`);
const areaKey = normalizeEntityName(area.name);
const cityKey = normalizeEntityName(city.name);
const scored = results.map((r) => {
const display = normalizeEntityName(r.display_name || "");
const resultName = normalizeEntityName(r.namedetails?.name || r.name || "");
let score = 0;
if (resultName === areaKey) score += 6;
if (display.includes(areaKey)) score += 3;
if (display.includes(cityKey)) score += 3;
if (["relation", "way"].includes(r.osm_type)) score += 1;
return { r, score };
}).sort((a, b) => b.score - a.score);
return scored[0].r;
};
export const extractSchoolRecords = (elements) => {
const unique = new Map();
(elements || []).forEach((el) => {
const tags = el.tags || {};
if (tags.amenity !== "school") return;
const name = String(tags["name:en"] || tags.name || "").trim().replace(/\s+/g, " ");
if (!name) return;
const key = normalizeEntityName(name);
if (!key || unique.has(key)) return;
unique.set(key, {
name,
osmType: el.type || "",
osmId: el.id || null,
lat: el.lat ?? el.center?.lat ?? null,
lon: el.lon ?? el.center?.lon ?? null,
operator: tags.operator || "",
schoolType: "school"
});
});
return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
};
export const buildSchoolQuery = (selector) => `[out:json][timeout:25];
(
  nwr["amenity"="school"]["name"]${selector};
);
out center tags;`;

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { makeAreaId, makeCityId, normalizeEntityName } from "../../src/domain/catalog.js";

const source = "https://raw.githubusercontent.com/salmannaeem112215/pakistan-location-info-system/main/5.final/pakistan.json";
const response = await fetch(source);
if (!response.ok) throw new Error(`Area catalog download failed: ${response.status}`);
const original = await response.text();
const provinces = JSON.parse(original);
const rows = new Map();
for (const place of Object.values(provinces).flat()) {
  const cityName = String(place?.city || "").trim();
  if (!cityName || !Array.isArray(place?.all)) continue;
  const cityId = makeCityId(cityName);
  for (const fullName of [...(place.popular || []), ...place.all]) {
    const name = String(fullName || "").trim().replace(new RegExp(`,\\s*${cityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "").trim();
    if (!name || normalizeEntityName(name) === "others" || name.length > 160) continue;
    const id = makeAreaId(cityId, name);
    if (id.length > 200 || rows.has(id)) continue;
    rows.set(id, { id, data: {
      name,
      normalizedName: normalizeEntityName(name),
      cityId,
      cityName,
      source: "pakistan-location-info-system"
    } });
  }
}
if (rows.size < 5000) throw new Error(`Area catalog unexpectedly small: ${rows.size}`);
const json = JSON.stringify([...rows.values()]).replaceAll("'", "''");
const hash = createHash("sha256").update(original).digest("hex");
const sql = `-- Pakistan city areas from ${source}\n-- Source README states MIT license. Source SHA256: ${hash}\n-- Add catalog rows only; preserve manually added or edited area records.\nINSERT INTO portal_documents (path, collection_path, document_id, payload)\nSELECT 'areas/' || item.id, 'areas', item.id, item.data\nFROM jsonb_to_recordset('${json}'::jsonb) AS item(id text, data jsonb)\nON CONFLICT (path) DO NOTHING;\n`;
const target = fileURLToPath(new URL("../src/db/migrations/002_pakistan_area_catalog.sql", import.meta.url));
await writeFile(target, sql, "utf8");
console.log(`Prepared ${rows.size} area names for ${Object.values(provinces).flat().length} cities`);

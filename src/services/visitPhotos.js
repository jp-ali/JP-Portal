export const formatAddressForStamp = (address = {}, lat, lon) => {
const house = address.house_number ? `House #${address.house_number}` : "";
const streetValue = address.road || address.street || address.pedestrian || address.path || "";
const street = streetValue ? `Street #${streetValue}` : "";
const blockValue = address.block || address.neighbourhood || address.suburb || address.residential || address.quarter || "";
const block = blockValue ? `Block ${blockValue}` : "";
const city = address.city || address.town || address.municipality || address.village || address.city_district || "";
const district = address.state_district || address.county || "";
const province = address.state || "";
const country = address.country || "Pakistan";
const parts = [house, street, block, city, district, province, country].filter(Boolean);
return parts.length ? parts.join(", ") : `GPS: ${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
};

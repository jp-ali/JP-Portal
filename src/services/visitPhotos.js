export const formatAddressForStamp = (address = {}) => {
const house = address.house_number ? `House #${address.house_number}` : "";
const streetValue = address.road || address.street || address.pedestrian || address.path || "";
const street = streetValue;
const blockValue = address.block || address.neighbourhood || address.suburb || address.residential || address.quarter || "";
const block = blockValue;
const city = address.city || address.town || address.municipality || address.village || address.city_district || "";
const district = address.state_district || address.county || "";
const province = address.state || "";
const country = address.country || "";
const parts = [...new Set([house, street, block, city, district, province, country].filter(Boolean))];
return parts.join(", ");
};

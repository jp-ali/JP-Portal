export function marketerCityNames(marketer, cities = []) {
  const cityById = new Map(cities.map((city) => [String(city.id), city.name]));
  const assigned = (Array.isArray(marketer?.assignedCityIds) ? marketer.assignedCityIds : [])
    .map((id) => cityById.get(String(id)))
    .filter(Boolean);
  return [...new Set(assigned)].join(", ") || marketer?.cityName || marketer?.city || "N/A";
}

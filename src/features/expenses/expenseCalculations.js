export function calculatedKms(row) {
  if (row?.endReading === null || row?.endReading === undefined || row?.endReading === "") return 0;
  if (row?.startReading === null || row?.startReading === undefined || row?.startReading === "") return 0;
  const start = Number(row.startReading);
  const end = Number(row.endReading);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export function dailyAssignedKms(row, marketer) {
  const value = Number(row?.assignedKms || marketer?.assignedKms || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function dailyPetrolRate(row, petrolRates = {}) {
  const date = String(row?.date || "").trim();
  const savedRate = date && Object.prototype.hasOwnProperty.call(petrolRates, date) ? Number(petrolRates[date]) : null;
  const rowRate = row?.petrolRate === "" || row?.petrolRate == null ? null : Number(row.petrolRate);
  const rate = savedRate !== null ? savedRate : rowRate;
  return rate !== null && Number.isFinite(rate) && rate >= 0 ? rate : null;
}

export function dailyPetrolExpense(row, marketer, petrolRates) {
  const rate = dailyPetrolRate(row, petrolRates);
  const assigned = dailyAssignedKms(row, marketer);
  if (rate === null || !assigned) return 0;
  return (calculatedKms(row) / assigned) * rate;
}

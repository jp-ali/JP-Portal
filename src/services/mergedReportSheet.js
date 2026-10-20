// One layout for the portal's spreadsheet reports: centered report banner,
// clear headings, and merged repeated person/date values in consecutive rows.
export function mergedReportSheet(XLSX, data, title) {
  const keys = Object.keys(data[0] || {});
  const last = Math.max(0, keys.length - 1);
  const sheet = XLSX.utils.aoa_to_sheet([
    [title],
    [`JAVED PUBLISHERS  |  ${data.length} records`],
    keys,
    ...data.map((row) => keys.map((key) => row[key] ?? ""))
  ]);
  const merges = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: last } }));
  keys.forEach((key, column) => {
    if (!/^(?:date|visit date|marketer|marketer name|sale officer|name)$/i.test(key)) return;
    let start = 0;
    while (start < data.length) {
      const value = data[start][key];
      let end = start + 1;
      while (end < data.length && value && value !== "TOTAL" && data[end][key] === value) end++;
      if (end - start > 1) merges.push({ s: { r: start + 3, c: column }, e: { r: end + 2, c: column } });
      start = end;
    }
  });
  sheet["!merges"] = merges;
  sheet["!rows"] = [{ hpt: 32 }, { hpt: 23 }, { hpt: 29 }];
  sheet["!autofilter"] = { ref: `A3:${XLSX.utils.encode_col(last)}${Math.max(3, data.length + 3)}` };
  for (const address of ["A1", "A2"]) if (sheet[address]) sheet[address].s = { alignment: { horizontal: "center", vertical: "center" }, font: { bold: true, color: { rgb: "7A0F2B" } } };
  return sheet;
}

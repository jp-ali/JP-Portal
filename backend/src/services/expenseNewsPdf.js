import PDFDocument from "pdfkit";

const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;
const number = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

export function expenseNewsRows(attendance, marketer, rates) {
  return attendance.map((row) => {
    const start = number(row.startReading);
    const end = number(row.endReading);
    const kms = row.startReading == null || row.startReading === "" || row.endReading == null || row.endReading === "" ? 0 : Math.max(0, end - start);
    const assignedKms = number(row.assignedKms || marketer.assignedKms);
    const savedRate = rates[String(row.date || "")];
    const petrolRate = savedRate == null ? number(row.petrolRate) : number(savedRate);
    const petrol = assignedKms > 0 ? kms / assignedKms * petrolRate : 0;
    const transport = number(row.transportExpense);
    const nightStay = number(row.nightStayExpense);
    const food = number(row.foodExpense);
    const other = number(row.otherExpense);
    return { date: String(row.date || ""), kms, assignedKms, petrolRate, petrol, transport, nightStay, food, other, simpleTotal: transport + nightStay + food + other };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function createExpenseNewsPdf({ marketer, rows, fromDate, toDate }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 34, bufferPages: true, autoFirstPage: false });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    const maroon = "#7A0F2B";
    const pageWidth = 841.89;
    const left = 34;
    const width = pageWidth - 68;
    const rowHeight = 22;
    const drawPageTitle = () => {
      doc.rect(0, 0, pageWidth, 91).fill(maroon);
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text("JAVED PUBLISHERS", left, 20, { width, align: "center" });
      doc.fontSize(12).text("EXPENSE REPORT", left, 49, { width, align: "center" });
      doc.fillColor("#333333").font("Helvetica").fontSize(9).text(`Marketer: ${marketer.name || marketer.email || "Marketer"}`, left, 110);
      doc.text(`Date range: ${fromDate} to ${toDate}`, left, 126);
    };
    let y = 0;
    const startPage = () => {
      doc.addPage();
      drawPageTitle();
      y = 155;
    };
    const drawTable = (section, columns, values, total) => {
      const sectionHeight = 18;
      const bottom = () => doc.page.height - 75;
      const header = () => {
        let x = left;
        columns.forEach(([label, cellWidth]) => {
          doc.rect(x, y, cellWidth, rowHeight).fill(maroon);
          doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text(label, x + 4, y + 7, { width: cellWidth - 8, align: "center" });
          x += cellWidth;
        });
        y += rowHeight;
      };
      const sectionHeader = () => {
        doc.fillColor(maroon).font("Helvetica-Bold").fontSize(10).text(section, left, y, { width });
        y += sectionHeight;
        header();
      };
      const nextSectionY = y > 155 ? y + 16 : y;
      if (!doc.page || nextSectionY + sectionHeight + rowHeight * 3 > bottom()) startPage();
      else y = nextSectionY;
      sectionHeader();
      const drawRow = (cells, strong = false) => {
        if (y + rowHeight > bottom()) { startPage(); sectionHeader(); }
        let x = left;
        cells.forEach((cell, index) => {
          const cellWidth = columns[index][1];
          doc.rect(x, y, cellWidth, rowHeight).fill(strong ? "#FBE6EC" : "#FFFFFF");
          doc.rect(x, y, cellWidth, rowHeight).strokeColor("#DDCCD1").lineWidth(.5).stroke();
          doc.fillColor(strong ? maroon : "#333333").font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(8).text(String(cell), x + 4, y + 7, { width: cellWidth - 8, align: "center", lineBreak: false });
          x += cellWidth;
        });
        y += rowHeight;
      };
      if (!values.length) drawRow(["No expense records in this range", ...columns.slice(1).map(() => "")]);
      values.forEach((cells) => drawRow(cells));
      drawRow(total, true);
    };
    drawTable("Calculated KMs and petrol expense", [
      ["Date", 120], ["KMs", 120], ["Assigned KMs/L", 150], ["Petrol Rate", 150], ["Petrol Expense", width - 540]
    ], rows.map((row) => [row.date, row.kms.toFixed(1), row.assignedKms.toFixed(1), money(row.petrolRate), money(row.petrol)]),
    ["TOTAL", rows.reduce((sum, row) => sum + row.kms, 0).toFixed(1), "", "", money(rows.reduce((sum, row) => sum + row.petrol, 0))]);
    drawTable("Simple expenses", [
      ["Date", 116], ["Transport", 120], ["Night Stay", 120], ["Food", 110], ["Other", 110], ["Total", width - 576]
    ], rows.map((row) => [row.date, money(row.transport), money(row.nightStay), money(row.food), money(row.other), money(row.simpleTotal)]),
    ["TOTAL", money(rows.reduce((sum, row) => sum + row.transport, 0)), money(rows.reduce((sum, row) => sum + row.nightStay, 0)), money(rows.reduce((sum, row) => sum + row.food, 0)), money(rows.reduce((sum, row) => sum + row.other, 0)), money(rows.reduce((sum, row) => sum + row.simpleTotal, 0))]);
    const pages = doc.bufferedPageRange().count;
    for (let index = 0; index < pages; index++) {
      doc.switchToPage(index);
      doc.rect(left, doc.page.height - 56, width, 22).fill(maroon);
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8).text("Developed by Ali Ashfaq", left, doc.page.height - 49, { width, align: "center" });
    }
    doc.end();
  });
}

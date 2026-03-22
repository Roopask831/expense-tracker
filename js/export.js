// js/export.js
// Downloads the user's transactions as a formatted .xlsx file
// Uses SheetJS (loaded via CDN in dashboard.html)

export function exportToExcel(transactions, userEmail) {
  if (!transactions.length) {
    alert("No transactions to export!");
    return;
  }

  // ── 1. Shape the data into rows ───────────────────────────
  const rows = transactions.map(tx => ({
    Date:        tx.date,
    Description: tx.desc,
    Category:    tx.category,
    Type:        tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
    Amount:      tx.type === "income" ? tx.amount : -tx.amount
  }));

  // ── 2. Add a totals summary row at the bottom ─────────────
  const totalIncome  = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  rows.push({});   // blank separator row
  rows.push({ Date: "TOTAL INCOME",  Amount: totalIncome  });
  rows.push({ Date: "TOTAL EXPENSE", Amount: -totalExpense });
  rows.push({ Date: "NET BALANCE",   Amount: totalIncome - totalExpense });

  // ── 3. Create worksheet & workbook ────────────────────────
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 12 },   // Date
    { wch: 28 },   // Description
    { wch: 18 },   // Category
    { wch: 10 },   // Type
    { wch: 12 },   // Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  // ── 4. Trigger download ───────────────────────────────────
  const filename = `expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

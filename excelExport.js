import * as XLSX from 'xlsx';

// Export one or more sheets to an .xlsx file.
// sheets: [{ name: string, rows: (string|number)[][] }]
export function exportToExcel(sheets, filename) {
  if (!sheets || !sheets.length) return;
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
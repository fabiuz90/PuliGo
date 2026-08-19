import * as XLSX from 'xlsx';

const AUTO_FIT_MIN_WIDTH = 12;
const AUTO_FIT_MAX_WIDTH = 42;

function applyAutoFit(ws, rows) {
  const columnCount = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const contentWidth = rows.reduce((maximum, row) => {
      const value = row[columnIndex];
      const text = value == null ? '' : String(value);
      return Math.max(maximum, Array.from(text).length);
    }, 0);

    return { wch: Math.min(AUTO_FIT_MAX_WIDTH, Math.max(AUTO_FIT_MIN_WIDTH, contentWidth + 2)) };
  });

  ws['!cols'] = widths;

  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (typeof value !== 'string' || value.length <= AUTO_FIT_MAX_WIDTH) return;
      const cell = ws[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (!cell) return;
      cell.s = {
        ...cell.s,
        alignment: {
          ...cell.s?.alignment,
          wrapText: true,
          vertical: cell.s?.alignment?.vertical || 'top',
        },
      };
    });
  });
}

// Export one or more sheets to an .xlsx file.
// sheets: [{ name: string, rows: (string|number)[][] }]
export function exportToExcel(sheets, filename) {
  if (!sheets || !sheets.length) return;
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows, options }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);

    if (options?.employeeDaily) {
      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'D9E2E3' } },
        bottom: { style: 'thin', color: { rgb: 'D9E2E3' } },
        left: { style: 'thin', color: { rgb: 'D9E2E3' } },
        right: { style: 'thin', color: { rgb: 'D9E2E3' } },
      };
      ws['!rows'] = rows.map((row, rowIndex) => ({
        hpt: rowIndex === 0 ? 24 : row[0] === 'TOTALE DIPENDENTE' || row[0] === 'Data' ? 20 : 18,
      }));
      ws['!freeze'] = { xSplit: 0, ySplit: 5 };
      ws['!pageSetup'] = { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0 };

      rows.forEach((row, rowIndex) => {
        row.forEach((value, columnIndex) => {
          const cell = ws[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
          if (!cell) return;
          if (rowIndex >= 3 && columnIndex >= 2 && typeof value === 'number') cell.z = '0.00';
          const isHeader = rowIndex > 2 && row[0] === 'Data';
          const isEmployee = columnIndex === 0 && typeof value === 'string' && value.startsWith('DIPENDENTE:');
          const isTotal = row[0] === 'TOTALE DIPENDENTE';
          const isSummary = ['Giorni lavorati', 'Ore lavorate', 'Giorni ferie', 'Ore ferie', 'Ore permesso', 'Giorni malattia', 'Ore malattia'].includes(row[0]);
          const isSummaryHours = ['Ore lavorate', 'Ore ferie', 'Ore permesso', 'Ore malattia'].includes(row[0]);
          if ((rowIndex >= 5 && columnIndex >= 2 && typeof value === 'number') || (isSummaryHours && columnIndex === 1)) cell.z = '0.00';
          cell.s = {
            font: { bold: rowIndex === 0 || rowIndex === 1 || isHeader || isEmployee || isTotal || isSummary },
            fill: {
              patternType: 'solid',
              fgColor: {
                rgb: rowIndex === 0 ? '163F3D' : isHeader ? 'E8F1F0' : isTotal ? 'DDF1E8' : isEmployee ? 'F2F7F6' : isSummary ? 'F5FAF7' : 'FFFFFF',
              },
            },
            alignment: {
              horizontal: columnIndex === 0 || columnIndex === 1 ? 'left' : 'right',
              vertical: 'center',
            },
            border: thinBorder,
          };
          if (rowIndex === 0) cell.s.font.color = { rgb: 'FFFFFF' };
        });
      });
    }

    applyAutoFit(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
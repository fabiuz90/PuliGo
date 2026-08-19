import * as XLSX from 'xlsx';

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
      const minimumWidths = [16, 12, 16, 12, 14, 14];
      ws['!cols'] = minimumWidths.map((minimumWidth, columnIndex) => {
        const contentWidth = rows.slice(3).reduce((maximum, row) => {
          const value = row[columnIndex];
          const text = value == null ? '' : String(value);
          return Math.max(maximum, Array.from(text).length);
        }, 0);

        return { wch: Math.max(minimumWidth, contentWidth + 2) };
      });
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

    XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}
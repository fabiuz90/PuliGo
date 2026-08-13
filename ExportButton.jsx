import { FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '@/lib/excelExport';

export default function ExportButton({ sheets, filename, label = 'Esporta Excel' }) {
  const disabled = !sheets || sheets.length === 0;
  return (
    <button
      onClick={() => exportToExcel(sheets, filename)}
      disabled={disabled}
      className="flex gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-50"
    >
      <FileSpreadsheet size={18} />{label}
    </button>
  );
}
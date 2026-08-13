import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/common';
import { appaltoColor } from '@/lib/appaltoColors';

export default function ShiftList({ shifts, contracts, employees, onEdit, onDelete, appaltoColors }) {
  if (!shifts.length) return <EmptyState text="Nessun turno pianificato" />;
  return (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr><th className="p-4">Data</th><th>Orario</th><th>Appalto</th><th>Dipendente</th><th></th></tr>
        </thead>
        <tbody>
          {shifts.map(s => {
            const c = contracts.find(x => x.id === s.contract_id);
            const e = employees.find(x => x.id === s.employee_id);
            const color = appaltoColor(appaltoColors?.get(s.contract_id));
            return (
              <tr key={s.id} className="border-t">
                <td className="p-4 font-medium capitalize">{format(parseISO(s.date), 'EEE d MMM', { locale: it })}</td>
                <td>{s.start_time}–{s.end_time}</td>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {c?.site_name}
                  </span>
                </td>
                <td>{e?.last_name} {e?.first_name}</td>
                <td>
                  <div className="flex gap-2 justify-end pr-4">
                    <button onClick={() => onEdit(s)} className="p-2 hover:bg-slate-100 rounded-lg"><Pencil size={16} /></button>
                    <button onClick={() => onDelete(s)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
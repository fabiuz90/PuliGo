import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Pencil, Trash2, MapPin } from 'lucide-react';

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function ShiftsByEmployee({ shifts, contracts, employees, onEdit, onDelete }) {
  // Group shifts by employee
  const byEmployee = new Map();
  for (const s of shifts) {
    if (!byEmployee.has(s.employee_id)) byEmployee.set(s.employee_id, []);
    byEmployee.get(s.employee_id).push(s);
  }

  // Build employee rows sorted by last name
  const rows = [...byEmployee.entries()]
    .map(([id, empShifts]) => {
      const emp = employees.find((e) => e.id === id);
      const lastName = (emp?.last_name || '').toLowerCase();
      const firstName = (emp?.first_name || '').toLowerCase();
      // Sort shifts chronologically: by date, then start time
      const sorted = [...empShifts].sort((a, b) =>
        a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date)
      );
      return { emp, sorted, lastName, firstName };
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'it') || a.firstName.localeCompare(b.firstName, 'it'));

  if (!rows.length) {
    return <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">Nessun turno assegnato nella settimana selezionata.</div>;
  }

  return (
    <div className="space-y-5">
      {rows.map(({ emp, sorted }) => {
        const fullName = emp ? `${emp.last_name} ${emp.first_name}` : 'Dipendente sconosciuto';
        const totalHours = sorted.reduce((acc, s) => {
          const [sh, sm] = s.start_time.split(':').map(Number);
          const [eh, em] = s.end_time.split(':').map(Number);
          return acc + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }, 0);

        // Group shifts by date
        const byDate = new Map();
        for (const s of sorted) {
          if (!byDate.has(s.date)) byDate.set(s.date, []);
          byDate.get(s.date).push(s);
        }
        const dayGroups = [...byDate.entries()];

        return (
          <section key={emp?.id || 'unknown'} className="bg-white border rounded-2xl overflow-hidden">
            {/* Employee header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b">
              <h3 className="text-lg font-semibold text-slate-900">{fullName}</h3>
              <span className="text-sm text-slate-500">{sorted.length} turni · {totalHours.toFixed(1)} h</span>
            </div>

            {/* Day groups */}
            <div className="divide-y">
              {dayGroups.map(([date, dayShifts]) => {
                const d = parseISO(date);
                const dayLabel = DAY_NAMES[d.getDay()];
                return (
                  <div key={date} className="px-5 py-4">
                    <p className="text-sm font-semibold text-slate-500 mb-2">
                      {dayLabel} <span className="text-slate-400">{format(d, 'dd/MM', { locale: it })}</span>
                    </p>
                    <div className="space-y-2">
                      {dayShifts.map((s) => {
                        const c = contracts.find((x) => x.id === s.contract_id);
                        return (
                          <div key={s.id} className="group flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:border-slate-200">
                            <div className="flex flex-col items-center justify-center min-w-[64px] bg-emerald-50 text-emerald-800 rounded-lg px-2 py-1.5">
                              <span className="text-sm font-bold leading-tight">{s.start_time}</span>
                              <span className="text-[10px] leading-tight">→</span>
                              <span className="text-sm font-bold leading-tight">{s.end_time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 truncate">{c?.site_name || 'Appalto sconosciuto'}</p>
                              {c?.address && (
                                <p className="flex items-start gap-1.5 text-xs text-slate-500 mt-0.5">
                                  <MapPin size={12} className="mt-0.5 shrink-0" />
                                  <span className="truncate">{c.address}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => onEdit(s)} className="w-11 h-11 grid place-items-center rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Modifica turno">
                                <Pencil size={18} />
                              </button>
                              <button onClick={() => onDelete(s)} className="w-11 h-11 grid place-items-center rounded-lg hover:bg-red-50 text-red-600" aria-label="Elimina turno">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
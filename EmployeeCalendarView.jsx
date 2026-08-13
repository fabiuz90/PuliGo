import { useMemo, useState } from 'react';
import WeekCalendar from '@/components/WeekCalendar';
import { inputClass } from '@/components/common';
import MobileSelect from '@/components/MobileSelect';

export default function EmployeeCalendarView({ shifts, contracts, employees, week, onEdit, onDelete, appaltoColors }) {
  const sorted = useMemo(
    () =>
      [...employees]
        .filter((e) => e.status === 'active')
        .sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'it') || (a.first_name || '').localeCompare(b.first_name || '', 'it')),
    [employees]
  );
  const [selectedId, setSelectedId] = useState(sorted[0]?.id || '');
  const empShifts = shifts.filter((s) => s.employee_id === selectedId);
  const selected = employees.find((e) => e.id === selectedId);

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label className="text-sm font-medium text-slate-600">Dipendente</label>
        <MobileSelect value={selectedId} onChange={(v) => setSelectedId(v)} options={sorted.map((e) => ({ value: e.id, label: `${e.last_name} ${e.first_name}` }))} placeholder="Seleziona dipendente" className={`${inputClass} max-w-xs`} />
        {selected && (
          <span className="text-sm text-slate-500">
            {empShifts.length} turn{empShifts.length === 1 ? 'o' : 'i'} nella settimana
          </span>
        )}
      </div>
      {selectedId ? (
        <WeekCalendar
          shifts={empShifts}
          contracts={contracts}
          employees={employees}
          week={week}
          onEdit={onEdit}
          onDelete={onDelete}
          appaltoColors={appaltoColors}
        />
      ) : (
        <div className="bg-white border rounded-2xl p-10 text-center text-slate-400">Nessun dipendente attivo.</div>
      )}
    </div>
  );
}
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { inputClass } from '@/common';
import { findConflict } from '@/shiftConflict';
import { getShiftAbsenceConflict } from '@/absenceConflict';

const sameTime = (left, right) => String(left || '').slice(0, 5) === String(right || '').slice(0, 5);

export default function ShiftForm({ initial, preset, contracts, employees, shifts, absences = [], onSubmit, saving }) {
  const initialAssignments = useMemo(() => initial
    ? shifts.filter((shift) => shift.contract_id === initial.contract_id && shift.date === initial.date && sameTime(shift.start_time, initial.start_time) && sameTime(shift.end_time, initial.end_time))
    : [], [initial, shifts]);
  const [form, setForm] = useState(initial || { employee_ids: [], contract_id: preset.contract_id || '', date: preset.date || '', start_time: preset.start_time || '08:00', end_time: preset.end_time || '10:00' });
  const selectedEmployeeIds = form.employee_ids || (initial ? initialAssignments.map((shift) => shift.employee_id) : form.employee_id ? [form.employee_id] : []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const eligible = employees.filter((e) => e.status === 'active');
  const contract = contracts.find((item) => item.id === form.contract_id);
  const requiredCount = contract?.service_requirements?.find((requirement) => {
    const weekday = form.date ? new Date(`${form.date}T00:00:00`).getDay() : null;
    return Number(requirement.day_of_week) === weekday && sameTime(requirement.start_time, form.start_time) && sameTime(requirement.end_time, form.end_time);
  })?.employees_required || 1;
  const currentAssignmentIds = new Set(initialAssignments.map((shift) => shift.employee_id));

  // Conflict for the currently selected assignment (excludes the shift being edited).
  const conflict = selectedEmployeeIds
    .map((employeeId) => findConflict(shifts, { employeeId, date: form.date, startTime: form.start_time, endTime: form.end_time, excludeId: currentAssignmentIds.has(employeeId) ? initialAssignments.find((shift) => shift.employee_id === employeeId)?.id : initial?.id }))
    .filter(Boolean)[0] || null;
  const conflictContract = conflict ? contracts.find((c) => c.id === conflict.contract_id) : null;
  const blocked = Boolean(conflict);
  const absenceConflict = selectedEmployeeIds[0] && form.date && form.start_time && form.end_time
    ? getShiftAbsenceConflict({ employee_id: selectedEmployeeIds[0], date: form.date, start_time: form.start_time, end_time: form.end_time }, absences)
    : null;

  // Per-employee availability for the selected date/time (to flag occupied employees in the dropdown).
  const occupiedIds = new Set();
  if (form.date && form.start_time && form.end_time) {
    eligible.forEach((e) => {
      if (findConflict(shifts, { employeeId: e.id, date: form.date, startTime: form.start_time, endTime: form.end_time, excludeId: currentAssignmentIds.has(e.id) ? initialAssignments.find((shift) => shift.employee_id === e.id)?.id : initial?.id }))
        occupiedIds.add(e.id);
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (blocked || selectedEmployeeIds.length > requiredCount) return; onSubmit({ ...form, employee_ids: selectedEmployeeIds, existing_shift_ids: initialAssignments.map((shift) => shift.id) }); }} className="p-6 space-y-4">
      <label className="text-sm font-medium block">Appalto
        <MobileSelect required className={`${inputClass} mt-1.5`} value={form.contract_id} onChange={(v) => set('contract_id', v)} placeholder="Seleziona appalto" options={contracts.filter((c) => c.status === 'active').map((c) => ({ value: c.id, label: `${c.site_name} · ${c.client_name}` }))} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">Dipendenti assegnati ({selectedEmployeeIds.length}/{requiredCount})</legend>
        <div className="mt-1.5 space-y-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3">
          {eligible.map((employee) => (
            <label key={employee.id} className="flex items-center gap-2 text-sm font-normal">
              <input type="checkbox" checked={selectedEmployeeIds.includes(employee.id)} onChange={(event) => set('employee_ids', event.target.checked ? [...selectedEmployeeIds, employee.id] : selectedEmployeeIds.filter((id) => id !== employee.id))} />
              <span>{employee.last_name} {employee.first_name}{occupiedIds.has(employee.id) && !currentAssignmentIds.has(employee.id) ? ' — ⚠ occupato' : ''}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-3 gap-4">
        <label className="text-sm font-medium">Data<input required type="date" className={`${inputClass} mt-1.5`} value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
        <label className="text-sm font-medium">Inizio<input required type="time" className={`${inputClass} mt-1.5`} value={form.start_time} onChange={(e) => set('start_time', e.target.value)} /></label>
        <label className="text-sm font-medium">Fine<input required type="time" className={`${inputClass} mt-1.5`} value={form.end_time} onChange={(e) => set('end_time', e.target.value)} /></label>
      </div>

      {blocked && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Attenzione: il dipendente selezionato è già occupato su un altro appalto, verifica bene!</p>
            <p className="mt-1 text-red-600">{conflictContract?.site_name || 'Appalto'} · {conflict.date} {conflict.start_time}–{conflict.end_time}</p>
          </div>
        </div>
      )}

      {absenceConflict && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Attenzione: il dipendente risulta assente durante questo turno.</p>
            {absenceConflict.type === 'permesso' && <p className="mt-1 text-amber-700">Permesso: {absenceConflict.start_time?.slice(0, 5)}–{absenceConflict.end_time?.slice(0, 5)}. Puoi comunque procedere con il salvataggio.</p>}
            {absenceConflict.type !== 'permesso' && <p className="mt-1 text-amber-700">{absenceConflict.type === 'ferie' ? 'Ferie' : 'Malattia'} per l’intera giornata. Puoi comunque procedere con il salvataggio.</p>}
          </div>
        </div>
      )}

      <button disabled={saving || blocked || selectedEmployeeIds.length > requiredCount} className="w-full rounded-xl bg-[#163f3d] text-white py-3 font-semibold disabled:opacity-50">
        {saving ? 'Salvataggio…' : blocked ? 'Turno in conflitto' : selectedEmployeeIds.length > requiredCount ? 'Troppi dipendenti selezionati' : 'Salva turno'}
      </button>
    </form>
  );
}
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { inputClass } from '@/common';
import MobileSelect from '@/MobileSelect';
import { findConflict } from '@/shiftConflict';
import { getShiftAbsenceConflict } from '@/absenceConflict';

export default function ShiftForm({ initial, preset, contracts, employees, shifts, absences = [], onSubmit, saving }) {
  const [form, setForm] = useState(initial || { employee_id: '', contract_id: preset.contract_id || '', date: preset.date || '', start_time: preset.start_time || '08:00', end_time: preset.end_time || '10:00' });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const eligible = employees.filter((e) => e.status === 'active');

  // Conflict for the currently selected assignment (excludes the shift being edited).
  const conflict =
    form.employee_id && form.date && form.start_time && form.end_time
      ? findConflict(shifts, { employeeId: form.employee_id, date: form.date, startTime: form.start_time, endTime: form.end_time, excludeId: initial?.id })
      : null;
  const conflictContract = conflict ? contracts.find((c) => c.id === conflict.contract_id) : null;
  const blocked = Boolean(conflict);
  const absenceConflict = form.employee_id && form.date && form.start_time && form.end_time
    ? getShiftAbsenceConflict({ employee_id: form.employee_id, date: form.date, start_time: form.start_time, end_time: form.end_time }, absences)
    : null;

  // Per-employee availability for the selected date/time (to flag occupied employees in the dropdown).
  const occupiedIds = new Set();
  if (form.date && form.start_time && form.end_time) {
    eligible.forEach((e) => {
      if (findConflict(shifts, { employeeId: e.id, date: form.date, startTime: form.start_time, endTime: form.end_time, excludeId: initial?.id }))
        occupiedIds.add(e.id);
    });
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (blocked) return; onSubmit(form); }} className="p-6 space-y-4">
      <label className="text-sm font-medium block">Appalto
        <MobileSelect required className={`${inputClass} mt-1.5`} value={form.contract_id} onChange={(v) => set('contract_id', v)} placeholder="Seleziona appalto" options={contracts.filter((c) => c.status === 'active').map((c) => ({ value: c.id, label: `${c.site_name} · ${c.client_name}` }))} />
      </label>
      <label className="text-sm font-medium block">Dipendente
        <MobileSelect required className={`${inputClass} mt-1.5`} value={form.employee_id} onChange={(v) => set('employee_id', v)} placeholder="Seleziona dipendente" options={eligible.map((e) => ({ value: e.id, label: `${e.last_name} ${e.first_name}${occupiedIds.has(e.id) ? ' — ⚠ occupato' : ''}` }))} />
      </label>
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

      <button disabled={saving || blocked} className="w-full rounded-xl bg-[#163f3d] text-white py-3 font-semibold disabled:opacity-50">
        {saving ? 'Salvataggio…' : blocked ? 'Turno in conflitto' : 'Salva turno'}
      </button>
    </form>
  );
}
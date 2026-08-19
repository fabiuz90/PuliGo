import { useEffect, useState } from 'react';
import { inputClass } from '@/common';
import MobileSelect from '@/MobileSelect';

const absenceTypes = [
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso', label: 'Permesso' },
  { value: 'malattia', label: 'Malattia' },
];

const emptyForm = {
  employee_id: '',
  type: 'ferie',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  notes: '',
};

function getInitialForm(initial) {
  return initial
    ? {
        employee_id: initial.employee_id || '',
        type: initial.type || 'ferie',
        start_date: initial.start_date || '',
        end_date: initial.end_date || initial.start_date || '',
        start_time: initial.start_time?.slice(0, 5) || '',
        end_time: initial.end_time?.slice(0, 5) || '',
        notes: initial.notes || '',
      }
    : emptyForm;
}

function getDurationHours(startTime, endTime) {
  if (!startTime || !endTime || endTime <= startTime) return null;

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  return ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
}

export default function AbsenceForm({ initial, employees, onSubmit, saving }) {
  const [form, setForm] = useState(() => getInitialForm(initial));
  const [error, setError] = useState('');
  const isPermission = form.type === 'permesso';
  const durationHours = getDurationHours(form.start_time, form.end_time);

  useEffect(() => {
    setForm(getInitialForm(initial));
    setError('');
  }, [initial]);

  const set = (field, value) => {
    setError('');
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'type' && value === 'permesso') next.end_date = next.start_date;
      if (field === 'start_date' && current.type === 'permesso') next.end_date = value;
      return next;
    });
  };

  const submit = (event) => {
    event.preventDefault();

    if (!form.employee_id) return setError('Seleziona un dipendente.');
    if (!form.type) return setError('Seleziona il tipo di assenza.');
    if (!form.start_date) return setError('Inserisci la data di inizio.');
    if (!isPermission && !form.end_date) return setError('Inserisci la data di fine.');
    if (!isPermission && form.end_date < form.start_date) {
      return setError('La data di fine non può precedere la data di inizio.');
    }
    if (isPermission && !form.start_time) return setError('Inserisci l’ora di inizio del permesso.');
    if (isPermission && !form.end_time) return setError('Inserisci l’ora di fine del permesso.');
    if (isPermission && form.end_time <= form.start_time) {
      return setError('L’ora di fine deve essere successiva all’ora di inizio.');
    }

    onSubmit({
      employee_id: form.employee_id,
      type: form.type,
      start_date: form.start_date,
      end_date: isPermission ? form.start_date : form.end_date,
      start_time: isPermission ? form.start_time : null,
      end_time: isPermission ? form.end_time : null,
      duration_hours: isPermission ? durationHours : null,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      <label className="text-sm font-medium block">
        Dipendente
        <MobileSelect
          required
          className={`${inputClass} mt-1.5`}
          value={form.employee_id}
          onChange={(value) => set('employee_id', value)}
          placeholder="Seleziona dipendente"
          options={employees.map((employee) => ({
            value: employee.id,
            label: `${employee.last_name} ${employee.first_name}`,
          }))}
        />
      </label>

      <label className="text-sm font-medium block">
        Tipo di assenza
        <MobileSelect
          required
          className={`${inputClass} mt-1.5`}
          value={form.type}
          onChange={(value) => set('type', value)}
          options={absenceTypes}
        />
      </label>

      <div className={isPermission ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        <label className="text-sm font-medium block">
          {isPermission ? 'Data' : 'Data inizio'}
          <input required type="date" className={`${inputClass} mt-1.5`} value={form.start_date} onChange={(event) => set('start_date', event.target.value)} />
        </label>
        {!isPermission && (
          <label className="text-sm font-medium block">
            Data fine
            <input required type="date" className={`${inputClass} mt-1.5`} value={form.end_date} onChange={(event) => set('end_date', event.target.value)} />
          </label>
        )}
      </div>

      {isPermission && (
        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm font-medium">
            Ora inizio
            <input required type="time" className={`${inputClass} mt-1.5`} value={form.start_time} onChange={(event) => set('start_time', event.target.value)} />
          </label>
          <label className="text-sm font-medium">
            Ora fine
            <input required type="time" className={`${inputClass} mt-1.5`} value={form.end_time} onChange={(event) => set('end_time', event.target.value)} />
          </label>
          <p className="col-span-2 text-xs text-slate-500">
            Durata: {durationHours == null ? '—' : `${durationHours.toLocaleString('it-IT', { maximumFractionDigits: 2 })} ore`}
          </p>
        </div>
      )}

      <label className="text-sm font-medium block">
        Note
        <textarea className={`${inputClass} mt-1.5 min-h-24 resize-y`} value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Aggiungi una nota (facoltativo)" />
      </label>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={saving} className="w-full rounded-xl bg-[#163f3d] text-white py-3 font-semibold disabled:opacity-50">
        {saving ? 'Salvataggio…' : 'Salva assenza'}
      </button>
    </form>
  );
}
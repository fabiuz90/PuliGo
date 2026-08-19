import { useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';

import db from '@/db';
import useOperationsData from '@/useOperationsData';
import AbsenceForm from '@/AbsenceForm';
import MobileSelect from '@/MobileSelect';
import useDrawerParam from '@/useDrawerParam';
import { EmptyState, Loading, Modal, PageHeader, inputClass } from '@/common';
import { useToast } from '@/use-toast';
import { getFutureAffectedShifts } from '@/absenceConflict';

const typeLabels = {
  ferie: 'Ferie',
  permesso: 'Permesso',
  malattia: 'Malattia',
};

const typeOptions = [
  { value: 'all', label: 'Tutti i tipi' },
  { value: 'ferie', label: 'Ferie' },
  { value: 'permesso', label: 'Permessi' },
  { value: 'malattia', label: 'Malattia' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('it-IT').format(new Date(`${value}T00:00:00`));
}

function dateDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function overlapDays(absence, year) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const start = absence.start_date > yearStart ? absence.start_date : yearStart;
  const end = absence.end_date < yearEnd ? absence.end_date : yearEnd;
  return start <= end ? dateDays(start, end) : 0;
}

function employeeLabel(employee) {
  return employee ? `${employee.last_name} ${employee.first_name}` : 'Dipendente sconosciuto';
}

export default function Assenze() {
  const { absences, employees, contracts, shifts, loading, reload } = useOperationsData();
  const absenceDrawer = useDrawerParam('absence');
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [affectedShifts, setAffectedShifts] = useState([]);

  const editing = absenceDrawer.value && absenceDrawer.value !== 'new'
    ? absences.find((absence) => absence.id === absenceDrawer.value) || null
    : null;

  const yearOptions = useMemo(() => {
    const years = new Set([currentYear]);
    absences.forEach((absence) => {
      if (absence.start_date) years.add(Number(absence.start_date.slice(0, 4)));
      if (absence.end_date) years.add(Number(absence.end_date.slice(0, 4)));
    });
    return [...years].sort((a, b) => b - a);
  }, [absences, currentYear]);

  const filtered = useMemo(() => absences
    .filter((absence) => {
      const overlapsYear = absence.start_date?.slice(0, 4) <= String(year)
        && absence.end_date?.slice(0, 4) >= String(year);
      const overlapsPeriod = (!periodStart || absence.end_date >= periodStart)
        && (!periodEnd || absence.start_date <= periodEnd);
      return overlapsYear
        && overlapsPeriod
        && (employeeFilter === 'all' || absence.employee_id === employeeFilter)
        && (typeFilter === 'all' || absence.type === typeFilter);
    })
    .sort((a, b) => `${a.start_date}${a.start_time || ''}`.localeCompare(`${b.start_date}${b.start_time || ''}`)),
  [absences, employeeFilter, periodEnd, periodStart, typeFilter, year]);

  const summary = useMemo(() => {
    const byEmployee = new Map();
    filtered.forEach((absence) => {
      const current = byEmployee.get(absence.employee_id) || {
        ferie: 0,
        malattia: 0,
        permesso: 0,
      };
      if (absence.type === 'permesso') current.permesso += Number(absence.duration_hours) || 0;
      if (absence.type === 'ferie') current.ferie += overlapDays(absence, year);
      if (absence.type === 'malattia') current.malattia += overlapDays(absence, year);
      byEmployee.set(absence.employee_id, current);
    });
    return [...byEmployee.entries()]
      .map(([employeeId, totals]) => ({ employee: employees.find((item) => item.id === employeeId), totals }))
      .sort((a, b) => employeeLabel(a.employee).localeCompare(employeeLabel(b.employee), 'it'));
  }, [employees, filtered, year]);

  const save = async (form) => {
    setSaving(true);
    try {
      const saved = editing
        ? await db.entities.Absence.update(editing.id, form)
        : await db.entities.Absence.create(form);
      const futureAffected = getFutureAffectedShifts(saved.employee_id, saved, shifts);
      await reload();
      absenceDrawer.close();
      if (futureAffected.length) setAffectedShifts(futureAffected);
      else toast({ title: editing ? 'Assenza aggiornata' : 'Assenza inserita', description: 'L’operazione è stata completata.' });
    } catch (error) {
      toast({ title: 'Operazione non riuscita', description: error.message || 'Controlla i dati e riprova.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (absence) => {
    if (!window.confirm(`Eliminare l’assenza di ${employeeLabel(employees.find((item) => item.id === absence.employee_id))}?`)) return;
    try {
      await db.entities.Absence.delete(absence.id);
      await reload();
      toast({ title: 'Assenza eliminata', description: 'L’assenza è stata rimossa.' });
    } catch (error) {
      toast({ title: 'Eliminazione non riuscita', description: error.message || 'Riprova.' });
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Gestione operativa"
        title="Assenze"
        description="Ferie, permessi e malattie del personale."
        action={<button onClick={() => absenceDrawer.open('new')} className="flex items-center justify-center gap-2 bg-[#163f3d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm"><Plus size={18} />Nuova assenza</button>}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <label className="text-xs font-semibold text-slate-500">Anno
          <MobileSelect className={`${inputClass} mt-1.5`} value={String(year)} onChange={(value) => setYear(Number(value))} options={yearOptions.map((value) => ({ value: String(value), label: String(value) }))} />
        </label>
        <label className="text-xs font-semibold text-slate-500">Dipendente
          <MobileSelect className={`${inputClass} mt-1.5`} value={employeeFilter} onChange={setEmployeeFilter} options={[{ value: 'all', label: 'Tutti i dipendenti' }, ...employees.map((employee) => ({ value: employee.id, label: employeeLabel(employee) }))]} />
        </label>
        <label className="text-xs font-semibold text-slate-500">Tipo
          <MobileSelect className={`${inputClass} mt-1.5`} value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-500">Da<input type="date" className={`${inputClass} mt-1.5`} value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
          <label className="text-xs font-semibold text-slate-500">A<input type="date" className={`${inputClass} mt-1.5`} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div><h2 className="text-xl font-semibold">Riepilogo {year}</h2><p className="text-sm text-slate-500">Totali sulle assenze filtrate.</p></div>
        </div>
        {summary.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {summary.map(({ employee, totals }) => <article key={employee?.id || 'unknown'} className="bg-white border rounded-2xl p-4"><h3 className="font-semibold truncate">{employeeLabel(employee)}</h3><div className="grid grid-cols-3 gap-2 mt-3 text-sm"><div><p className="text-xs text-slate-400">Ferie</p><p className="font-semibold">{totals.ferie} gg</p></div><div><p className="text-xs text-slate-400">Malattia</p><p className="font-semibold">{totals.malattia} gg</p></div><div><p className="text-xs text-slate-400">Permessi</p><p className="font-semibold">{totals.permesso.toLocaleString('it-IT', { maximumFractionDigits: 2 })} h</p></div></div></article>)}
          </div>
        ) : <EmptyState text="Nessun riepilogo per i filtri selezionati" />}
      </section>

      <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">Elenco assenze</h2><span className="text-sm text-slate-400">{filtered.length} {filtered.length === 1 ? 'assenza' : 'assenze'}</span></div>

      <div className="hidden lg:block bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Dipendente</th><th>Tipo</th><th>Periodo</th><th>Orario</th><th>Durata</th><th>Note</th><th /></tr></thead>
          <tbody>{filtered.map((absence) => <tr key={absence.id} className="border-t"><td className="p-4 font-medium">{employeeLabel(employees.find((employee) => employee.id === absence.employee_id))}</td><td><span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">{typeLabels[absence.type]}</span></td><td>{formatDate(absence.start_date)}{absence.type !== 'permesso' && ` – ${formatDate(absence.end_date)}`}</td><td>{absence.type === 'permesso' ? `${absence.start_time?.slice(0, 5)}–${absence.end_time?.slice(0, 5)}` : '—'}</td><td>{absence.type === 'permesso' ? `${Number(absence.duration_hours || 0).toLocaleString('it-IT', { maximumFractionDigits: 2 })} h` : `${overlapDays(absence, year)} gg`}</td><td className="max-w-56 truncate text-slate-500">{absence.notes || '—'}</td><td><div className="flex justify-end gap-1 pr-3"><button onClick={() => absenceDrawer.open(absence.id)} className="w-10 h-10 grid place-items-center rounded-lg hover:bg-slate-100" aria-label="Modifica assenza"><Pencil size={17} /></button><button onClick={() => remove(absence)} className="w-10 h-10 grid place-items-center rounded-lg hover:bg-red-50 text-red-600" aria-label="Elimina assenza"><Trash2 size={17} /></button></div></td></tr>)}</tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">{filtered.map((absence) => <article key={absence.id} className="bg-white border rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold truncate">{employeeLabel(employees.find((employee) => employee.id === absence.employee_id))}</h3><span className="inline-flex mt-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">{typeLabels[absence.type]}</span></div><CalendarDays size={19} className="text-slate-400 shrink-0" /></div><dl className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 text-sm"><div><dt className="text-xs text-slate-400">Periodo</dt><dd>{formatDate(absence.start_date)}{absence.type !== 'permesso' && ` – ${formatDate(absence.end_date)}`}</dd></div><div><dt className="text-xs text-slate-400">Durata</dt><dd>{absence.type === 'permesso' ? `${Number(absence.duration_hours || 0).toLocaleString('it-IT', { maximumFractionDigits: 2 })} h` : `${overlapDays(absence, year)} gg`}</dd></div>{absence.type === 'permesso' && <div><dt className="text-xs text-slate-400">Orario</dt><dd>{absence.start_time?.slice(0, 5)}–{absence.end_time?.slice(0, 5)}</dd></div>}<div className="col-span-2"><dt className="text-xs text-slate-400">Note</dt><dd className="text-slate-600">{absence.notes || '—'}</dd></div></dl><div className="flex justify-end gap-2 mt-4 pt-3 border-t"><button onClick={() => absenceDrawer.open(absence.id)} className="w-11 h-11 grid place-items-center rounded-lg hover:bg-slate-100" aria-label="Modifica assenza"><Pencil size={18} /></button><button onClick={() => remove(absence)} className="w-11 h-11 grid place-items-center rounded-lg hover:bg-red-50 text-red-600" aria-label="Elimina assenza"><Trash2 size={18} /></button></div></article>)} </div>
      {!filtered.length && <EmptyState text="Nessuna assenza corrisponde ai filtri" />}

      {absenceDrawer.isOpen && <Modal title={editing ? 'Modifica assenza' : 'Nuova assenza'} onClose={absenceDrawer.close}><AbsenceForm initial={editing} employees={employees} onSubmit={save} saving={saving} /></Modal>}

      {affectedShifts.length > 0 && <Modal title="⚠️ Attenzione" onClose={() => setAffectedShifts([])}>
        <div className="p-6">
          <p className="text-slate-700">L’assenza inserita rende scoperti <b>{affectedShifts.length} turni futuri</b>.</p>
          <p className="text-sm font-semibold text-red-700 mt-4 mb-2">Da riassegnare</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {affectedShifts.map((shift) => <div key={shift.id} className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-800">{formatDate(shift.date)} · {contracts.find((contract) => contract.id === shift.contract_id)?.site_name || 'Appalto'} · {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)} · {employeeLabel(employees.find((employee) => employee.id === shift.employee_id))}</div>)}
          </div>
          <button onClick={() => setAffectedShifts([])} className="w-full mt-5 rounded-xl bg-[#163f3d] text-white py-3 font-semibold">Chiudi</button>
        </div>
      </Modal>}
    </div>
  );
}
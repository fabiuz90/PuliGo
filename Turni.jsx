import db from '@/db';

import { useMemo, useState } from 'react';
import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns';
import { Plus, CalendarDays, List, Copy, User, Trash2 } from 'lucide-react';

import { useToast } from '@/use-toast';
import { useAuth } from '@/AuthContext';
import useOperationsData from '@/useOperationsData';
import useDrawerParam from '@/hooks/useDrawerParam';
import PullToRefresh from '@/PullToRefresh';
import ShiftForm from '@/ShiftForm';
import ShiftList from '@/ShiftList';
import WeekCalendar from '@/WeekCalendar';
import EmployeeCalendarView from '@/EmployeeCalendarView';
import WeekNav from '@/WeekNav';
import { Loading, Modal, PageHeader } from '@/common';
import ExportButton from '@/ExportButton';
import { buildAppaltoColorMap } from '@/appaltoColors';
import { shiftHours } from '@/reportCalc';
import { findConflict } from '@/shiftConflict';

export default function Turni() {
  const data = useOperationsData();
  const { toast } = useToast();
  const sp = new URLSearchParams(window.location.search);
  const preset = { contract_id: sp.get('contract') || '', date: sp.get('date') || '', start_time: sp.get('start') || '', end_time: sp.get('end') || '' };
  const { user } = useAuth();
  const [view, setView] = useState('calendar'), [week, setWeek] = useState(new Date()), [saving, setSaving] = useState(false), [copying, setCopying] = useState(false);
  const [clearText, setClearText] = useState(''), [clearing, setClearing] = useState(false);
  const shiftDrawer = useDrawerParam('shift', { extraClear: ['contract', 'date', 'start', 'end'] });
  const clearDrawer = useDrawerParam('clear');
  const viewButtons = [['calendar', 'Calendario', CalendarDays], ['employee', 'Per dipendente', User], ['list', 'Elenco', List]];

  const editing = shiftDrawer.value && shiftDrawer.value !== 'new' ? data.shifts.find(s => s.id === shiftDrawer.value) || null : null;
  const presetOpen = Boolean(preset.contract_id) && !shiftDrawer.value;
  const shiftOpen = shiftDrawer.isOpen || presetOpen;

  const save = async form => {
    const conflict = findConflict(data.shifts, { employeeId: form.employee_id, date: form.date, startTime: form.start_time, endTime: form.end_time, excludeId: editing?.id });
    if (conflict) { const c = data.contracts.find(x => x.id === conflict.contract_id); toast({ title: 'Attenzione: il dipendente selezionato è già occupato su un altro appalto, verifica bene!', description: `${c?.site_name || 'Appalto'} · ${conflict.date} ${conflict.start_time}–${conflict.end_time}` }); return; }
    setSaving(true);
    try {
      if (editing) await data.updateShiftOpt(editing.id, form); else await data.createShiftOpt(form);
      shiftDrawer.close();
    } finally { setSaving(false); }
  };
  const remove = async s => { if (window.confirm('Eliminare questo turno?')) { await data.deleteShiftOpt(s.id); } };
  const edit = s => shiftDrawer.open(s.id);

  const appaltoColors = useMemo(() => buildAppaltoColorMap(data.shifts), [data.shifts]);

  if (data.loading) return <Loading />;
  const start = startOfWeek(week, { weekStartsOn: 1 }), end = addWeeks(start, 1);
  const inRange = (d) => d >= format(start, 'yyyy-MM-dd') && d < format(end, 'yyyy-MM-dd');
  const weekShifts = data.shifts.filter(s => inRange(s.date));
  const exportSheets = [{ name: 'Turni', rows: [['Data', 'Dipendente', 'Appalto', 'Inizio', 'Fine', 'Ore'], ...weekShifts.map(s => { const e = data.employees.find(x => x.id === s.employee_id); const c = data.contracts.find(x => x.id === s.contract_id); return [s.date, `${e?.last_name || ''} ${e?.first_name || ''}`.trim(), c?.site_name || '—', s.start_time, s.end_time, shiftHours(s).toFixed(2)]; }).sort((a, b) => a[0].localeCompare(b[0]))] }];
  const exportFilename = `PuliGo_Turni_${format(start, 'dd')}-${format(addDays(end, -1), 'dd')}_${format(start, 'MM-yyyy')}.xlsx`;

  const copyPrevWeek = async () => {
    const prevStart = addWeeks(start, -1), prevEnd = addWeeks(prevStart, 1);
    const prevShifts = data.shifts.filter(s => s.date >= format(prevStart, 'yyyy-MM-dd') && s.date < format(prevEnd, 'yyyy-MM-dd'));
    if (!prevShifts.length) { toast({ title: 'Nessun turno da copiare nella settimana precedente.' }); return; }
    if (weekShifts.length) {
      if (!window.confirm('La settimana selezionata contiene già dei turni. Vuoi comunque copiare la settimana precedente?')) return;
    }
    setCopying(true);
    try {
      const newRecords = prevShifts.map(s => ({
        employee_id: s.employee_id,
        contract_id: s.contract_id,
        date: format(addDays(parseISO(s.date), 7), 'yyyy-MM-dd'),
        start_time: s.start_time,
        end_time: s.end_time,
      }));
      await data.bulkCreateShiftsOpt(newRecords);
      toast({ title: 'Settimana copiata correttamente.' });
    } catch (e) {
      toast({ title: 'Copia non riuscita. Riprova.' });
    } finally {
      setCopying(false);
    }
  };

  const clearWeek = async () => {
    setClearing(true);
    try {
      const ids = weekShifts.map(s => s.id);
      if (ids.length) await data.deleteShiftsOpt(ids);
      await db.entities.AuditLog.create({
        user_id: user?.id || '',
        user_name: user?.full_name || user?.email || 'Utente',
        action: 'Cancella turni settimana',
        details: `Eliminati ${ids.length} turni della settimana ${format(start, 'dd/MM/yyyy')}`,
        week_start: format(start, 'yyyy-MM-dd'),
        week_end: format(addDays(end, -1), 'yyyy-MM-dd')
      });
      toast({ title: 'Tutti i turni della settimana sono stati cancellati.' });
      clearDrawer.close();
      setClearText('');
    } catch (e) {
      toast({ title: 'Cancellazione non riuscita. Riprova.' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <PullToRefresh onRefresh={data.reload}>
      <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
        <PageHeader eyebrow="Pianificazione" title="Turni" description="Assegna le persone e verifica la settimana." action={
          <div className="flex flex-wrap gap-2">
            <ExportButton sheets={exportSheets} filename={exportFilename} />
            <button onClick={copyPrevWeek} disabled={copying} className="flex gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 disabled:opacity-60">
              <Copy size={18} />{copying ? 'Copia…' : 'Copia settimana precedente'}
            </button>
            <button onClick={() => shiftDrawer.open('new')} className="flex gap-2 bg-[#163f3d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm"><Plus size={18} />Nuovo turno</button>
            <button onClick={() => clearDrawer.open('1')} className="flex gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100"><Trash2 size={18} />Cancella turni</button>
          </div>
        } />

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-5">
          <WeekNav week={week} setWeek={setWeek} />
          <div className="flex bg-slate-200/70 rounded-xl p-1">
            {viewButtons.map(([key, label, Icon]) => (
              <button key={key} onClick={() => setView(key)} className={`flex gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${view === key ? 'bg-white shadow-sm' : ''}`}><Icon size={16} />{label}</button>
            ))}
          </div>
        </div>

        {view === 'calendar'
          ? <WeekCalendar shifts={weekShifts} contracts={data.contracts} employees={data.employees} week={week} onEdit={edit} onDelete={remove} appaltoColors={appaltoColors} />
          : view === 'employee'
          ? <EmployeeCalendarView shifts={weekShifts} contracts={data.contracts} employees={data.employees} week={week} onEdit={edit} onDelete={remove} appaltoColors={appaltoColors} />
          : <ShiftList shifts={data.shifts} contracts={data.contracts} employees={data.employees} onEdit={edit} onDelete={remove} appaltoColors={appaltoColors} />}

        <div className="mt-5"><WeekNav week={week} setWeek={setWeek} /></div>

        {clearDrawer.isOpen && (
          <Modal title="Cancella turni della settimana" onClose={() => { clearDrawer.close(); setClearText(''); }}>
            <div className="p-6">
              <p className="text-slate-600 mb-4">Sei sicuro di voler cancellare tutti i turni della settimana?</p>
              <p className="text-sm text-slate-500 mb-2">Digita <b className="tracking-wide">SI</b> per confermare l'eliminazione di {weekShifts.length} turni.</p>
              <input value={clearText} onChange={e => setClearText(e.target.value)} placeholder="SI" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600" />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { clearDrawer.close(); setClearText(''); }} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-slate-50">Annulla</button>
                <button onClick={clearWeek} disabled={clearing || clearText.trim().toUpperCase() !== 'SI'} className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">{clearing ? 'Cancellazione…' : 'OK, cancella'}</button>
              </div>
            </div>
          </Modal>
        )}

        {shiftOpen && <Modal title={editing ? 'Modifica turno' : 'Nuovo turno'} onClose={shiftDrawer.close}><ShiftForm initial={editing} preset={preset} contracts={data.contracts} employees={data.employees} shifts={data.shifts} onSubmit={save} saving={saving} /></Modal>}
      </div>
    </PullToRefresh>
  );
}

import { useMemo, useState } from 'react';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import useOperationsData from '@/useOperationsData';
import { Loading, PageHeader, EmptyState } from '@/common';
import ExportButton from '@/ExportButton';
import MobileSelect from '@/MobileSelect';
import { buildMonthlyReport, buildMonthGaps, monthLabel, shiftHours, eur, MONTHS_IT, yearsList } from '@/reportCalc';
import { contractDisplay } from '@/codes';

const appColumns = [
  { key: 'code', label: 'Codice', get: (a) => a.contract?.code || '', type: 'text' },
  { key: 'name', label: 'Appalto', get: (a) => a.contract?.site_name || '', type: 'text' },
  { key: 'client', label: 'Cliente', get: (a) => a.contract?.client_name || '', type: 'text' },
  { key: 'shifts', label: 'Turni', get: (a) => a.shifts, type: 'num' },
  { key: 'hours', label: 'Ore', get: (a) => a.hours, type: 'num' },
  { key: 'revenue', label: 'Ricavo', get: (a) => a.revenue, type: 'num' },
  { key: 'cost', label: 'Costo', get: (a) => a.cost, type: 'num' },
  { key: 'marginEur', label: 'Margine €', get: (a) => a.marginEur, type: 'num' },
  { key: 'marginPct', label: 'Margine %', get: (a) => (a.marginPct == null ? -Infinity : a.marginPct), type: 'num' },
];

const fmtAppCell = (col, a) => {
  if (col.key === 'revenue' || col.key === 'cost' || col.key === 'marginEur') return eur(col.get(a));
  if (col.key === 'hours') return `${a.hours.toFixed(1)} h`;
  if (col.key === 'marginPct') return a.marginPct == null ? 'n/d' : `${a.marginPct.toFixed(1)}%`;
  if (col.key === 'shifts') return a.shifts;
  return col.get(a);
};

const formatHours = (value) => Number(value.toFixed(2));

function buildEmployeeDailySheet(employees, shifts, absences, year, month) {
  const rows = [['Resoconto giornaliero per dipendente'], [`${MONTHS_IT[month]} ${year}`], []];
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);

  [...employees]
    .sort((a, b) => `${a.last_name || ''} ${a.first_name || ''}`.localeCompare(`${b.last_name || ''} ${b.first_name || ''}`, 'it'))
    .forEach((employee) => {
      const fullName = `${employee.last_name || ''} ${employee.first_name || ''}`.trim() || 'Dipendente sconosciuto';
      rows.push([`DIPENDENTE: ${fullName}`]);
      rows.push([`Codice: ${employee.code || '—'}`]);
      rows.push(['Data', 'Giorno', 'Ore lavorate', 'Ferie', 'Permesso', 'Malattia']);

      for (let day = monthStart; day <= monthEnd; day = addDays(day, 1)) {
        const date = format(day, 'yyyy-MM-dd');
        const dayShifts = shifts.filter((shift) => shift.employee_id === employee.id && shift.date === date);
        const dayAbsences = absences.filter((absence) => absence.employee_id === employee.id && absence.start_date <= date && absence.end_date >= date);
        const workedHours = dayShifts.reduce((total, shift) => total + shiftHours(shift), 0);
        const ferieHours = dayAbsences.some((absence) => absence.type === 'ferie') ? 8 : 0;
        const malattiaHours = dayAbsences.some((absence) => absence.type === 'malattia') ? 8 : 0;
        const permissionHours = dayAbsences
          .filter((absence) => absence.type === 'permesso' && absence.start_date === date)
          .reduce((total, absence) => total + (Number(absence.duration_hours) || 0), 0);

        rows.push([
          format(day, 'dd/MM/yyyy'),
          format(day, 'EEE', { locale: it }),
          formatHours(workedHours),
          formatHours(ferieHours),
          formatHours(permissionHours),
          formatHours(malattiaHours),
        ]);
      }

      const totals = rows.slice(-(monthEnd.getDate() - monthStart.getDate() + 1)).reduce(
        (total, row) => ({
          worked: total.worked + row[2],
          ferie: total.ferie + row[3],
          permission: total.permission + row[4],
          malattia: total.malattia + row[5],
          workedDays: total.workedDays + (row[2] > 0 ? 1 : 0),
          ferieDays: total.ferieDays + (row[3] > 0 ? 1 : 0),
          malattiaDays: total.malattiaDays + (row[5] > 0 ? 1 : 0),
        }),
        { worked: 0, ferie: 0, permission: 0, malattia: 0, workedDays: 0, ferieDays: 0, malattiaDays: 0 }
      );
      rows.push(['TOTALE DIPENDENTE']);
      rows.push(['Giorni lavorati', totals.workedDays]);
      rows.push(['Ore lavorate', formatHours(totals.worked)]);
      rows.push(['Giorni ferie', totals.ferieDays]);
      rows.push(['Ore ferie', formatHours(totals.ferie)]);
      rows.push(['Ore permesso', formatHours(totals.permission)]);
      rows.push(['Giorni malattia', totals.malattiaDays]);
      rows.push(['Ore malattia', formatHours(totals.malattia)]);
      rows.push([]);
    });

  return rows;
}

export default function ResocontoMensile() {
  const data = useOperationsData();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [appSort, setAppSort] = useState({ key: 'hours', dir: 'desc' });

  const report = useMemo(
    () => buildMonthlyReport(data.shifts, data.employees, data.contracts, year, month),
    [data.shifts, data.employees, data.contracts, year, month]
  );
  const gaps = useMemo(
    () => buildMonthGaps(data.contracts, data.shifts, year, month),
    [data.contracts, data.shifts, year, month]
  );

  if (data.loading) return <Loading />;

  const empRows = [...report.byEmployee.entries()].sort((a, b) => b[1].hours - a[1].hours);
  const appRows = [...report.byAppalto.entries()];
  const sortedAppRows = [...appRows].sort((a, b) => {
    const col = appColumns.find((c) => c.key === appSort.key) || appColumns[4];
    const dir = appSort.dir === 'asc' ? 1 : -1;
    const av = col.get(a[1]);
    const bv = col.get(b[1]);
    if (col.type === 'num') return (av - bv) * dir;
    return String(av).localeCompare(String(bv), 'it') * dir;
  });
  const toggleSort = (key) =>
    setAppSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  const sheets = [
    { name: 'Riepilogo', rows: [['Resoconto Mensile', `${MONTHS_IT[month]} ${year}`], [], ['Ore totali', report.totalHours.toFixed(2)], ['Turni totali', report.totalShifts], ['Giornate lavorative', report.workingDays], ['Ore scoperte (h)', gaps.uncoveredHours.toFixed(2)]] },
    { name: 'Per Dipendente', rows: buildEmployeeDailySheet(data.employees, data.shifts, data.absences, year, month), options: { employeeDaily: true } },
    { name: 'Per Appalto', rows: [['Codice', 'Appalto', 'Cliente', 'Turni', 'Ore', 'Ricavo €', 'Costo €', 'Margine €', 'Margine %'], ...sortedAppRows.map(([cid, a]) => [a.contract?.code || '', a.contract?.site_name || '—', a.contract?.client_name || '', a.shifts, a.hours.toFixed(2), a.revenue.toFixed(2), a.cost.toFixed(2), a.marginEur.toFixed(2), a.marginPct == null ? 'n/d' : `${a.marginPct.toFixed(2)}%`])] },
    { name: 'Dettaglio Turni', rows: [['Data', 'Codice Dip.', 'Dipendente', 'Codice App.', 'Appalto', 'Inizio', 'Fine', 'Ore'], ...report.monthShifts.map((s) => { const e = data.employees.find((x) => x.id === s.employee_id); const c = data.contracts.find((x) => x.id === s.contract_id); return [s.date, e?.code || '', e ? `${e.last_name} ${e.first_name}` : '—', c?.code || '', c?.site_name || '—', s.start_time, s.end_time, shiftHours(s).toFixed(2)]; }).sort((a, b) => a[0].localeCompare(b[0]))] },
  ];
  const filename = `PuliGo_Resoconto_Mensile_${monthLabel(year, month)}.xlsx`;
  const filterCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';

  return (
    <div className="p-4 sm:p-10 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Report" title="Resoconto Mensile" description="Analisi automatica di ore, turni e copertura del mese selezionato." action={<ExportButton sheets={sheets} filename={filename} />} />

      <div className="flex flex-wrap gap-3 mb-6">
        <MobileSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={MONTHS_IT.map((m, i) => ({ value: String(i), label: m }))} className={filterCls} />
        <MobileSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearsList(now.getFullYear()).map((y) => ({ value: String(y), label: String(y) }))} className={filterCls} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[['Ore totali', `${report.totalHours.toFixed(1)} h`], ['Turni totali', report.totalShifts], ['Giornate lavorative', report.workingDays], ['Ore scoperte', `${gaps.uncoveredHours.toFixed(1)} h`]].map(([l, v]) => (
          <div key={l} className="bg-white border rounded-2xl p-5"><p className="text-sm text-slate-500">{l}</p><p className="text-2xl font-semibold mt-2">{v}</p></div>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Riepilogo per dipendente</h2>
        {!empRows.length ? <EmptyState text="Nessun turno nel mese selezionato" /> : (
          <>
            <div className="hidden lg:block bg-white border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Codice</th><th>Dipendente</th><th className="text-right">Giorni lavorati</th><th className="text-right">Costo €</th><th className="text-right">Turni</th><th className="text-right pr-4">Ore totali</th></tr></thead>
                  <tbody>{empRows.map(([id, e]) => (<tr key={id} className="border-t"><td className="p-4 font-mono text-xs text-slate-500">{e.employee?.code || '—'}</td><td className="font-medium">{e.employee ? `${e.employee.last_name} ${e.employee.first_name}` : '—'}</td><td className="text-right">{e.days.size}</td><td className="text-right">{e.cost > 0 ? eur(e.cost) : '—'}</td><td className="text-right">{e.shifts}</td><td className="text-right font-semibold pr-4">{e.hours.toFixed(1)} h</td></tr>))}</tbody>
                </table>
              </div>
            </div>
            <div className="lg:hidden space-y-3">
              {empRows.map(([id, e]) => (
                <div key={id} className="bg-white border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div><span className="text-xs font-mono text-slate-400">{e.employee?.code || '—'}</span><p className="font-semibold mt-0.5">{e.employee ? `${e.employee.last_name} ${e.employee.first_name}` : '—'}</p></div>
                    <p className="text-lg font-semibold">{e.hours.toFixed(1)} h</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400">Giorni</p><p className="font-semibold mt-0.5">{e.days.size}</p></div>
                    <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400">Turni</p><p className="font-semibold mt-0.5">{e.shifts}</p></div>
                    <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400">Costo</p><p className="font-semibold mt-0.5">{e.cost > 0 ? eur(e.cost) : '—'}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Riepilogo per appalto</h2>
        {!appRows.length ? <EmptyState text="Nessun appalto con turni nel mese" /> : (
          <>
            <div className="hidden lg:block bg-white border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{appColumns.map((col) => (<th key={col.key} className={col.type === 'num' ? 'text-right p-4' : 'text-left p-4'}><button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 hover:text-slate-800">{col.label}{appSort.key === col.key && <span className="text-emerald-700">{appSort.dir === 'asc' ? '↑' : '↓'}</span>}</button></th>))}</tr></thead>
                  <tbody>{sortedAppRows.map(([cid, a]) => (<tr key={cid} className="border-t">{appColumns.map((col) => { const isNum = col.type === 'num'; const alert = col.key === 'marginPct' && a.marginPct != null && a.marginPct < 25 && a.revenue > 0; return (<td key={col.key} className={`${isNum ? 'text-right' : 'text-left'} p-4 ${col.key === 'code' ? 'font-mono text-xs text-slate-500' : ''} ${col.key === 'name' ? 'font-medium' : ''} ${alert ? 'text-red-600 font-semibold' : ''}`}>{fmtAppCell(col, a)}</td>); })}</tr>))}</tbody>
                </table>
              </div>
            </div>
            <div className="lg:hidden space-y-3">
              {sortedAppRows.map(([cid, a]) => {
                const alert = a.marginPct != null && a.marginPct < 25 && a.revenue > 0;
                return (
                  <div key={cid} className="bg-white border rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0"><span className="text-xs font-mono text-slate-400">{a.contract?.code || '—'}</span><p className="font-semibold mt-0.5 truncate">{a.contract?.site_name || '—'}</p><p className="text-xs text-slate-500 truncate">{a.contract?.client_name || ''}</p></div>
                      <p className={`text-lg font-semibold ${alert ? 'text-red-600' : ''}`}>{a.marginPct == null ? 'n/d' : `${a.marginPct.toFixed(1)}%`}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                      <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400">Ore</p><p className="font-semibold mt-0.5">{a.hours.toFixed(1)} h</p></div>
                      <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400">Ricavo</p><p className="font-semibold mt-0.5">{eur(a.revenue)}</p></div>
                      <div className="bg-slate-50 rounded-lg py-2"><p className="text-slate-400">Costo</p><p className="font-semibold mt-0.5">{eur(a.cost)}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Ore scoperte / buchi</h2>
        {gaps.uncoveredHours === 0 ? (
          <div className="bg-emerald-50 text-emerald-800 rounded-2xl p-6 text-center font-medium">Nessun buco di copertura nel mese.</div>
        ) : (
          <>
            <div className="hidden lg:block bg-white border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Data</th><th>Appalto</th><th>Orario</th><th className="text-right pr-4">Ore mancanti</th></tr></thead>
                  <tbody>{gaps.gaps.map((g, i) => (<tr key={i} className="border-t"><td className="p-4 capitalize">{format(new Date(g.date), 'EEE d MMM', { locale: it })}</td><td className="text-slate-600">{contractDisplay(g.contract)}</td><td>{g.start_time}–{g.end_time}</td><td className="text-right text-red-600 font-semibold pr-4">{(g.missingMinutes / 60).toFixed(1)} h</td></tr>))}</tbody>
                </table>
              </div>
            </div>
            <div className="lg:hidden space-y-3">
              {gaps.gaps.map((g, i) => (
                <div key={i} className="bg-white border rounded-2xl p-4 flex items-center justify-between">
                  <div><p className="font-medium capitalize">{format(new Date(g.date), 'EEE d MMM', { locale: it })}</p><p className="text-sm text-slate-500">{contractDisplay(g.contract)}</p><p className="text-xs text-slate-400 mt-0.5">{g.start_time}–{g.end_time}</p></div>
                  <p className="text-red-600 font-semibold">{(g.missingMinutes / 60).toFixed(1)} h</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
import { useMemo, useState } from 'react';
import useOperationsData from '@/hooks/useOperationsData';
import { Loading, PageHeader, EmptyState } from '@/components/common';
import ExportButton from '@/components/ExportButton';
import MobileSelect from '@/components/MobileSelect';
import { shiftHours, shiftsInMonth, monthLabel, MONTHS_IT, yearsList } from '@/lib/reportCalc';

const eur = (v) => (v == null || isNaN(v) ? '—' : `€ ${Number(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const pct = (v) => (v == null || isNaN(v) ? '—' : `${v.toFixed(1)}%`);

function monthStats(shifts, employees, contracts, year, month) {
  const empById = new Map((employees || []).map((e) => [e.id, e]));
  const monthShifts = shiftsInMonth(shifts, year, month);
  let hours = 0, cost = 0;
  const workedContracts = new Set();
  monthShifts.forEach((s) => {
    const h = shiftHours(s);
    const emp = empById.get(s.employee_id);
    hours += h;
    cost += (emp && emp.hourly_cost ? emp.hourly_cost : 0) * h;
    workedContracts.add(s.contract_id);
  });
  const fatturato = (contracts || []).filter((c) => workedContracts.has(c.id)).reduce((sum, c) => sum + (c.monthly_revenue || 0), 0);
  const incidenza = fatturato > 0 ? (cost / fatturato) * 100 : null;
  const margine = fatturato - cost;
  const ricavoMedio = hours > 0 ? fatturato / hours : null;
  const costoMedio = hours > 0 ? cost / hours : null;
  return { month, hours, cost, fatturato, incidenza, margine, ricavoMedio, costoMedio, hasData: monthShifts.length > 0 || fatturato > 0 };
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium ${accent || ''}`}>{value}</span>
    </div>
  );
}

export default function Statistiche() {
  const data = useOperationsData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const rows = useMemo(
    () => MONTHS_IT.map((_, m) => monthStats(data.shifts, data.employees, data.contracts, year, m)),
    [data.shifts, data.employees, data.contracts, year]
  );

  const totals = useMemo(() => {
    const t = rows.reduce((acc, r) => { acc.fatturato += r.fatturato; acc.cost += r.cost; acc.hours += r.hours; return acc; }, { fatturato: 0, cost: 0, hours: 0 });
    t.incidenza = t.fatturato > 0 ? (t.cost / t.fatturato) * 100 : null;
    t.margine = t.fatturato - t.cost;
    t.ricavoMedio = t.hours > 0 ? t.fatturato / t.hours : null;
    t.costoMedio = t.hours > 0 ? t.cost / t.hours : null;
    return t;
  }, [rows]);

  if (data.loading) return <Loading />;
  const hasAny = rows.some((r) => r.hasData);

  const exportRows = [
    ['Mese', 'Fatturato (€)', 'Costo personale (€)', 'Incidenza personale %', 'Margine dopo personale (€)', 'Ore lavorate', 'Ricavo medio €/ora', 'Costo medio €/ora'],
    ...rows.map((r, i) => [`${MONTHS_IT[i]} ${year}`, r.fatturato.toFixed(2), r.cost.toFixed(2), r.incidenza == null ? 'n/d' : r.incidenza.toFixed(2), r.margine.toFixed(2), r.hours.toFixed(2), r.ricavoMedio == null ? 'n/d' : r.ricavoMedio.toFixed(2), r.costoMedio == null ? 'n/d' : r.costoMedio.toFixed(2)]),
    [`TOTALE ${year}`, totals.fatturato.toFixed(2), totals.cost.toFixed(2), totals.incidenza == null ? 'n/d' : totals.incidenza.toFixed(2), totals.margine.toFixed(2), totals.hours.toFixed(2), totals.ricavoMedio == null ? 'n/d' : totals.ricavoMedio.toFixed(2), totals.costoMedio == null ? 'n/d' : totals.costoMedio.toFixed(2)],
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Report" title="Statistiche" description="Fatturato, costo del personale e margini divisi per anno e mese." action={<ExportButton sheets={[{ name: `Statistiche ${year}`, rows: exportRows }]} filename={`PuliGo_Statistiche_${year}.xlsx`} />} />

      <div className="flex flex-wrap gap-3 mb-6">
        <MobileSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearsList(now.getFullYear()).map((y) => ({ value: String(y), label: String(y) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
      </div>

      {!hasAny ? <EmptyState text="Nessun dato per l'anno selezionato" /> : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50"><tr>
                  <th className="py-3 px-4">Mese</th><th className="py-3 px-4 text-right">Fatturato</th><th className="py-3 px-4 text-right">Costo personale</th><th className="py-3 px-4 text-right">Incidenza personale</th><th className="py-3 px-4 text-right">Margine dopo personale</th><th className="py-3 px-4 text-right">Ore lavorate</th><th className="py-3 px-4 text-right">Ricavo medio €/ora</th><th className="py-3 px-4 text-right">Costo medio €/ora</th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t ${r.hasData ? '' : 'text-slate-300'} ${i === now.getMonth() && year === now.getFullYear() ? 'bg-emerald-50/40' : ''}`}>
                      <td className="py-3 px-4 font-medium">{MONTHS_IT[i]}</td>
                      <td className="py-3 px-4 text-right">{r.hasData ? eur(r.fatturato) : '—'}</td>
                      <td className="py-3 px-4 text-right">{r.hasData ? eur(r.cost) : '—'}</td>
                      <td className="py-3 px-4 text-right">{r.hasData ? pct(r.incidenza) : '—'}</td>
                      <td className={`py-3 px-4 text-right font-medium ${r.hasData && r.margine < 0 ? 'text-red-600' : ''}`}>{r.hasData ? eur(r.margine) : '—'}</td>
                      <td className="py-3 px-4 text-right">{r.hasData ? `${r.hours.toFixed(1)} h` : '—'}</td>
                      <td className="py-3 px-4 text-right">{r.hasData ? eur(r.ricavoMedio) : '—'}</td>
                      <td className="py-3 px-4 text-right">{r.hasData ? eur(r.costoMedio) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-slate-50 font-semibold">
                    <td className="py-3 px-4">Totale {year}</td>
                    <td className="py-3 px-4 text-right">{eur(totals.fatturato)}</td>
                    <td className="py-3 px-4 text-right">{eur(totals.cost)}</td>
                    <td className="py-3 px-4 text-right">{pct(totals.incidenza)}</td>
                    <td className={`py-3 px-4 text-right ${totals.margine < 0 ? 'text-red-600' : ''}`}>{eur(totals.margine)}</td>
                    <td className="py-3 px-4 text-right">{totals.hours.toFixed(1)} h</td>
                    <td className="py-3 px-4 text-right">{eur(totals.ricavoMedio)}</td>
                    <td className="py-3 px-4 text-right">{eur(totals.costoMedio)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {rows.map((r, i) => (
              <div key={i} className={`bg-white border rounded-2xl p-4 ${i === now.getMonth() && year === now.getFullYear() ? 'ring-2 ring-emerald-200' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <b className="text-base">{MONTHS_IT[i]}</b>
                  <span className={`text-sm font-semibold ${r.hasData && r.margine < 0 ? 'text-red-600' : ''}`}>{r.hasData ? eur(r.margine) : '—'}</span>
                </div>
                {r.hasData ? (
                  <div className="divide-y divide-slate-100">
                    <Row label="Fatturato" value={eur(r.fatturato)} />
                    <Row label="Costo personale" value={eur(r.cost)} />
                    <Row label="Incidenza personale" value={pct(r.incidenza)} />
                    <Row label="Ore lavorate" value={`${r.hours.toFixed(1)} h`} />
                    <Row label="Ricavo medio €/ora" value={eur(r.ricavoMedio)} />
                    <Row label="Costo medio €/ora" value={eur(r.costoMedio)} />
                  </div>
                ) : <p className="text-sm text-slate-300 py-2">Nessun dato</p>}
              </div>
            ))}
            <div className="bg-[#102a2b] text-white rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2"><b>Totale {year}</b><span className="font-semibold">{eur(totals.margine)}</span></div>
              <div className="divide-y divide-white/10">
                <Row label="Fatturato" value={eur(totals.fatturato)} />
                <Row label="Costo personale" value={eur(totals.cost)} />
                <Row label="Incidenza personale" value={pct(totals.incidenza)} />
                <Row label="Ore lavorate" value={`${totals.hours.toFixed(1)} h`} />
                <Row label="Ricavo medio €/ora" value={eur(totals.ricavoMedio)} />
                <Row label="Costo medio €/ora" value={eur(totals.costoMedio)} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
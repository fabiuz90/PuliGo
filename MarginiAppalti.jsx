import { useMemo, useState } from 'react';
import useOperationsData from '@/hooks/useOperationsData';
import { Loading, PageHeader, EmptyState } from '@/common';
import ExportButton from '@/ExportButton';
import { buildAppaltoMargins, monthLabel, eur, MONTHS_IT, yearsList } from '@/reportCalc';
import { contractDisplay, empDisplay } from '@/codes';
import MobileSelect from '@/MobileSelect';

export default function MarginiAppalti() {
  const data = useOperationsData();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const margins = useMemo(
    () => buildAppaltoMargins(data.shifts, data.employees, data.contracts, year, month),
    [data.shifts, data.employees, data.contracts, year, month]
  );

  if (data.loading) return <Loading />;

  const relevant = margins.filter((m) => m.hours > 0 || m.revenue > 0);
  const alertCount = relevant.filter((m) => m.revenue > 0 && m.marginPct != null && m.marginPct < 25).length;

  const summaryRows = [
    ['Codice', 'Appalto', 'Cliente', 'Ricavo mensile (€)', 'Ore personale', 'Costo personale (€)', 'Margine (€)', 'Margine %'],
    ...relevant.map((m) => [
      m.contract.code || '',
      m.contract.site_name,
      m.contract.client_name || '',
      m.revenue || 0,
      m.hours.toFixed(2),
      m.cost.toFixed(2),
      m.marginEur.toFixed(2),
      m.marginPct == null ? 'n/d' : `${m.marginPct.toFixed(2)}%`,
    ]),
  ];
  const detailRows = [['Codice App.', 'Appalto', 'Codice Dip.', 'Dipendente', 'Ore', 'Costo orario (€)', 'Costo personale (€)']];
  relevant.forEach((m) =>
    m.employees.forEach((e) =>
      detailRows.push([
        m.contract.code || '',
        m.contract.site_name,
        e.employee?.code || '',
        `${e.employee?.last_name || ''} ${e.employee?.first_name || ''}`.trim(),
        e.hours.toFixed(2),
        e.employee?.hourly_cost || 0,
        e.cost.toFixed(2),
      ])
    )
  );
  const sheets = [
    { name: 'Riepilogo Margini', rows: summaryRows },
    { name: 'Dettaglio Dipendenti', rows: detailRows },
  ];
  const filename = `PuliGo_Margini_Appalti_${monthLabel(year, month)}.xlsx`;

  return (
    <div className="p-4 sm:p-10 max-w-[1500px] mx-auto">
      <PageHeader
        eyebrow="Report"
        title="Margini Appalti"
        description="Costo del personale, ricavi e margini per appalto nel mese selezionato."
        action={<ExportButton sheets={sheets} filename={filename} />}
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <MobileSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={MONTHS_IT.map((m, i) => ({ value: String(i), label: m }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm min-w-[8rem]" />
        <MobileSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={yearsList(now.getFullYear()).map((y) => ({ value: String(y), label: String(y) }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm min-w-[6rem]" />
        {alertCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold sm:ml-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-alert" />🔴 Appalti in alert: {alertCount}
          </div>
        )}
      </div>

      {!relevant.length ? (
        <EmptyState text="Nessun turno né ricavo nel mese selezionato" />
      ) : (
        <div className="space-y-5">
          {relevant.map((m) => (
            <div key={m.contract.id} className={`bg-white border rounded-2xl p-5 ${m.revenue > 0 && m.marginPct != null && m.marginPct < 25 ? 'border-red-300' : ''}`}>
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <b className="text-lg">{contractDisplay(m.contract)}</b>
                  <p className="text-sm text-slate-500">{m.contract.client_name}</p>
                </div>
                <div className="text-right">
                  {m.revenue > 0 ? (
                    <>
                      <p className="text-2xl font-semibold">{eur(m.marginEur)}</p>
                      <p className="text-sm text-slate-500">{m.marginPct == null ? 'n/d' : `Margine ${m.marginPct.toFixed(1)}%`}</p>
                      {m.marginPct != null && m.marginPct < 25 && (
                        <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse-alert">🔴 ALERT</span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-amber-600 font-medium">Ricavo mensile non inserito</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[
                  ['Ricavo', eur(m.revenue)],
                  ['Ore personale', `${m.hours.toFixed(1)} h`],
                  ['Costo personale', eur(m.cost)],
                  ['Margine', m.revenue > 0 ? eur(m.marginEur) : 'n/d'],
                ].map(([l, v]) => (
                  <div key={l} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="font-semibold mt-1">{v}</p>
                  </div>
                ))}
              </div>

              {m.employees.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-2">Dipendente</th>
                        <th className="text-right">Ore</th>
                        <th className="text-right">Costo orario</th>
                        <th className="text-right pr-2">Costo personale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.employees
                        .sort((a, b) => b.cost - a.cost)
                        .map((e) => (
                          <tr key={e.employee?.id} className="border-t">
                            <td className="py-2">{e.employee ? empDisplay(e.employee) : '—'}</td>
                            <td className="text-right">{e.hours.toFixed(1)} h</td>
                            <td className="text-right">
                              {e.employee?.hourly_cost ? eur(e.employee.hourly_cost) : <span className="text-amber-600">non inserito</span>}
                            </td>
                            <td className="text-right font-medium pr-2">{e.employee?.hourly_cost ? eur(e.cost) : 'n/d'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
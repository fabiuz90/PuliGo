import useOperationsData from '@/hooks/useOperationsData';
import { buildCoverage } from '@/coverage';
import GapCard from '@/GapCard';
import { EmptyState, Loading, PageHeader } from '@/common';
import ExportButton from '@/ExportButton';
import { fileDateSuffix } from '@/reportCalc';
import PullToRefresh from '@/PullToRefresh';
export default function Buchi(){
  const {contracts,employees,shifts,loading,reload}=useOperationsData();if(loading)return <Loading/>;
  const gaps=buildCoverage(contracts,shifts,21).filter(x=>x.status!=='covered');
  const red=gaps.filter(x=>x.status==='uncovered').length,orange=gaps.filter(x=>x.status==='partial').length;
  const exportSheets=[{name:'Buchi',rows:[['Data','Appalto','Cliente','Indirizzo','Orario','Stato','Ore mancanti'],...gaps.map(g=>[g.date,g.contract.site_name,g.contract.client_name,g.contract.address,`${g.requirement.start_time}-${g.requirement.end_time}`,g.status,(g.missingMinutes/60).toFixed(2)])]}];
  return <PullToRefresh onRefresh={reload}><div className="p-4 sm:p-6 lg:p-10 max-w-[1500px] mx-auto"><PageHeader eyebrow="Controllo copertura" title="Buchi" description="Servizi scoperti o coperti solo in parte nei prossimi 21 giorni." action={<div className="flex flex-wrap gap-2"><ExportButton sheets={exportSheets} filename={`PuliGo_Buchi_${fileDateSuffix()}.xlsx`} /><span className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{red} scoperti</span><span className="px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-semibold">{orange} parziali</span></div>}/><div className="flex gap-5 text-xs font-semibold text-slate-500 mb-5"><span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-emerald-500"/>Coperto</span><span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-orange-500"/>Parziale</span><span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-full bg-red-500"/>Scoperto</span></div><div className="space-y-3">{gaps.map((g,i)=><GapCard key={`${g.contract.id}-${g.date}-${i}`} gap={g} employees={employees}/>)}</div>{!gaps.length&&<EmptyState text="Nessun buco di copertura nei prossimi 21 giorni"/>}</div></PullToRefresh>;
}
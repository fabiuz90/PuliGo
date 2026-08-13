import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { FileText, Users, CalendarDays, AlertTriangle, ArrowRight, TrendingUp, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import useOperationsData from '@/useOperationsData';
import { buildCoverage } from '@/coverage';
import { Loading, PageHeader } from '@/common';
import ExportButton from '@/ExportButton';
import { fileDateSuffix, shiftHours, eur } from '@/reportCalc';
import GapCard from '@/GapCard';
import TodayCoverage from '@/TodayCoverage';
import PullToRefresh from '@/PullToRefresh';
export default function Dashboard() {
  const {contracts,employees,shifts,loading,reload}=useOperationsData();
  if(loading)return <Loading/>;
  const today=format(new Date(),'yyyy-MM-dd'), coverage=buildCoverage(contracts,shifts,14), todayServices=coverage.filter(x=>x.date===today), gaps=coverage.filter(x=>x.status!=='covered');
  const monthPrefix=format(new Date(),'yyyy-MM'), expectedRevenue=contracts.filter(c=>c.status==='active').reduce((s,c)=>s+(Number(c.monthly_revenue)||0),0);
  let expectedCost=0, missingCost=0;
  shifts.forEach(s=>{ if(!(s.date||'').startsWith(monthPrefix))return; const emp=employees.find(e=>e.id===s.employee_id); if(emp&&emp.hourly_cost)expectedCost+=shiftHours(s)*emp.hourly_cost; else missingCost++; });
  const cards=[['Appalti attivi',contracts.filter(x=>x.status==='active').length,FileText,'text-teal-700 bg-teal-50'],['Dipendenti attivi',employees.filter(x=>x.status==='active').length,Users,'text-blue-700 bg-blue-50'],['Turni oggi',shifts.filter(x=>x.date===today).length,CalendarDays,'text-violet-700 bg-violet-50'],['Buchi oggi',todayServices.filter(x=>x.status!=='covered').length,AlertTriangle,'text-red-700 bg-red-50']];
  const exportSheets=[{name:'Riepilogo',rows:[['Indicatore','Valore'],...cards.map(([l,v])=>[l,v])]}, {name:'Buchi copertura',rows:[['Data','Appalto','Cliente','Indirizzo','Orario','Stato','Ore mancanti'],...gaps.map(g=>[g.date,g.contract.site_name,g.contract.client_name,g.contract.address,`${g.requirement.start_time}-${g.requirement.end_time}`,g.status,(g.missingMinutes/60).toFixed(2)])]}];
  return <PullToRefresh onRefresh={reload}><div className="p-4 sm:p-6 lg:p-10 max-w-[1500px] mx-auto"><PageHeader eyebrow={format(new Date(),'EEEE d MMMM',{locale:it})} title="Dashboard operativa" description="Copertura, persone e attività sotto controllo." action={<ExportButton sheets={exportSheets} filename={`PuliGo_Dashboard_${fileDateSuffix()}.xlsx`} />}/>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 flex justify-between items-center">
        <div><p className="text-sm text-white/80">Ricavi previsti del mese</p><p className="text-3xl font-semibold mt-2">{eur(expectedRevenue)}</p></div>
        <span className="w-11 h-11 rounded-xl grid place-items-center bg-white/15"><TrendingUp size={20}/></span>
      </div>
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-2xl p-5 flex justify-between items-center">
        <div><p className="text-sm text-white/80">Costi previsti del mese</p><p className="text-3xl font-semibold mt-2">{eur(expectedCost)}</p>{missingCost>0&&<p className="text-xs text-amber-300 mt-1">* {missingCost} turni senza costo orario</p>}</div>
        <span className="w-11 h-11 rounded-xl grid place-items-center bg-white/15"><Wallet size={20}/></span>
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-9">{cards.map(([label,value,Icon,color])=>{const alert=label==='Buchi oggi'&&value>0;return <div key={label} className={`relative bg-white border rounded-2xl p-5 flex justify-between ${alert?'border-red-500':''}`}><div><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-semibold mt-2">{value}</p></div><span className={`w-11 h-11 rounded-xl grid place-items-center ${color}`}><Icon size={20}/></span>{alert&&<span className="absolute inset-0 rounded-2xl border-2 border-red-500 animate-pulse-alert pointer-events-none"/>}</div>;})}</div>
    <section className="mb-9"><h2 className="text-xl font-semibold mb-1">Copertura di oggi</h2><p className="text-sm text-slate-500 mb-4">Verde completo, arancione parziale, rosso scoperto.</p><TodayCoverage services={todayServices}/>{!todayServices.length&&<p className="bg-white border rounded-2xl p-6 text-sm text-slate-400">Nessun servizio previsto oggi.</p>}</section>
    <div className="flex items-center justify-between mb-4"><div><h2 className="text-xl font-semibold">Priorità di copertura</h2><p className="text-sm text-slate-500">I buchi di oggi sono mostrati per primi</p></div><Link to="/buchi" className="flex gap-2 items-center text-sm font-semibold text-emerald-800">Vedi tutti <ArrowRight size={16}/></Link></div>
    <div className="space-y-3">{gaps.slice(0,5).map((g,i)=><GapCard key={`${g.contract.id}-${g.date}-${i}`} gap={g} employees={employees}/>)}{!gaps.length&&<div className="bg-emerald-50 text-emerald-800 rounded-2xl p-8 text-center font-medium">Tutti i servizi risultano coperti.</div>}</div>
  </div></PullToRefresh>;
}
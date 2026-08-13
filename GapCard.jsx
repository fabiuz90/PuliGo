import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import { durationLabel } from '@/lib/coverage';
export default function GapCard({ gap, employees }) {
  const names=gap.assignedIds.map(id=>{const e=employees.find(x=>x.id===id);return e?`${e.first_name} ${e.last_name}`:'—'}).join(', ');
  const color=gap.status==='partial'?'border-orange-200 bg-orange-50/40':'border-red-200 bg-red-50/40';
  const params=new URLSearchParams({contract:gap.contract.id,date:gap.date,start:gap.requirement.start_time,end:gap.requirement.end_time});
  return (
    <article className={`rounded-2xl border ${color} p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 sm:gap-5 items-start sm:items-center`}>
      <div className="min-w-0">
        <div className="flex gap-2 items-center mb-1">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${gap.status==='partial'?'bg-orange-500':'bg-red-500'}`}/>
          <b className="truncate">{gap.contract.site_name}</b>
        </div>
        <p className="text-sm text-slate-500 break-words">{gap.contract.client_name} · {gap.contract.address}</p>
      </div>
      <div className="min-w-0">
        <p className="font-semibold capitalize">{format(parseISO(gap.date),'EEEE d MMMM',{locale:it})}</p>
        <p className="text-sm text-slate-500 flex gap-1.5 mt-1 items-center"><Clock size={15} className="shrink-0"/>{gap.requirement.start_time}–{gap.requirement.end_time}</p>
      </div>
      <div className="min-w-0">
        <p className="text-sm flex flex-wrap gap-x-1.5 items-center"><Users size={15} className="shrink-0"/>Richiesti <b>{gap.requirement.employees_required}</b> · Assegnati <b>{gap.assignedIds.length}</b></p>
        <p className="text-xs text-slate-500 mt-1">{names||'Nessun dipendente'} · Mancano {gap.missingEmployees} persone / {durationLabel(gap.missingMinutes)}</p>
      </div>
      <Link to={`/turni?${params}`} className="px-4 py-2 rounded-xl bg-white border font-semibold text-sm hover:border-emerald-700 text-center sm:self-center">Assegna</Link>
    </article>
  );
}
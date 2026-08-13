import { Clock, Users } from 'lucide-react';
import { contractName } from '@/lib/codes';
export default function TodayCoverage({ services }) {
  const colors={covered:'bg-emerald-50 border-emerald-200 text-emerald-800',partial:'bg-orange-50 border-orange-200 text-orange-800',uncovered:'bg-red-50 border-red-200 text-red-800'};
  const labels={covered:'Coperto',partial:'Parziale',uncovered:'Scoperto'};
  return <div className="grid grid-cols-3 gap-3">{services.map((item,i)=><div key={`${item.contract.id}-${i}`} className={`border rounded-xl p-4 ${colors[item.status]}`}><div className="flex justify-between gap-2"><b className="truncate">{contractName(item.contract)}</b><span className="text-xs font-bold">{labels[item.status]}</span></div><div className="flex gap-4 mt-2 text-xs opacity-80"><span className="flex gap-1"><Clock size={14}/>{item.requirement.start_time}–{item.requirement.end_time}</span><span className="flex gap-1"><Users size={14}/>{item.assignedIds.length}/{item.requirement.employees_required}</span></div></div>)}</div>;
}
import { Plus, Trash2 } from 'lucide-react';
import { inputClass } from '@/components/common';
import MobileSelect from '@/components/MobileSelect';
const days = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
export default function ServiceRequirementsEditor({ value, onChange }) {
  const add = () => onChange([...value, { day_of_week: 1, start_time: '08:00', end_time: '10:00', employees_required: 1 }]);
  const update = (i, key, val) => onChange(value.map((r, x) => x === i ? {...r, [key]: key === 'employees_required' || key === 'day_of_week' ? Number(val) : val} : r));
  return <section className="mt-6"><div className="flex justify-between items-center mb-3"><div><h3 className="font-semibold">Servizi ricorrenti</h3><p className="text-xs text-slate-500">Fabbisogno settimanale del cantiere</p></div><button type="button" onClick={add} className="text-sm font-semibold text-emerald-700 flex gap-1"><Plus size={16}/>Aggiungi</button></div>
    <div className="space-y-2">{value.map((r,i) => <div key={i} className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_.8fr_auto] gap-2 bg-slate-50 p-3 rounded-xl">
      <MobileSelect className={`${inputClass} col-span-2 sm:col-span-1`} value={String(r.day_of_week)} onChange={v=>update(i,'day_of_week',v)} options={days.map((d,x)=>({value:String(x),label:d}))} />
      <input className={inputClass} type="time" value={r.start_time} onChange={e=>update(i,'start_time',e.target.value)}/><input className={inputClass} type="time" value={r.end_time} onChange={e=>update(i,'end_time',e.target.value)}/>
      <input className={inputClass} type="number" min="1" value={r.employees_required} onChange={e=>update(i,'employees_required',e.target.value)}/><button type="button" onClick={()=>onChange(value.filter((_,x)=>x!==i))} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={17}/></button>
    </div>)}{!value.length && <p className="text-sm text-slate-400 py-4 text-center">Nessun servizio configurato</p>}</div>
  </section>;
}
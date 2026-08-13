import { useState } from 'react';
import ServiceRequirementsEditor from '@/components/ServiceRequirementsEditor';
import { inputClass } from '@/components/common';
import MobileSelect from '@/components/MobileSelect';
export default function ContractForm({ initial, onSubmit, saving }) {
  const [form, setForm] = useState(initial || { client_name:'', site_name:'', address:'', status:'active', service_requirements:[], monthly_revenue:'' });
  const set = (key, value) => setForm(f => ({...f,[key]:value}));
  return <form onSubmit={e=>{e.preventDefault();onSubmit(form)}} className="p-6">
    <div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium">Società<input required className={`${inputClass} mt-1.5`} value={form.client_name} onChange={e=>set('client_name',e.target.value)}/></label><label className="text-sm font-medium">Nome appalto / cantiere<input required className={`${inputClass} mt-1.5`} value={form.site_name} onChange={e=>set('site_name',e.target.value)}/></label><label className="col-span-2 text-sm font-medium">Indirizzo<input required className={`${inputClass} mt-1.5`} value={form.address} onChange={e=>set('address',e.target.value)}/></label><label className="text-sm font-medium">Stato<MobileSelect className={`${inputClass} mt-1.5`} value={form.status} onChange={v=>set('status',v)} options={[{value:'active',label:'Attivo'},{value:'inactive',label:'Inattivo'}]} /></label><label className="text-sm font-medium">Ricavo mensile (€)<input type="number" step="0.01" min="0" placeholder="es. 4500" className={`${inputClass} mt-1.5`} value={form.monthly_revenue ?? ''} onChange={e=>set('monthly_revenue',e.target.value===''?'':Number(e.target.value))}/></label></div>
    <ServiceRequirementsEditor value={form.service_requirements || []} onChange={v=>set('service_requirements',v)}/>
    <button disabled={saving} className="mt-6 w-full rounded-xl bg-[#163f3d] text-white py-3 font-semibold disabled:opacity-50">{saving?'Salvataggio…':'Salva appalto'}</button>
  </form>;
}
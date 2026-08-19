import { useState } from 'react';
import ServiceRequirementsEditor from '@/ServiceRequirementsEditor';
import { inputClass } from '@/common';
import MobileSelect from '@/MobileSelect';
export default function ContractForm({ initial, onChange, onSubmit, saving }) {
  const [localForm, setLocalForm] = useState(initial || { client_name:'', site_name:'', address:'', status:'active', service_requirements:[], monthly_revenue:'' });
  const [error, setError] = useState('');
  const form = onChange ? initial : localForm;
  const set = (key, value) => {
    setError('');
    const next = { ...form, [key]: value };
    if (onChange) onChange(next);
    else setLocalForm(next);
  };
  const submit = e => {
    e.preventDefault();
    if (!form.site_name?.trim()) {
      setError('Inserisci il nome dell’appalto.');
      return;
    }
    onSubmit({ ...form, site_name: form.site_name.trim() });
  };
  return <form onSubmit={submit} className="p-6">
    <div className="grid grid-cols-2 gap-4"><label className="text-sm font-medium">Società<input className={`${inputClass} mt-1.5`} value={form.client_name} onChange={e=>set('client_name',e.target.value)}/></label><label className="text-sm font-medium">Nome appalto / cantiere<input required className={`${inputClass} mt-1.5`} value={form.site_name} onChange={e=>set('site_name',e.target.value)}/></label><label className="col-span-2 text-sm font-medium">Indirizzo<input className={`${inputClass} mt-1.5`} value={form.address} onChange={e=>set('address',e.target.value)}/></label><label className="text-sm font-medium">Stato<MobileSelect className={`${inputClass} mt-1.5`} value={form.status} onChange={v=>set('status',v)} options={[{value:'active',label:'Attivo'},{value:'inactive',label:'Inattivo'}]} /></label><label className="text-sm font-medium">Ricavo mensile (€)<input type="number" step="0.01" min="0" placeholder="es. 4500" className={`${inputClass} mt-1.5`} value={form.monthly_revenue ?? ''} onChange={e=>set('monthly_revenue',e.target.value===''?'':Number(e.target.value))}/></label></div>
    <ServiceRequirementsEditor value={form.service_requirements || []} onChange={v=>set('service_requirements',v)}/>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</p>}
    <button disabled={saving} className="mt-6 w-full rounded-xl bg-[#163f3d] text-white py-3 font-semibold disabled:opacity-50">{saving?'Salvataggio…':'Salva appalto'}</button>
  </form>;
}
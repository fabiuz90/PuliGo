import db from '@/db';

import { useMemo, useState } from 'react';
import { Plus, MapPin, Pencil, Trash2, Clock3, Search } from 'lucide-react';

import useOperationsData from '@/hooks/useOperationsData';
import ContractForm from '@/ContractForm';
import { EmptyState, Loading, Modal, PageHeader, StatusBadge, inputClass } from '@/common';
import ExportButton from '@/ExportButton';
import { fileMonthSuffix } from '@/reportCalc';
import { nextContractCode } from '@/codes';
import useDrawerParam from '@/hooks/useDrawerParam';

const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const filters = [['all', 'Tutti'], ['active', 'Attivi'], ['inactive', 'Inattivi'], ['with_services', 'Con servizi'], ['no_services', 'Senza servizi']];

export default function Appalti() {
  const { contracts, loading, reload } = useOperationsData();
  const contractDrawer = useDrawerParam('contract');
  const [saving, setSaving] = useState(false);
  const editing = contractDrawer.value && contractDrawer.value !== 'new' ? contracts.find(c => c.id === contractDrawer.value) || null : null;
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');

  const save = async data => { setSaving(true); if (editing) { await db.entities.Contract.update(editing.id, data); } else { await db.entities.Contract.create({ ...data, code: nextContractCode(contracts) }); } setSaving(false); contractDrawer.close(); reload(); };
  const remove = async item => { if (window.confirm(`Eliminare l'appalto "${item.site_name}"?`)) { await db.entities.Contract.delete(item.id); reload(); } };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return contracts.filter(c => {
      if (q && !`${c.code || ''} ${c.site_name} ${c.client_name} ${c.address}`.toLowerCase().includes(q)) return false;
      if (filter === 'active' && c.status !== 'active') return false;
      if (filter === 'inactive' && c.status !== 'inactive') return false;
      if (filter === 'with_services' && !(c.service_requirements || []).length) return false;
      if (filter === 'no_services' && (c.service_requirements || []).length) return false;
      return true;
    }).sort((a, b) => (a.site_name || '').localeCompare(b.site_name || '', 'it'));
  }, [contracts, query, filter]);

  if (loading) return <Loading />;

  const exportSheets=[{name:'Appalti',rows:[['Codice','Società','Appalto','Indirizzo','Stato','Ricavo mensile (€)','Servizi'],...filtered.map(c=>[c.code||'',c.client_name,c.site_name,c.address,c.status==='active'?'Attivo':'Inattivo',c.monthly_revenue||0,(c.service_requirements||[]).length])]}];

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Anagrafiche" title="Appalti" description="Cantieri e fabbisogni di servizio ricorrenti." action={
        <div className="flex gap-2">
          <ExportButton sheets={exportSheets} filename={`PuliGo_Appalti_${fileMonthSuffix()}.xlsx`} />
          <button onClick={() => contractDrawer.open('new')} className="flex gap-2 bg-[#163f3d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm"><Plus size={18} />Nuovo appalto</button>
        </div>
      } />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-md">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca appalto, società o indirizzo…" className={`${inputClass} pl-10`} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {filters.map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} className={`px-3.5 py-2 rounded-xl text-sm font-medium border ${filter === key ? 'bg-[#163f3d] text-white border-[#163f3d]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{label}</button>
          ))}
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">{filtered.length} appalt{filtered.length === 1 ? 'o' : 'i'}</p>

      <div className="flex flex-col gap-3">
        {filtered.map(c => (
          <article key={c.id} className="bg-white border rounded-2xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{c.code || '—'}</span>
                  <StatusBadge active={c.status === 'active'} />
                </div>
                <h2 className="text-base font-semibold mt-1 truncate">{c.site_name}</h2>
                <p className="text-xs text-slate-500 truncate"><span className="font-medium text-slate-400">Società:</span> {c.client_name}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><MapPin size={13} />{c.address}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Ricavo mensile</p>
                <p className="text-lg font-semibold">{c.monthly_revenue ? `€ ${Number(c.monthly_revenue).toLocaleString('it-IT')}` : '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {(c.service_requirements || []).map((r, i) => (
                <span key={i} className="bg-slate-50 border rounded-md px-2 py-0.5 text-xs"><b>{days[r.day_of_week]}</b> {r.start_time}–{r.end_time} · {r.employees_required}add.</span>
              ))}
              {!c.service_requirements?.length && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock3 size={14} />Nessun servizio</span>}
            </div>
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <button onClick={() => contractDrawer.open(c.id)} className="w-11 h-11 grid place-items-center rounded-lg hover:bg-slate-100" aria-label="Modifica appalto"><Pencil size={18} /></button>
              <button onClick={() => remove(c)} className="w-11 h-11 grid place-items-center rounded-lg hover:bg-red-50 text-red-600" aria-label="Elimina appalto"><Trash2 size={18} /></button>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && <EmptyState text="Nessun appalto corrisponde alla ricerca" />}

      {contractDrawer.isOpen && <Modal title={editing ? 'Modifica appalto' : 'Nuovo appalto'} onClose={contractDrawer.close}><ContractForm initial={editing} onSubmit={save} saving={saving} /></Modal>}
    </div>
  );
}

import db from '@/db';

import { useState } from 'react';
import { Plus, Phone, Pencil, Trash2, Building2, MessageCircle } from 'lucide-react';

import { useAuth } from '@/AuthContext';
import useOperationsData from '@/useOperationsData';
import useDrawerParam from '@/hooks/useDrawerParam';
import PullToRefresh from '@/PullToRefresh';
import EmployeeForm from '@/EmployeeForm';
import WhatsAppProgramModal from '@/WhatsAppProgramModal';
import { EmptyState, Loading, Modal, PageHeader, StatusBadge } from '@/common';
import ExportButton from '@/ExportButton';
import { fileMonthSuffix } from '@/reportCalc';
import { nextEmpCode } from '@/codes';

export default function Dipendenti() {
  const { user } = useAuth();
  const { employees, contracts, shifts, loading, reload } = useOperationsData();
  const empDrawer = useDrawerParam('employee');
  const waDrawer = useDrawerParam('whatsapp');
  const [saving, setSaving] = useState(false);
  const editing = empDrawer.value && empDrawer.value !== 'new' ? employees.find(e => e.id === empDrawer.value) || null : null;
  const waEmployee = waDrawer.value ? employees.find(e => e.id === waDrawer.value) || null : null;

  const save = async data => {
    setSaving(true);
    if (editing) { await db.entities.Employee.update(editing.id, data); } else { await db.entities.Employee.create({ ...data, code: nextEmpCode(employees) }); }
    setSaving(false); empDrawer.close(); reload();
  };
  const remove = async e => { if (window.confirm(`Eliminare ${e.first_name} ${e.last_name}?`)) { await db.entities.Employee.delete(e.id); reload(); } };
  if (loading) return <Loading />;

  const exportSheets = [{
    name: 'Dipendenti',
    rows: [
      ['Codice', 'Cognome', 'Nome', 'Telefono', 'Stato', 'Costo orario (€)', 'Appalti assegnati'],
      ...employees.map(e => [
        e.code || '', e.last_name, e.first_name, e.phone,
        e.status === 'active' ? 'Attivo' : 'Inattivo',
        e.hourly_cost || '',
        (e.contract_ids || []).map(id => contracts.find(c => c.id === id)?.site_name).filter(Boolean).join(', ')
      ])
    ]
  }];

  return (
    <PullToRefresh onRefresh={reload}>
      <div className="p-4 sm:p-6 lg:p-10 max-w-[1500px] mx-auto">
        <PageHeader eyebrow="Squadra" title="Dipendenti" description="Personale operativo e appalti assegnati." action={<div className="flex gap-2"><ExportButton sheets={exportSheets} filename={`PuliGo_Dipendenti_${fileMonthSuffix()}.xlsx`} /><button onClick={() => empDrawer.open('new')} className="flex gap-2 bg-[#163f3d] text-white px-4 py-2.5 rounded-xl font-semibold text-sm"><Plus size={18} />Nuovo dipendente</button></div>} />

        <div className="hidden lg:block bg-white border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-left bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="p-4">Codice</th><th>Dipendente</th><th>Telefono</th><th>Appalti fissi</th><th>Stato</th><th></th></tr></thead>
              <tbody>{employees.map(e => <tr key={e.id} className="border-t">
                <td className="p-4 font-mono text-xs text-slate-500">{e.code || '—'}</td>
                <td><b>{e.last_name} {e.first_name}</b></td>
                <td><span className="flex gap-2 text-slate-600"><Phone size={15} />{e.phone}</span></td>
                <td><div className="flex gap-1 flex-wrap">{(e.contract_ids || []).map(id => { const c = contracts.find(x => x.id === id); return c ? <span key={id} className="flex gap-1 bg-slate-100 rounded-md px-2 py-1 text-xs"><Building2 size={13} />{c.site_name}</span> : null; })}{!e.contract_ids?.length && <span className="text-slate-400">Nessuno</span>}</div></td>
                <td><StatusBadge active={e.status === 'active'} /></td>
                <td><div className="flex justify-end gap-2 pr-4">
                  <button onClick={() => waDrawer.open(e.id)} className="w-11 h-11 grid place-items-center hover:bg-emerald-50 text-emerald-700 rounded-lg" aria-label="Invia programma WhatsApp"><MessageCircle size={18} /></button>
                  <button onClick={() => empDrawer.open(e.id)} className="w-11 h-11 grid place-items-center hover:bg-slate-100 rounded-lg" aria-label="Modifica dipendente"><Pencil size={18} /></button>
                  <button onClick={() => remove(e)} className="w-11 h-11 grid place-items-center hover:bg-red-50 text-red-600 rounded-lg" aria-label="Elimina dipendente"><Trash2 size={18} /></button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!employees.length && <EmptyState text="Nessun dipendente presente" />}
        </div>

        <div className="lg:hidden space-y-3">
          {employees.map(e => (
            <article key={e.id} className="bg-white border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{e.code || '—'}</span>
                    <StatusBadge active={e.status === 'active'} />
                  </div>
                  <h2 className="text-base font-semibold mt-1 truncate">{e.last_name} {e.first_name}</h2>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1"><Phone size={13} />{e.phone}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => waDrawer.open(e.id)} className="w-11 h-11 grid place-items-center hover:bg-emerald-50 text-emerald-700 rounded-lg" aria-label="Invia programma WhatsApp"><MessageCircle size={18} /></button>
                  <button onClick={() => empDrawer.open(e.id)} className="w-11 h-11 grid place-items-center hover:bg-slate-100 rounded-lg" aria-label="Modifica dipendente"><Pencil size={18} /></button>
                  <button onClick={() => remove(e)} className="w-11 h-11 grid place-items-center hover:bg-red-50 text-red-600 rounded-lg" aria-label="Elimina dipendente"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(e.contract_ids || []).map(id => { const c = contracts.find(x => x.id === id); return c ? <span key={id} className="flex gap-1 bg-slate-100 rounded-md px-2 py-1 text-xs"><Building2 size={13} />{c.site_name}</span> : null; })}
                {!e.contract_ids?.length && <span className="text-xs text-slate-400">Nessun appalto fisso</span>}
              </div>
            </article>
          ))}
          {!employees.length && <EmptyState text="Nessun dipendente presente" />}
        </div>

        {empDrawer.isOpen && <Modal title={editing ? 'Modifica dipendente' : 'Nuovo dipendente'} onClose={empDrawer.close}><EmployeeForm initial={editing} contracts={contracts} onSubmit={save} saving={saving} /></Modal>}
        {waEmployee && <WhatsAppProgramModal employee={waEmployee} shifts={shifts} contracts={contracts} currentUser={user} onClose={waDrawer.close} />}
      </div>
    </PullToRefresh>
  );
}

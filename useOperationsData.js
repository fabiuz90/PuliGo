const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useCallback, useEffect, useState } from 'react';

import { nextEmpCode, nextContractCode } from '@/lib/codes';

export default function useOperationsData() {
  const [data, setData] = useState({ contracts: [], employees: [], shifts: [] });
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const [contracts, employees, shifts] = await Promise.all([
      db.entities.Contract.list('-created_date'),
      db.entities.Employee.list('last_name'),
      db.entities.Shift.list('date')
    ]);
    setData({ contracts, employees, shifts });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Backfill missing codes for existing records (idempotent — only updates records without a code).
  useEffect(() => {
    if (loading) return;
    const empMissing = data.employees.filter((e) => !e.code);
    const conMissing = data.contracts.filter((c) => !c.code);
    if (empMissing.length) {
      let pool = data.employees;
      const updates = empMissing.map((e) => {
        const code = nextEmpCode(pool);
        pool = [...pool, { ...e, code }];
        return { id: e.id, code };
      });
      db.entities.Employee.bulkUpdate(updates).then(() => load()).catch(() => {});
    }
    if (conMissing.length) {
      let pool = data.contracts;
      const updates = conMissing.map((c) => {
        const code = nextContractCode(pool);
        pool = [...pool, { ...c, code }];
        return { id: c.id, code };
      });
      db.entities.Contract.bulkUpdate(updates).then(() => load()).catch(() => {});
    }
  }, [loading, data.employees, data.contracts, load]);

  // Optimistic shift mutations — update local state first for instant calendar feedback.
  const createShiftOpt = async (form) => {
    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setData(d => ({ ...d, shifts: [...d.shifts, { ...form, id: tempId }] }));
    try {
      const created = await db.entities.Shift.create(form);
      setData(d => ({ ...d, shifts: d.shifts.map(s => s.id === tempId ? created : s) }));
      return created;
    } catch (e) { await load(); throw e; }
  };
  const updateShiftOpt = async (id, patch) => {
    setData(d => ({ ...d, shifts: d.shifts.map(s => s.id === id ? { ...s, ...patch } : s) }));
    try { return await db.entities.Shift.update(id, patch); }
    catch (e) { await load(); throw e; }
  };
  const deleteShiftOpt = async (id) => {
    setData(d => ({ ...d, shifts: d.shifts.filter(s => s.id !== id) }));
    try { await db.entities.Shift.delete(id); }
    catch (e) { await load(); throw e; }
  };
  const bulkCreateShiftsOpt = async (records) => {
    const temps = records.map((r, i) => ({ ...r, id: `tmp_${Date.now()}_${i}` }));
    setData(d => ({ ...d, shifts: [...d.shifts, ...temps] }));
    try {
      const created = await db.entities.Shift.bulkCreate(records);
      const ids = new Set(temps.map(t => t.id));
      setData(d => ({ ...d, shifts: [...d.shifts.filter(s => !ids.has(s.id)), ...created] }));
      return created;
    } catch (e) { await load(); throw e; }
  };
  const deleteShiftsOpt = async (ids) => {
    const idset = new Set(ids);
    setData(d => ({ ...d, shifts: d.shifts.filter(s => !idset.has(s.id)) }));
    try { await db.entities.Shift.deleteMany({ id: { $in: ids } }); }
    catch (e) { await load(); throw e; }
  };

  return { ...data, loading, reload: load, createShiftOpt, updateShiftOpt, deleteShiftOpt, bulkCreateShiftsOpt, deleteShiftsOpt };
}
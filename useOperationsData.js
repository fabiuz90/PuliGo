import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/supabase';

import { nextEmpCode, nextContractCode } from '@/codes';

export default function useOperationsData() {
  const [data, setData] = useState({
    absences: [],
    contracts: [],
    employees: [],
    shifts: [],
  });

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const loadTable = async (table, query) => {
        const { data: rows, error } = await query;

        if (error) {
          console.error(`[Supabase] Failed to load table: ${table}`, {
            table,
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          return { table, error };
        }

        return { table, rows: rows || [] };
      };

      const results = await Promise.all([
        loadTable(
          'contracts',
          supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false })
        ),
        loadTable(
          'employees',
          supabase
            .from('employees')
            .select('*')
            .order('last_name', { ascending: true })
        ),
        loadTable(
          'shifts',
          supabase
            .from('shifts')
            .select('*')
            .order('date', { ascending: true })
        ),
        loadTable(
          'absences',
          supabase
            .from('absences')
            .select('*')
            .order('start_date', { ascending: true })
            .order('start_time', { ascending: true })
        ),
      ]);

      setData((current) => {
        const next = { ...current };

        results.forEach(({ table, rows, error }) => {
          if (error) return;
          next[table] = rows;
        });

        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Backfill missing employee and contract codes.
  useEffect(() => {
    if (loading) return;

    const updateMissingCodes = async () => {
      const empMissing = data.employees.filter((employee) => !employee.code);
      const contractMissing = data.contracts.filter((contract) => !contract.code);

      if (empMissing.length) {
        let pool = data.employees;

        const updates = empMissing.map((employee) => {
          const code = nextEmpCode(pool);

          pool = [
            ...pool,
            {
              ...employee,
              code,
            },
          ];

          return {
            id: employee.id,
            code,
          };
        });

        try {
          await Promise.all(
            updates.map(({ id, code }) =>
              supabase
                .from('employees')
                .update({ code })
                .eq('id', id)
            )
          );
        } catch {
          // Ignore code backfill errors.
        }
      }

      if (contractMissing.length) {
        let pool = data.contracts;

        const updates = contractMissing.map((contract) => {
          const code = nextContractCode(pool);

          pool = [
            ...pool,
            {
              ...contract,
              code,
            },
          ];

          return {
            id: contract.id,
            code,
          };
        });

        try {
          await Promise.all(
            updates.map(({ id, code }) =>
              supabase
                .from('contracts')
                .update({ code })
                .eq('id', id)
            )
          );
        } catch {
          // Ignore code backfill errors.
        }
      }

      if (empMissing.length || contractMissing.length) {
        await load();
      }
    };

    updateMissingCodes();
  }, [loading, data.employees, data.contracts, load]);

  // Create shift with optimistic UI update.
  const createShiftOpt = async (form) => {
    const tempId = `tmp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    setData((current) => ({
      ...current,
      shifts: [
        ...current.shifts,
        {
          ...form,
          id: tempId,
        },
      ],
    }));

    try {
      const { data: created, error } = await supabase
        .from('shifts')
        .insert(form)
        .select()
        .single();

      if (error) throw error;

      setData((current) => ({
        ...current,
        shifts: current.shifts.map((shift) =>
          shift.id === tempId ? created : shift
        ),
      }));

      return created;
    } catch (error) {
      await load();
      throw error;
    }
  };

  // Update shift with optimistic UI update.
  const updateShiftOpt = async (id, patch) => {
    setData((current) => ({
      ...current,
      shifts: current.shifts.map((shift) =>
        shift.id === id
          ? {
              ...shift,
              ...patch,
            }
          : shift
      ),
    }));

    try {
      const { data: updated, error } = await supabase
        .from('shifts')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return updated;
    } catch (error) {
      await load();
      throw error;
    }
  };

  // Delete one shift with optimistic UI update.
  const deleteShiftOpt = async (id) => {
    setData((current) => ({
      ...current,
      shifts: current.shifts.filter((shift) => shift.id !== id),
    }));

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      await load();
      throw error;
    }
  };

  // Create multiple shifts.
  const bulkCreateShiftsOpt = async (records) => {
    const temps = records.map((record, index) => ({
      ...record,
      id: `tmp_${Date.now()}_${index}`,
    }));

    setData((current) => ({
      ...current,
      shifts: [...current.shifts, ...temps],
    }));

    try {
      const { data: created, error } = await supabase
        .from('shifts')
        .insert(records)
        .select();

      if (error) throw error;

      const temporaryIds = new Set(
        temps.map((shift) => shift.id)
      );

      setData((current) => ({
        ...current,
        shifts: [
          ...current.shifts.filter(
            (shift) => !temporaryIds.has(shift.id)
          ),
          ...(created || []),
        ],
      }));

      return created || [];
    } catch (error) {
      await load();
      throw error;
    }
  };

  // Delete multiple shifts.
  const deleteShiftsOpt = async (ids) => {
    const idSet = new Set(ids);

    setData((current) => ({
      ...current,
      shifts: current.shifts.filter(
        (shift) => !idSet.has(shift.id)
      ),
    }));

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      await load();
      throw error;
    }
  };

  return {
    ...data,
    loading,
    reload: load,
    createShiftOpt,
    updateShiftOpt,
    deleteShiftOpt,
    bulkCreateShiftsOpt,
    deleteShiftsOpt,
  };
}
import { useCallback, useEffect, useState } from 'react';
import db from '@/db';

import { nextEmpCode, nextContractCode } from '@/lib/codes';

export default function useOperationsData() {
  const [data, setData] = useState({
    contracts: [],
    employees: [],
    shifts: [],
  });

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [contracts, employees, shifts] = await Promise.all([
        db.entities.Contract.list('-created_date'),
        db.entities.Employee.list('last_name'),
        db.entities.Shift.list('date'),
      ]);

      setData({
        contracts,
        employees,
        shifts,
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
          await db.entities.Employee.bulkUpdate(updates);
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
          await db.entities.Contract.bulkUpdate(updates);
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
      const created = await db.entities.Shift.create(form);

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
      return await db.entities.Shift.update(id, patch);
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
      await db.entities.Shift.delete(id);
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
      const created = await db.entities.Shift.bulkCreate(records);

      const temporaryIds = new Set(
        temps.map((shift) => shift.id)
      );

      setData((current) => ({
        ...current,
        shifts: [
          ...current.shifts.filter(
            (shift) => !temporaryIds.has(shift.id)
          ),
          ...created,
        ],
      }));

      return created;
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
      await db.entities.Shift.deleteMany({
        id: {
          $in: ids,
        },
      });
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

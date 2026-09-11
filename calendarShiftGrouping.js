const normalizeTime = (time) => String(time || '').slice(0, 5);
const toMinutes = (time) => {
  const [h = 0, m = 0] = String(time || '00:00').split(':').map(Number);
  return h * 60 + m;
};

const getWeekdayFromDateKey = (dateKey) => {
  const [year, month, day] = (dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getDay();
};

const getEmployeeDisplayName = (employeeId, employees = []) => {
  const employee = employees.find((person) => String(person.id) === String(employeeId));
  if (!employee) return '';
  return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
};

const getRequirementForGroup = (contract, dateKey, start_time, end_time) => {
  if (!contract) return null;
  const weekday = getWeekdayFromDateKey(dateKey);
  if (weekday === null) return null;

  return (contract.service_requirements || []).find((requirement) => {
    const sameDay = Number(requirement.day_of_week) === weekday;
    const sameStart = normalizeTime(requirement.start_time) === normalizeTime(start_time);
    const sameEnd = normalizeTime(requirement.end_time) === normalizeTime(end_time);
    return sameDay && sameStart && sameEnd;
  }) || null;
};

export function buildDayShiftCards({ shifts = [], contracts = [], dayKey, includeUnassigned = true, employees = [] }) {
  const groupedByKey = new Map();

  for (const shift of shifts.filter((item) => item.date === dayKey)) {
    const key = `${shift.contract_id}::${dayKey}::${normalizeTime(shift.start_time)}::${normalizeTime(shift.end_time)}`;
    if (!groupedByKey.has(key)) {
      groupedByKey.set(key, {
        id: key,
        contract_id: shift.contract_id,
        date: dayKey,
        start_time: normalizeTime(shift.start_time),
        end_time: normalizeTime(shift.end_time),
        realShifts: [],
        virtual: false,
      });
    }
    groupedByKey.get(key).realShifts.push(shift);
  }

  if (includeUnassigned) {
    for (const contract of contracts.filter((item) => item.status === 'active')) {
      for (const requirement of contract.service_requirements || []) {
        const requirementDay = Number(requirement.day_of_week);
        const requirementStart = normalizeTime(requirement.start_time);
        const requirementEnd = normalizeTime(requirement.end_time);
        const requirementKey = `${contract.id}::${dayKey}::${requirementStart}::${requirementEnd}`;
        const weekday = getWeekdayFromDateKey(dayKey);

        if (weekday === null || requirementDay !== weekday) continue;

        if (!groupedByKey.has(requirementKey)) {
          groupedByKey.set(requirementKey, {
            id: `virtual:${requirementKey}`,
            contract_id: contract.id,
            date: dayKey,
            start_time: requirementStart,
            end_time: requirementEnd,
            realShifts: [],
            virtual: true,
            requirement,
          });
        } else {
          groupedByKey.get(requirementKey).requirement = groupedByKey.get(requirementKey).requirement || requirement;
        }
      }
    }
  }

  return Array.from(groupedByKey.values())
    .map((group) => {
      const contract = contracts.find((item) => String(item.id) === String(group.contract_id)) || null;
      const uniqueEmployees = [];
      const seenEmployeeIds = new Set();

      for (const shift of group.realShifts) {
        const employeeId = String(shift.employee_id);
        if (seenEmployeeIds.has(employeeId)) continue;
        seenEmployeeIds.add(employeeId);
        uniqueEmployees.push({
          id: shift.employee_id,
          name: getEmployeeDisplayName(shift.employee_id, employees),
          kind: 'employee',
          shift,
        });
      }

      const requirement = group.requirement || getRequirementForGroup(contract, group.date, group.start_time, group.end_time);
      const requiredCount = requirement ? Math.max(1, Number(requirement.employees_required) || 1) : Math.max(1, uniqueEmployees.length || 1);
      const assignedCount = uniqueEmployees.length;
      const missingCount = Math.max(0, requiredCount - assignedCount);

      let coverageStatus = 'covered';
      if (requirement) {
        if (assignedCount < requiredCount) {
          coverageStatus = assignedCount > 0 ? 'partial' : 'uncovered';
        }
      }

      return {
        ...group,
        contract,
        requirement,
        assignedCount,
        requiredCount,
        coverageStatus,
        hasCoverageWarning: coverageStatus === 'partial' || coverageStatus === 'uncovered',
        employees: [
          ...uniqueEmployees,
          ...Array.from({ length: missingCount }, (_, index) => ({
            id: `placeholder:${group.id}:${index}`,
            label: 'Dipendente non assegnato',
            kind: 'placeholder',
          })),
        ],
        firstShift: group.realShifts[0] || null,
      };
    })
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
}

import { addDays, format, getDay } from 'date-fns';

const minutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
export const durationLabel = (value) => value <= 0 ? '—' : `${Math.floor(value / 60)}h${value % 60 ? ` ${value % 60}m` : ''}`;

export function buildCoverage(contracts, shifts, days = 21) {
  const today = new Date();
  return Array.from({ length: days }, (_, offset) => addDays(today, offset)).flatMap(date => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return contracts.filter(c => c.status === 'active').flatMap(contract =>
      (contract.service_requirements || []).filter(r => r.day_of_week === getDay(date)).map(requirement => {
        const start = minutes(requirement.start_time), end = minutes(requirement.end_time);
        const matching = shifts.filter(s => s.contract_id === contract.id && s.date === dateKey && minutes(s.end_time) > start && minutes(s.start_time) < end);
        const assignedIds = [...new Set(matching.map(s => s.employee_id))];
        const assignedMinutes = matching.reduce((sum, s) => sum + Math.max(0, Math.min(end, minutes(s.end_time)) - Math.max(start, minutes(s.start_time))), 0);
        const neededMinutes = (end - start) * requirement.employees_required;
        const missingMinutes = Math.max(0, neededMinutes - assignedMinutes);
        const missingEmployees = Math.max(0, requirement.employees_required - assignedIds.length);
        const status = missingMinutes === 0 && missingEmployees === 0 ? 'covered' : assignedMinutes > 0 ? 'partial' : 'uncovered';
        return { contract, requirement, date: dateKey, matching, assignedIds, missingMinutes, missingEmployees, status };
      })
    );
  });
}
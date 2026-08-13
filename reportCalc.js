import { getDay } from 'date-fns';

// Single source of truth for all monthly report & margin calculations.
// Hours are always derived from actual shift start/end times.

const toMin = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};

// Hours worked in a single shift (clamped to >= 0).
export const shiftHours = (s) => Math.max(0, (toMin(s.end_time) - toMin(s.start_time)) / 60);

// "08-2026" style label for filenames.
export const monthLabel = (year, month) => `${String(month + 1).padStart(2, '0')}-${year}`;

export const eur = (v) => (v == null || isNaN(v) ? '—' : `€${Number(v).toFixed(2)}`);

// Filename suffixes for Excel exports.
export const fileMonthSuffix = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};
export const fileDateSuffix = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

export const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export const yearsList = (base) => [base - 2, base - 1, base, base + 1, base + 2];

// Filter shifts belonging to a given month (0-indexed month).
export function shiftsInMonth(shifts, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  return (shifts || []).filter((s) => (s.date || '').startsWith(prefix));
}

// Full monthly report: totals, per-employee, per-appalto, cross breakdown.
export function buildMonthlyReport(shifts, employees, contracts, year, month) {
  const monthShifts = shiftsInMonth(shifts, year, month);
  const empById = new Map((employees || []).map((e) => [e.id, e]));
  const conById = new Map((contracts || []).map((c) => [c.id, c]));
  const byEmployee = new Map();
  const byAppalto = new Map();
  let totalHours = 0;
  let totalShifts = 0;
  const workingDays = new Set();

  monthShifts.forEach((s) => {
    const h = shiftHours(s);
    const emp = empById.get(s.employee_id);
    const cost = (emp && emp.hourly_cost ? emp.hourly_cost : 0) * h;
    totalHours += h;
    totalShifts += 1;
    workingDays.add(s.date);

    if (!byEmployee.has(s.employee_id)) {
      byEmployee.set(s.employee_id, { employee: emp, hours: 0, shifts: 0, cost: 0, days: new Set(), byAppalto: new Map() });
    }
    const er = byEmployee.get(s.employee_id);
    er.hours += h;
    er.shifts += 1;
    er.cost += cost;
    er.days.add(s.date);
    er.byAppalto.set(s.contract_id, (er.byAppalto.get(s.contract_id) || 0) + h);

    if (!byAppalto.has(s.contract_id)) {
      const contract = conById.get(s.contract_id);
      byAppalto.set(s.contract_id, { contract, hours: 0, shifts: 0, cost: 0, revenue: (contract && contract.monthly_revenue) || 0, byEmployee: new Map() });
    }
    const ar = byAppalto.get(s.contract_id);
    ar.hours += h;
    ar.shifts += 1;
    ar.cost += cost;
    ar.byEmployee.set(s.employee_id, (ar.byEmployee.get(s.employee_id) || 0) + h);
  });

  byAppalto.forEach((a) => {
    a.marginEur = a.revenue - a.cost;
    a.marginPct = a.revenue > 0 ? (a.marginEur / a.revenue) * 100 : null;
  });

  return { monthShifts, totalHours, totalShifts, workingDays: workingDays.size, byEmployee, byAppalto };
}

// Uncovered hours / gaps for a specific month, based on service requirements.
export function buildMonthGaps(contracts, shifts, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gaps = [];
  let uncoveredMinutes = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    (contracts || []).filter((c) => c.status === 'active').forEach((contract) => {
      (contract.service_requirements || []).filter((r) => r.day_of_week === getDay(date)).forEach((req) => {
        const start = toMin(req.start_time);
        const end = toMin(req.end_time);
        const matching = (shifts || []).filter(
          (s) => s.contract_id === contract.id && s.date === dateKey && toMin(s.end_time) > start && toMin(s.start_time) < end
        );
        const assignedMinutes = matching.reduce(
          (sum, s) => sum + Math.max(0, Math.min(end, toMin(s.end_time)) - Math.max(start, toMin(s.start_time))),
          0
        );
        const needed = (end - start) * req.employees_required;
        const missing = Math.max(0, needed - assignedMinutes);
        if (missing > 0) {
          uncoveredMinutes += missing;
          gaps.push({ contract, date: dateKey, start_time: req.start_time, end_time: req.end_time, missingMinutes: missing });
        }
      });
    });
  }
  return { gaps, uncoveredHours: uncoveredMinutes / 60 };
}

// Per-appalto margins for a month: revenue, personnel hours/cost, margin € and %.
export function buildAppaltoMargins(shifts, employees, contracts, year, month) {
  const monthShifts = shiftsInMonth(shifts, year, month);
  const empById = new Map((employees || []).map((e) => [e.id, e]));
  const byAppalto = new Map();

  monthShifts.forEach((s) => {
    const h = shiftHours(s);
    const emp = empById.get(s.employee_id);
    const cost = (emp && emp.hourly_cost ? emp.hourly_cost : 0) * h;
    if (!byAppalto.has(s.contract_id)) byAppalto.set(s.contract_id, { hours: 0, cost: 0, byEmployee: new Map() });
    const a = byAppalto.get(s.contract_id);
    a.hours += h;
    a.cost += cost;
    if (!a.byEmployee.has(s.employee_id)) a.byEmployee.set(s.employee_id, { employee: emp, hours: 0, cost: 0 });
    const ed = a.byEmployee.get(s.employee_id);
    ed.hours += h;
    ed.cost += cost;
  });

  return (contracts || []).map((c) => {
    const data = byAppalto.get(c.id) || { hours: 0, cost: 0, byEmployee: new Map() };
    const revenue = c.monthly_revenue || 0;
    const marginEur = revenue - data.cost;
    const marginPct = revenue > 0 ? (marginEur / revenue) * 100 : null;
    return { contract: c, hours: data.hours, cost: data.cost, revenue, marginEur, marginPct, employees: [...data.byEmployee.values()] };
  });
}
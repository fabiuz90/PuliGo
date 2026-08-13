import { addDays, format, startOfWeek } from 'date-fns';
import { parseISO } from 'date-fns';

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// Normalize a phone number for WhatsApp wa.me links (digits only, with country code).
// Adds the Italian prefix (+39) when no international code is present.
export function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/[^\d+]/g, '');
  if (!p) return null;
  if (p.startsWith('+')) p = p.slice(1);
  else if (p.startsWith('00')) p = p.slice(2);
  // Italian local number without country code
  if (p.length <= 10 && (p.startsWith('0') || p.startsWith('3'))) p = '39' + p;
  if (!/^\d+$/.test(p)) return null;
  return p;
}

// Compute the Monday-start week for the selector option.
export function weekStartFor(weekOption, customDate) {
  const base =
    weekOption === 'next'
      ? addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7)
      : weekOption === 'custom'
      ? parseISO(customDate)
      : new Date();
  return startOfWeek(base, { weekStartsOn: 1 });
}

// Build the weekly schedule text message for an employee.
export function buildWeekProgramMessage(employee, shifts, contracts, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];
  const header = `📅 PROGRAMMA SETTIMANA DAL ${format(weekStart, 'dd/MM/yyyy')} AL ${format(weekEnd, 'dd/MM/yyyy')}`;
  const name = `${employee.first_name} ${employee.last_name}`;

  const blocks = days.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    const dayShifts = shifts
      .filter((s) => s.employee_id === employee.id && s.date === key)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    const label = `${DAY_NAMES[d.getDay()]} ${format(d, 'dd/MM')}`;
    if (!dayShifts.length) return `${label}\n\nRIPOSO`;
    const body = dayShifts
      .map((s) => {
        const c = contracts.find((x) => x.id === s.contract_id);
        const lines = [`${s.start_time}–${s.end_time} — ${c?.site_name || 'Appalto'}`];
        if (c?.address) lines.push(c.address);
        return lines.join('\n');
      })
      .join('\n\n');
    return `${label}\n\n${body}`;
  });

  return `${header}\n\n${name}\n\n${blocks.join('\n\n')}\n\nBuon lavoro!`;
}
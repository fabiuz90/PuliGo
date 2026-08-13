import { addWeeks, format, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function WeekNav({ week, setWeek }) {
  const start = startOfWeek(week, { weekStartsOn: 1 });
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setWeek(addWeeks(week, -1))} className="p-2 border rounded-lg bg-white" aria-label="Settimana precedente"><ChevronLeft size={18} /></button>
      <button onClick={() => setWeek(new Date())} className="px-3 py-2 border rounded-lg bg-white text-sm font-semibold">Oggi</button>
      <button onClick={() => setWeek(addWeeks(week, 1))} className="p-2 border rounded-lg bg-white" aria-label="Settimana successiva"><ChevronRight size={18} /></button>
      <b className="ml-2 text-sm">Settimana del {format(start, 'dd/MM/yyyy')}</b>
    </div>
  );
}
import { useEffect, useRef } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { layoutOverlappingShifts, toMin } from '@/shiftLayout';
import { appaltoColor } from '@/appaltoColors';
import { getShiftAbsenceConflict } from '@/absenceConflict';

const START_HOUR = 4; // first visible hour of the calendar
const HOURS = Array.from({ length: 24 - START_HOUR }, (_, i) => i + START_HOUR); // 4..23
const HOUR_PX = 56; // height of each hour row in px — single shared vertical scale
const MIN_CARD_WIDTH = 120; // minimum readable card width in px

export default function WeekCalendar({ shifts, contracts, employees, absences = [], week, onEdit, onDelete, appaltoColors }) {
  const scrollRef = useRef(null);
  const todayRef = useRef(null);
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayRef.current.offsetLeft - 8);
    }
  }, []);
  const start = startOfWeek(week, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const gridHeight = (24 - START_HOUR) * HOUR_PX;

  // Pre-compute the lane layout for each day.
  const dayLayouts = days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const dayShifts = shifts.filter((s) => s.date === key);
    const laid = layoutOverlappingShifts(dayShifts);
    const maxLanes = laid.reduce((m, x) => Math.max(m, x.totalColumns), 1);
    return { key, day, laid, maxLanes };
  });

  return (
    <div className="bg-white border rounded-2xl overflow-hidden flex flex-col">
      <div className="flex">
        {/* Hours gutter — fixed, stays put during horizontal scroll */}
        <div className="w-16 shrink-0 border-r" style={{ minWidth: 64 }}>
          <div className="h-14 border-b bg-slate-50" />
          <div className="relative" style={{ height: gridHeight }}>
            {HOURS.map((h) => (
              <div key={h} className="absolute left-0 right-0 pr-2 text-right" style={{ top: (h - START_HOUR) * HOUR_PX, height: HOUR_PX }}>
                <span className="text-[11px] text-slate-400 -mt-2 block">{h.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day columns — scroll horizontally when a day needs more width */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div className="flex">
            {dayLayouts.map(({ key, day, laid, maxLanes }) => {
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  ref={isToday ? todayRef : undefined}
                  className="border-r last:border-r-0"
                  style={{ flex: '1 1 0%', minWidth: maxLanes * MIN_CARD_WIDTH }}
                >
                  {/* Header */}
                  <div className={`h-14 border-b flex flex-col items-center justify-center ${isToday ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <p className="text-xs uppercase text-slate-400">{format(day, 'EEE', { locale: it })}</p>
                    <b className={isToday ? 'text-emerald-700' : ''}>{format(day, 'd MMM', { locale: it })}</b>
                  </div>
                  {/* Hour grid + shifts share the same absolute coordinate system */}
                  <div className="relative overflow-hidden" style={{ height: gridHeight }}>
                    {HOURS.map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-b border-slate-100" style={{ top: (h - START_HOUR) * HOUR_PX, height: HOUR_PX }} />
                    ))}
                    {laid.map(({ shift: s, lane, spanEnd, totalColumns }) => {
                      const c = contracts.find((x) => x.id === s.contract_id);
                      const e = employees.find((x) => x.id === s.employee_id);
                      const absence = getShiftAbsenceConflict(s, absences);
                      const top = ((toMin(s.start_time) / 60) - START_HOUR) * HOUR_PX;
                      const height = ((toMin(s.end_time) - toMin(s.start_time)) / 60) * HOUR_PX;
                      const span = spanEnd - lane + 1;
                      const leftPct = (lane / totalColumns) * 100;
                      const widthPct = (span / totalColumns) * 100;
                      const color = appaltoColor(appaltoColors?.get(s.contract_id));
                      return (
                        <div
                          key={s.id}
                          className={`absolute rounded-lg text-white px-2 py-1 text-[11px] overflow-hidden group shadow-sm hover:shadow-md hover:z-10 ${absence ? 'border-2 border-red-500' : ''}`}
                          title={absence ? `⚠️ Dipendente assente: ${absence.type}` : undefined}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: color,
                          }}
                        >
                          <b className="block truncate">{s.start_time}–{s.end_time}</b>
                          <span className="block truncate opacity-90">{c?.site_name}</span>
                          {absence && <span className="block truncate font-semibold text-red-100">⚠️ Dipendente assente</span>}
                          {height > 44 && (
                            <span className="block truncate opacity-70">
                              {e?.first_name} {e?.last_name}
                            </span>
                          )}
                          <div className="flex gap-1.5 absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100">
                            <button onClick={() => onEdit(s)} className="bg-white/20 rounded p-1.5" aria-label="Modifica turno"><Pencil size={12} /></button>
                            <button onClick={() => onDelete(s)} className="bg-white/20 rounded p-1.5" aria-label="Elimina turno"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { layoutOverlappingShifts, toMin } from '@/shiftLayout';
import { getShiftAbsenceConflict } from '@/absenceConflict';
import { buildDayShiftCards } from '@/calendarShiftGrouping';

const START_HOUR = 4; // first visible hour of the calendar
const HOURS = Array.from({ length: 24 - START_HOUR }, (_, i) => i + START_HOUR); // 4..23
const HOUR_PX = 56; // height of each hour row in px — single shared vertical scale
const MIN_CARD_WIDTH = 120; // minimum readable card width in px
const MIN_CARD_HEIGHT = 80; // enough space for time, site, counter, and warning
const displayTime = (time) => String(time || '').slice(0, 5);
const overlaps = (leftStart, leftEnd, rightStart, rightEnd) =>
  toMin(leftStart) < toMin(rightEnd) && toMin(leftEnd) > toMin(rightStart);

export default function WeekCalendar({ shifts, contracts, employees, absences = [], week, onEdit, onDelete, includeUnassigned = true }) {
  const topScrollRef = useRef(null);
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const todayRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;

    const updateContentWidth = () => setContentWidth(content.scrollWidth);
    updateContentWidth();
    const observer = new ResizeObserver(updateContentWidth);
    observer.observe(content);
    return () => observer.disconnect();
  }, [shifts, contracts, employees, week, includeUnassigned]);

  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const left = Math.max(0, todayRef.current.offsetLeft - 8);
      scrollRef.current.scrollLeft = left;
      if (topScrollRef.current) topScrollRef.current.scrollLeft = left;
    }
  }, [contentWidth]);
  const start = startOfWeek(week, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const gridHeight = (24 - START_HOUR) * HOUR_PX;

  // Pre-compute the lane layout for each day.
  const dayLayouts = days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const groupedCards = buildDayShiftCards({
      shifts,
      contracts,
      dayKey: key,
      includeUnassigned,
      employees,
    });
    const laid = layoutOverlappingShifts(groupedCards);
    const maxLanes = laid.reduce((m, x) => Math.max(m, x.totalColumns), 1);
    return { key, day, laid, maxLanes };
  });

  return (
    <div className="bg-white border rounded-2xl overflow-hidden flex flex-col">
      <div className="flex">
        <div className="w-16 shrink-0 border-r" style={{ minWidth: 64 }} />
        <div
          className="flex-1 min-w-0 overflow-x-auto h-4"
          ref={topScrollRef}
          onScroll={(event) => {
            if (scrollRef.current && scrollRef.current.scrollLeft !== event.currentTarget.scrollLeft) {
              scrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          aria-label="Scorrimento orizzontale calendario"
        >
          <div style={{ width: contentWidth || '100%', height: 1 }} />
        </div>
      </div>

      <div className="flex">
        {/* Hours gutter stays fixed while the day columns scroll horizontally. */}
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

        <div
          className="flex-1 min-w-0 overflow-x-auto"
          ref={scrollRef}
          onScroll={(event) => {
            if (topScrollRef.current && topScrollRef.current.scrollLeft !== event.currentTarget.scrollLeft) {
              topScrollRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
        >
          <div className="flex" ref={contentRef}>
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
                      const absence = s.virtual || !s.realShifts?.length ? null : getShiftAbsenceConflict(s.realShifts[0], absences);
                      const hasCoverageWarning = s.coverageStatus === 'partial' || s.coverageStatus === 'uncovered';
                      const top = ((toMin(s.start_time) / 60) - START_HOUR) * HOUR_PX;
                      const height = ((toMin(s.end_time) - toMin(s.start_time)) / 60) * HOUR_PX;
                      const visualHeight = Math.max(height, MIN_CARD_HEIGHT);
                      const span = spanEnd - lane + 1;
                      const leftPct = (lane / totalColumns) * 100;
                      const widthPct = (span / totalColumns) * 100;
                      const statusColor = s.coverageStatus === 'uncovered'
                        ? '#fee2e2'
                        : s.coverageStatus === 'partial'
                        ? '#ffedd5'
                        : '#dcfce7';
                      const cardActionShift = s.realShifts?.[0] || s;
                      return (
                        <div
                          key={s.id}
                          className={`absolute rounded-lg border border-slate-300 text-slate-700 px-2 py-1 text-[11px] overflow-hidden group shadow-sm hover:shadow-md hover:z-10 ${s.virtual ? 'cursor-pointer' : ''}`}
                          title={s.virtual ? 'Apri assegnazione turno' : absence ? `⚠️ Dipendente assente: ${absence.type}` : undefined}
                          onClick={s.virtual ? () => onEdit(s) : undefined}
                          role={s.virtual ? 'button' : undefined}
                          tabIndex={s.virtual ? 0 : undefined}
                          style={{
                            top,
                            height,
                            minHeight: MIN_CARD_HEIGHT,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: statusColor,
                          }}
                        >
                          <b className="block truncate">{displayTime(s.start_time)}–{displayTime(s.end_time)}</b>
                          <span className="block truncate opacity-90">{c?.site_name}</span>
                          {absence && <span className="block truncate font-semibold text-red-700"><AlertTriangle size={12} className="inline mr-1" />Dipendente assente</span>}
                          <span className="block truncate">{s.assignedCount}/{s.requiredCount} dipendenti assegnati</span>
                          {hasCoverageWarning && <span className="block truncate font-semibold text-red-700"><AlertTriangle size={12} className="inline mr-1" />Turno scoperto</span>}
                          {visualHeight > 96 && (s.employees || []).map((person) => (
                            person.kind === 'employee' && <span key={person.id} className="block truncate opacity-80">{person.name}</span>
                          ))}
                          {!s.virtual && <div className="flex gap-1.5 absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100">
                            <button onClick={() => onEdit(cardActionShift)} className="bg-white/20 rounded p-1.5" aria-label="Modifica turno"><Pencil size={12} /></button>
                            <button onClick={() => onDelete(cardActionShift)} className="bg-white/20 rounded p-1.5" aria-label="Elimina turno"><Trash2 size={12} /></button>
                          </div>}
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
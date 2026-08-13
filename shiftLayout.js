// Reusable overlap-layout calculation for calendar shifts.
// Implements a Google-Calendar-style lane layout:
//  - Shifts are assigned to the first available horizontal lane (column).
//  - Overlapping shifts sit side by side.
//  - Each shift expands rightward into adjacent lanes that are free during
//    its entire time span, so non-overlapping shifts reclaim the full width.
//  - Vertical position / height are NOT computed here — only horizontal placement.
//
// Input:  shifts: Array<{ id, start_time, end_time, ... }>  (times as "HH:MM")
// Output: Array<{ shift, lane, spanEnd, totalColumns }>  (one per input shift)
//   - lane:         assigned lane index (0-based)
//   - spanEnd:      rightmost lane index the shift expands into (inclusive)
//   - totalColumns: number of lanes in the shift's overlap cluster
//
// Width  = (spanEnd - lane + 1) / totalColumns
// Left   = lane / totalColumns

const toMin = (t) => {
  if (typeof t === 'number') return t;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Two shifts overlap in time when they share any instant. Touching endpoints
// (e.g. 06:00–09:00 and 09:00–12:00) do NOT overlap.
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

export function layoutOverlappingShifts(shifts) {
  if (!shifts || shifts.length === 0) return [];

  // Sort by start time, then by end time (longer first helps tighter packing).
  const sorted = [...shifts].sort((a, b) => {
    const ds = toMin(a.start_time) - toMin(b.start_time);
    if (ds !== 0) return ds;
    return toMin(a.end_time) - toMin(b.end_time);
  });

  // 1) Group shifts into clusters: a cluster is a chain of shifts where each
  //    shift overlaps (in time) with the running cluster. A cluster ends when
  //    the next shift starts at or after every shift in the cluster has ended.
  const clusters = [];
  let current = [sorted[0]];
  let clusterEnd = toMin(sorted[0].end_time);

  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i];
    if (toMin(s.start_time) < clusterEnd) {
      current.push(s);
      clusterEnd = Math.max(clusterEnd, toMin(s.end_time));
    } else {
      clusters.push(current);
      current = [s];
      clusterEnd = toMin(s.end_time);
    }
  }
  clusters.push(current);

  const result = [];

  clusters.forEach((cluster) => {
    // 2) Assign each shift to the leftmost lane whose last shift has ended.
    const laneLastEnd = []; // end time (min) of the last shift placed in each lane
    const laneEvents = [];  // all shifts placed in each lane (for span check)
    const shiftLane = new Map();

    cluster.forEach((s) => {
      let placed = false;
      for (let l = 0; l < laneLastEnd.length; l++) {
        if (toMin(s.start_time) >= laneLastEnd[l]) {
          laneLastEnd[l] = toMin(s.end_time);
          laneEvents[l].push(s);
          shiftLane.set(s.id, l);
          placed = true;
          break;
        }
      }
      if (!placed) {
        laneLastEnd.push(toMin(s.end_time));
        laneEvents.push([s]);
        shiftLane.set(s.id, laneLastEnd.length - 1);
      }
    });

    const totalColumns = laneLastEnd.length;

    // 3) Expand each shift rightward into adjacent lanes that are completely
    //    free during the shift's own time span. Stop at the first blocked lane.
    cluster.forEach((s) => {
      const lane = shiftLane.get(s.id);
      const sStart = toMin(s.start_time);
      const sEnd = toMin(s.end_time);
      let spanEnd = lane;
      for (let l = lane + 1; l < totalColumns; l++) {
        const free = !laneEvents[l].some(
          (ev) => overlaps(sStart, sEnd, toMin(ev.start_time), toMin(ev.end_time))
        );
        if (free) spanEnd = l;
        else break;
      }
      result.push({ shift: s, lane, spanEnd, totalColumns });
    });
  });

  return result;
}

export { toMin };
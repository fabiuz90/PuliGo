const toMin = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};

// Returns the first conflicting shift for the given assignment, or null.
// Two shifts conflict when same employee, same date, and time ranges overlap.
// Touching endpoints (end === start) are NOT a conflict.
export function findConflict(shifts, { employeeId, date, startTime, endTime, excludeId }) {
  if (!employeeId || !date || !startTime || !endTime) return null;
  const start = toMin(startTime);
  const end = toMin(endTime);
  if (end <= start) return null;
  return (
    (shifts || []).find(
      (s) =>
        s.id !== excludeId &&
        s.employee_id === employeeId &&
        s.date === date &&
        toMin(s.start_time) < end &&
        toMin(s.end_time) > start
    ) || null
  );
}
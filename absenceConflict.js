const toMinutes = (time) => {
  const [hours, minutes] = String(time || '0:0').split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

export function isShiftAffectedByAbsence(shift, absence) {
  if (!shift || !absence || shift.employee_id !== absence.employee_id) return false;
  if (shift.date < absence.start_date || shift.date > absence.end_date) return false;

  if (absence.type === 'ferie' || absence.type === 'malattia') return true;
  if (absence.type !== 'permesso' || shift.date !== absence.start_date) return false;

  const shiftStart = toMinutes(shift.start_time);
  const shiftEnd = toMinutes(shift.end_time);
  const absenceStart = toMinutes(absence.start_time);
  const absenceEnd = toMinutes(absence.end_time);

  return shiftStart < absenceEnd && shiftEnd > absenceStart;
}

export function getShiftAbsenceConflict(shift, absences) {
  return (absences || []).find((absence) => isShiftAffectedByAbsence(shift, absence)) || null;
}

export function getFutureAffectedShifts(employeeId, absence, shifts, today = [
  new Date().getFullYear(),
  String(new Date().getMonth() + 1).padStart(2, '0'),
  String(new Date().getDate()).padStart(2, '0'),
].join('-')) {
  return (shifts || []).filter(
    (shift) => shift.employee_id === employeeId
      && shift.date >= today
      && isShiftAffectedByAbsence(shift, absence)
  );
}
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDayShiftCards } from './calendarShiftGrouping.js';

const date = '2026-09-11';
const employees = [
  { id: 'e1', first_name: 'Maria', last_name: 'Agostinelli' },
  { id: 'e2', first_name: 'Stefania', last_name: 'Pugliese' },
  { id: 'e3', first_name: 'Paola', last_name: 'Rossi' },
];

function buildContract(id, siteName, requirementStart, requirementEnd, required = 1) {
  return {
    id,
    site_name: siteName,
    status: 'active',
    service_requirements: [{
      day_of_week: 5,
      start_time: requirementStart,
      end_time: requirementEnd,
      employees_required: required,
    }],
  };
}

test('A) 1 dipendente richiesto / 1 assegnato -> 1 card, nome del dipendente', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 1)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].employees.length, 1);
  assert.equal(cards[0].employees[0].name, 'Maria Agostinelli');
});

test('B) 2 dipendenti richiesti / 2 assegnati -> 1 card, 2 nomi', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
    { id: 2, contract_id: 'c1', employee_id: 'e2', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 2)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].assignedCount, 2);
  assert.deepEqual(cards[0].employees.map((e) => e.name), ['Maria Agostinelli', 'Stefania Pugliese']);
});

test('C) 2 dipendenti richiesti / 1 assegnato -> 1 card, 1 nome + placeholder', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 2)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].employees.map((e) => e.name || e.label), ['Maria Agostinelli', 'Dipendente non assegnato']);
});

test('D) 3 dipendenti richiesti / 1 assegnato -> 1 card, 1 nome + 2 placeholders', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 3)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].employees.filter((e) => e.kind === 'placeholder').length, 2);
  assert.equal(cards[0].employees[0].name, 'Maria Agostinelli');
});

test('E) 3 dipendenti richiesti / 3 assegnati -> 1 card, 3 nomi, nessun avviso di posto scoperto', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
    { id: 2, contract_id: 'c1', employee_id: 'e2', date, start_time: '06:00', end_time: '08:00' },
    { id: 3, contract_id: 'c1', employee_id: 'e3', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 3)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].employees.length, 3);
  assert.equal(cards[0].coverageStatus, 'covered');
  assert.equal(cards[0].hasCoverageWarning, false);
});

test('F) 2 dipendenti di appalti diversi nello stesso orario -> 2 card separate', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
    { id: 2, contract_id: 'c2', employee_id: 'e2', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 1), buildContract('c2', 'Altra sede', '06:00', '08:00', 1)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 2);
});

test('G) stesso appalto con orari diversi -> 2 card separate', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
    { id: 2, contract_id: 'c1', employee_id: 'e2', date, start_time: '08:00', end_time: '10:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 1), buildContract('c1', 'Scuola guida Tras...', '08:00', '10:00', 1)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 2);
});

test('H) same appalto same slot same turn grouping remains stable', () => {
  const shifts = [
    { id: 1, contract_id: 'c1', employee_id: 'e1', date, start_time: '06:00', end_time: '08:00' },
    { id: 2, contract_id: 'c1', employee_id: 'e2', date, start_time: '06:00', end_time: '08:00' },
    { id: 3, contract_id: 'c1', employee_id: 'e3', date, start_time: '06:00', end_time: '08:00' },
  ];
  const cards = buildDayShiftCards({ shifts, contracts: [buildContract('c1', 'Scuola guida Tras...', '06:00', '08:00', 3)], dayKey: date, includeUnassigned: true, employees });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].employees.length, 3);
});

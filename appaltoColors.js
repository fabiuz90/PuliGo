// Stable, professional color assignment for Appalti (contracts) in the Turni
// calendar and list. The SAME Appalto always gets the SAME color across the
// whole calendar, and Appalti that appear together on the same day never
// share a color (graph coloring, best-effort when the palette is exhausted).

// Medium-saturation tones — readable with white text, clearly distinguishable.
const PALETTE = [
  '#0e7490', // cyan-700
  '#1d4ed8', // blue-700
  '#7c3aed', // violet-700
  '#b45309', // amber-700
  '#be123c', // rose-700
  '#15803d', // green-700
  '#4338ca', // indigo-700
  '#a21caf', // fuchsia-700
  '#0f766e', // teal-700
  '#c2410c', // orange-700
];

// Build a stable contract_id -> palette index map from ALL shifts.
// Deterministic: same data => same assignment every load.
export function buildAppaltoColorMap(shifts) {
  const ids = new Set();
  const byDay = new Map();
  (shifts || []).forEach((s) => {
    if (!s.contract_id) return;
    ids.add(s.contract_id);
    if (!byDay.has(s.date)) byDay.set(s.date, new Set());
    byDay.get(s.date).add(s.contract_id);
  });

  // Adjacency: contracts co-occurring on any day are mutually adjacent.
  const adj = new Map();
  ids.forEach((id) => adj.set(id, new Set()));
  byDay.forEach((set) => {
    const arr = [...set];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        adj.get(arr[i]).add(arr[j]);
        adj.get(arr[j]).add(arr[i]);
      }
    }
  });

  // Stable order: by contract id string so the assignment is reproducible.
  const ordered = [...ids].sort((a, b) => String(a).localeCompare(String(b)));
  const colorIdx = new Map();
  ordered.forEach((id) => {
    const used = new Set();
    adj.get(id).forEach((n) => {
      if (colorIdx.has(n)) used.add(colorIdx.get(n));
    });
    let c = 0;
    while (used.has(c) && c < PALETTE.length) c++;
    colorIdx.set(id, c % PALETTE.length);
  });
  return colorIdx;
}

export function appaltoColor(index) {
  return PALETTE[((index || 0) % PALETTE.length + PALETTE.length) % PALETTE.length];
}
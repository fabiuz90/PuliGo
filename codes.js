export const empName = (e) => (e ? `${e.last_name || ''} ${e.first_name || ''}`.trim() : '—');
export const empDisplay = (e) => (e && e.code ? `${e.code} – ${empName(e)}` : empName(e));
export const contractName = (c) => (c ? c.site_name || '—' : '—');
export const contractDisplay = (c) => (c && c.code ? `${c.code} – ${contractName(c)}` : contractName(c));

const parseSuffix = (prefix, code) => {
  const m = String(code || '').match(new RegExp(`^${prefix}-(\\d+)$`));
  return m ? parseInt(m[1], 10) : 0;
};

export const nextCode = (prefix, items) => {
  const max = (items || []).reduce((m, it) => Math.max(m, parseSuffix(prefix, it.code)), 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
};

export const nextEmpCode = (employees) => nextCode('EMP', employees);
export const nextContractCode = (contracts) => nextCode('APP', contracts);
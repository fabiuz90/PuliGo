import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, AlertTriangle, Grid, X, FileText, BarChart3, TrendingUp, ShieldCheck, LogOut, Trash2 } from 'lucide-react';

const tabs = [
  ['Dashboard', '/', LayoutDashboard],
  ['Turni', '/turni', CalendarDays],
  ['Dipendenti', '/dipendenti', Users],
  ['Buchi', '/buchi', AlertTriangle],
];

const moreLinks = [
  ['Appalti', '/appalti', FileText],
  ['Resoconto', '/resoconto', BarChart3],
  ['Margini', '/margini', TrendingUp],
  ['Statistiche', '/statistiche', BarChart3],
];

export default function MobileNav({ isAdmin, onLogout, onDeleteAccount }) {
  const [more, setMore] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <nav className="lg:hidden sticky bottom-0 inset-x-0 z-40 shrink-0 bg-[#102a2b] border-t border-white/10 flex items-stretch" style={{ paddingBottom: 'var(--safe-bottom)' }}>
        {tabs.map(([label, to, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={(e) => { if (location.pathname === to) { e.preventDefault(); navigate(to, { replace: true }); } }} className="flex-1 flex flex-col items-center justify-center py-2">
            {({ isActive }) => (
              <span className={`flex flex-col items-center gap-1 text-[11px] font-medium ${isActive ? 'text-white' : 'text-white/55'}`}>
                <Icon size={20} />
                {label}
              </span>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMore(true)} className="flex-1 flex flex-col items-center justify-center py-2 text-[11px] font-medium text-white/55">
          <Grid size={20} />Altro
        </button>
      </nav>

      {more && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMore(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-5" style={{ paddingBottom: 'calc(var(--safe-bottom) + 1.25rem)' }}>
            <div className="flex items-center justify-between mb-4">
              <b className="text-lg">Altro</b>
              <button onClick={() => setMore(false)} className="p-2 -mr-2"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {moreLinks.map(([label, to, Icon]) => (
                <button key={to} onClick={() => { setMore(false); navigate(to); }} className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium ${location.pathname === to ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>
                  <Icon size={18} />{label}
                </button>
              ))}
              {isAdmin && (
                <button onClick={() => { setMore(false); navigate('/admin'); }} className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium ${location.pathname === '/admin' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'}`}>
                  <ShieldCheck size={18} />Amministrazione
                </button>
              )}
            </div>
            <div className="mt-4 pt-4 border-t space-y-1">
              <button onClick={onLogout} className="flex items-center gap-2 w-full px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                <LogOut size={18} />Esci
              </button>
              <button onClick={() => { setMore(false); onDeleteAccount(); }} className="flex items-center gap-2 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
                <Trash2 size={18} />Elimina account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
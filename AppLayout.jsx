import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Users, CalendarDays, AlertTriangle, ShieldCheck, LogOut, BarChart3, TrendingUp, ChevronLeft, Trash2, CalendarOff } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import useDrawerParam from '@/useDrawerParam';
import BrandLogo from '@/BrandLogo';
import MobileNav from '@/MobileNav';
import DeleteAccountModal from '@/DeleteAccountModal';

const links = [
  ['Dashboard', '/', LayoutDashboard], ['Appalti', '/appalti', FileText],
  ['Dipendenti', '/dipendenti', Users], ['Turni', '/turni', CalendarDays], ['Assenze', '/assenze', CalendarOff], ['Buchi', '/buchi', AlertTriangle],
  ['Resoconto Mensile', '/resoconto', BarChart3], ['Margini Appalti', '/margini', TrendingUp],
  ['Statistiche', '/statistiche', BarChart3]
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const deleteDrawer = useDrawerParam('delete-account');
  const isAdmin = user?.role === 'admin';
  const isVisitatore = user?.role === 'visitatore';
  const displayName = user?.full_name || user?.email || 'Utente';
  const initials = (displayName.charAt(0) || 'U').toUpperCase();
  const roleLabel = isAdmin ? 'Amministratore' : isVisitatore ? 'Visitatore' : 'Utente';
  const primaryRoutes = ['/', '/turni', '/dipendenti', '/buchi'];
  const canGoBack = !primaryRoutes.includes(location.pathname);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-white text-[#102a2b]' : 'text-white/65 hover:bg-white/10 hover:text-white'}`;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f5f7f8] text-slate-900">
      <header className="lg:hidden sticky top-0 z-30 shrink-0 bg-[#102a2b] text-white flex items-center gap-2 px-3" style={{ paddingTop: 'var(--safe-top)', height: 'calc(3.5rem + var(--safe-top))' }}>
        {canGoBack ? (
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 text-white/80 active:scale-95" aria-label="Indietro">
            <ChevronLeft size={24} />
          </button>
        ) : <div className="w-9" />}
        <div className="flex items-center gap-2.5 flex-1">
          <BrandLogo className="w-8 h-8" />
          <b className="text-base">PuliGo</b>
        </div>
      </header>

      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#102a2b] text-white p-5 flex-col z-40">
        <div className="flex items-center gap-3 px-2 py-4 mb-7">
          <BrandLogo className="w-10 h-10" />
          <div>
            <b className="text-lg">PuliGo</b>
            <p className="text-xs text-white/55">Gestione operativa</p>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(([label, to, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-1 ${isActive ? 'bg-white text-[#102a2b]' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}>
              <ShieldCheck size={18} />Amministrazione
            </NavLink>
          )}
          <div className="px-3 py-4 border-t border-white/10 mt-2">
            <div className="flex items-center gap-3 mb-3">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-white/10 text-white text-sm font-semibold">{initials}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-white/45 capitalize">{roleLabel}</p>
              </div>
            </div>
            <button onClick={() => logout()} className="flex items-center gap-2 text-sm text-white/60 hover:text-white w-full px-2 py-1.5">
              <LogOut size={16} />Esci
            </button>
            <button onClick={() => deleteDrawer.open('1')} className="flex items-center gap-2 text-sm text-white/40 hover:text-red-300 w-full px-2 py-1.5 mt-1">
              <Trash2 size={16} />Elimina account
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:ml-64 flex-1 min-h-0">
        {isVisitatore ? (
          <div className="flex-1 grid place-items-center p-5 sm:p-10">
            <div className="max-w-md text-center bg-white border rounded-2xl p-6 sm:p-10 shadow-sm">
              <span className="grid place-items-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto mb-5"><ShieldCheck size={26} /></span>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Account in attesa di approvazione</h1>
              <p className="text-slate-500 mt-3 text-sm sm:text-base">Il tuo account ha accesso limitato. Un amministratore deve abilitare il tuo profilo come "Utente" per visualizzare e gestire i dati operativi.</p>
              <p className="text-xs text-slate-400 mt-6">Contatta l'amministratore di PuliGo per richiedere l'accesso.</p>
            </div>
          </div>
        ) : (
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        )}
      </main>

      <MobileNav isAdmin={isAdmin} onLogout={() => logout()} onDeleteAccount={() => deleteDrawer.open('1')} />

      <DeleteAccountModal open={deleteDrawer.isOpen} onClose={deleteDrawer.close} onDone={() => logout()} />
    </div>
  );
}
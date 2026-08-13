import { X, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import useIsMobile from '@/hooks/useIsMobile';
export const PageHeader = ({ eyebrow, title, description, action }) => <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700 mb-2">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1>{description && <p className="text-slate-500 mt-2">{description}</p>}</div>{action}</header>;
export const StatusBadge = ({ active }) => <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Attivo' : 'Inattivo'}</span>;
export const EmptyState = ({ text }) => <div className="py-16 text-center text-slate-400"><Inbox className="mx-auto mb-3"/><p>{text}</p></div>;
export const Modal = ({ title, children, onClose }) => {
  const isMobile = useIsMobile();
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-5" style={{ paddingTop: isMobile ? 0 : 'calc(var(--safe-top) + 1.25rem)', paddingBottom: 'calc(var(--safe-bottom) + 1.25rem)' }}>
      <motion.div
        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-5 border-b z-10">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={19} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};
export const Loading = () => <div className="h-72 grid place-items-center"><div className="w-8 h-8 rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin"/></div>;
export const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600';
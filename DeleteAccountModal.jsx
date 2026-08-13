const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

import { useToast } from '@/components/ui/use-toast';
import useIsMobile from '@/hooks/useIsMobile';

const CONFIRM_TEXT = 'ELIMINA';

export default function DeleteAccountModal({ open, onClose, onDone }) {
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleDelete = async () => {
    setBusy(true);
    try {
      await db.functions.invoke('deleteAccount', {});
      toast({ title: 'Account eliminato.' });
      onDone();
    } catch (e) {
      toast({ title: 'Eliminazione non riuscita', description: e?.message || 'Riprova.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ paddingBottom: 'calc(var(--safe-bottom) + 1.25rem)' }}
        >
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <h2 className="text-xl font-semibold text-red-600">Elimina account</h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={19} /></button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-red-700">
                  <p className="font-semibold mb-1">Attenzione: questa azione è irreversibile.</p>
                  <p>L'eliminazione dell'account rimuoverà definitivamente l'accesso a PuliGo. I dati operativi (appalti, dipendenti, turni) resteranno nel sistema.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-2">Per confermare, digita <b className="tracking-wide">{CONFIRM_TEXT}</b> e poi tocca "Elimina definitivamente".</p>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={CONFIRM_TEXT} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600" />
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-slate-50">Annulla</button>
                <button onClick={handleDelete} disabled={busy || confirm.trim().toUpperCase() !== CONFIRM_TEXT} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                  <Trash2 size={16} />{busy ? 'Eliminazione…' : 'Elimina definitivamente'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
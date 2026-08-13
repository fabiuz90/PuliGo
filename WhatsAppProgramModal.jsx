import db from '@/db';

import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { MessageCircle, Loader2 } from 'lucide-react';

import { Modal } from '@/components/common';
import { buildWeekProgramMessage, normalizePhone, weekStartFor } from '@/lib/whatsappProgram';
import { empDisplay } from '@/lib/codes';

export default function WhatsAppProgramModal({ employee, shifts, contracts, currentUser, onClose }) {
  const [weekOption, setWeekOption] = useState('current');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sending, setSending] = useState(false);

  const weekStart = useMemo(() => weekStartFor(weekOption, customDate), [weekOption, customDate]);
  const weekEnd = addDays(weekStart, 6);
  const startKey = format(weekStart, 'yyyy-MM-dd');
  const endKey = format(weekEnd, 'yyyy-MM-dd');

  const phone = normalizePhone(employee.phone);
  const weekShifts = useMemo(
    () => shifts.filter((s) => s.employee_id === employee.id && s.date >= startKey && s.date <= endKey),
    [shifts, employee.id, startKey, endKey]
  );
  const message = useMemo(
    () => buildWeekProgramMessage(employee, shifts, contracts, weekStart),
    [employee, shifts, contracts, weekStart]
  );

  const openWhatsApp = async () => {
    setSending(true);
    try {
      const description = `Programma WhatsApp generato per ${employee.first_name} ${employee.last_name} da ${currentUser?.full_name || currentUser?.email || '—'} il ${format(new Date(), 'dd/MM/yyyy')} alle ${format(new Date(), 'HH:mm')}`;
      await db.entities.WhatsappAudit.create({
        employee_id: employee.id,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        week_start: startKey,
        week_end: endKey,
        initiated_by_id: currentUser?.id || '',
        initiated_by_name: currentUser?.full_name || currentUser?.email || '',
        description,
      });
    } catch (e) {
      // audit failure should not block the user
    } finally {
      const text = encodeURIComponent(message);
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
      setSending(false);
      onClose();
    }
  };

  const weekSelector = (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={weekOption === 'current'} onChange={() => setWeekOption('current')} />
        Settimana corrente
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={weekOption === 'next'} onChange={() => setWeekOption('next')} />
        Settimana successiva
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" checked={weekOption === 'custom'} onChange={() => setWeekOption('custom')} />
        Altra settimana
      </label>
      {weekOption === 'custom' && (
        <input
          type="date"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
        />
      )}
      <p className="text-xs text-slate-500 pt-1">
        Settimana dal <b>{format(weekStart, 'dd/MM/yyyy')}</b> al <b>{format(weekEnd, 'dd/MM/yyyy')}</b>
      </p>
    </div>
  );

  let content;
  if (!phone) {
    content = (
      <>
        {weekSelector}
        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Numero di telefono non presente per questo dipendente.
        </div>
        <div className="flex justify-end pt-5">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-slate-50">Chiudi</button>
        </div>
      </>
    );
  } else if (!weekShifts.length) {
    content = (
      <>
        {weekSelector}
        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Nessun turno presente per questo dipendente nella settimana selezionata.
        </div>
        <div className="flex justify-end pt-5">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-slate-50">Chiudi</button>
        </div>
      </>
    );
  } else {
    content = (
      <>
        {weekSelector}
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Anteprima messaggio</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-72 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-body text-sm text-slate-800">{message}</pre>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-5">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-slate-50">Annulla</button>
          <button
            onClick={openWhatsApp}
            disabled={sending}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold disabled:opacity-60"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
            {sending ? 'Apertura…' : 'Apri WhatsApp'}
          </button>
        </div>
      </>
    );
  }

  return (
    <Modal title={`📱 Invia programma WhatsApp — ${empDisplay(employee)}`} onClose={onClose}>
      <div className="p-6">{content}</div>
    </Modal>
  );
}

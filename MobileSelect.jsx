import { useState } from 'react';
import { Drawer } from 'vaul';
import { Check, ChevronDown } from 'lucide-react';
import useIsMobile from '@/hooks/useIsMobile';

// Native <select> on desktop, vaul bottom-sheet picker on mobile.
export default function MobileSelect({ value, onChange, options, placeholder, className, required }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  if (!isMobile) {
    return (
      <select
        className={className}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          className={`${className} flex items-center justify-between gap-2 text-left ${!selected ? 'text-slate-400' : ''}`}
        >
          <span className="truncate">{selected ? selected.label : (placeholder || 'Seleziona…')}</span>
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        </button>
      </Drawer.Trigger>
      <Drawer.Content className="rounded-t-2xl bg-white outline-none" style={{ paddingBottom: 'var(--safe-bottom)' }}>
        <Drawer.Title className="px-5 pt-3 pb-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
          {placeholder || 'Seleziona'}
        </Drawer.Title>
        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`flex items-center justify-between w-full px-5 py-3.5 text-left text-sm border-b border-slate-100 ${o.value === value ? 'text-emerald-700 font-semibold' : 'text-slate-700'}`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <Check size={18} className="shrink-0" />}
            </button>
          ))}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
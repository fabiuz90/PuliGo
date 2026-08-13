import { useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const THRESHOLD = 64;
const MAX_PULL = 90;

// Simple touch pull-to-refresh: only triggers when the window is scrolled to
// the very top and the user drags downward.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  const onTouchStart = (e) => {
    if (refreshing) return;
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      active.current = true;
    } else {
      active.current = false;
    }
  };
  const onTouchMove = (e) => {
    if (!active.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta * 0.5, MAX_PULL));
  };
  const onTouchEnd = async () => {
    if (!active.current) return;
    active.current = false;
    if (pull > THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh?.(); } finally { setRefreshing(false); }
    }
    setPull(0);
  };

  const show = pull > 0 || refreshing;
  const pct = Math.min(pull / THRESHOLD, 1);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="grid place-items-center text-emerald-600 overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? THRESHOLD : pull }}
      >
        {refreshing ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <RefreshCw size={20} style={{ opacity: pct, transform: `rotate(${pct * 180}deg)` }} />
        )}
      </div>
      {children}
    </div>
  );
}
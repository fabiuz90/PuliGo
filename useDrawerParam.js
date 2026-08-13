import { useSearchParams } from 'react-router-dom';

// Binds a drawer/modal open-state to a URL search param so the native iOS
// back gesture / back button closes the drawer instead of leaving the page.
// open  -> push  (adds a history entry; back removes the param → drawer closes)
// close -> replace (no extra history entry)
export default function useDrawerParam(name, { extraClear = [] } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(name) || '';
  const open = (val = '1') => {
    const next = new URLSearchParams(searchParams);
    next.set(name, val);
    setSearchParams(next);
  };
  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(name);
    extraClear.forEach((p) => next.delete(p));
    setSearchParams(next, { replace: true });
  };
  return { value, isOpen: !!value, open, close };
}
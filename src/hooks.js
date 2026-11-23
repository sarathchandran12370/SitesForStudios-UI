import { useEffect, useRef } from 'react';

/**
 * Calls `reload` whenever the app saves something (any successful POST/PUT/PATCH/DELETE through api()),
 * and once more a few seconds later for work that finishes in the background (photo processing).
 */
export function useReloadOnChange(reload, deps = []) {
  const fn = useRef(reload);
  fn.current = reload;
  useEffect(() => {
    let soon;
    let later;
    const onChange = () => {
      clearTimeout(soon);
      clearTimeout(later);
      soon = setTimeout(() => fn.current(), 300);
      later = setTimeout(() => fn.current(), 4000);
    };
    window.addEventListener('sfs:changed', onChange);
    return () => {
      window.removeEventListener('sfs:changed', onChange);
      clearTimeout(soon);
      clearTimeout(later);
    };
  }, deps);
}

import { useState, useEffect, useCallback } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true; // default dark
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    // The pre-paint script in index.html listens for this to keep the
    // browser chrome (theme-color) in step with the palette.
    window.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);

  return { dark, toggle };
}
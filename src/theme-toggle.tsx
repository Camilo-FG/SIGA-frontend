import { useEffect, useState } from 'react';

const storageKey = 'siga.theme';
export function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem(storageKey) === 'dark');
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem(storageKey, dark ? 'dark' : 'light'); }, [dark]);
  return { dark, toggle: () => setDark((current) => !current) };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return <button className="theme-toggle" onClick={toggle} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}>{dark ? '☼ Claro' : '◐ Oscuro'}</button>;
}

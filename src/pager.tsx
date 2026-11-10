import { useState } from 'react';

export const PAGE_SIZE = 10;

export function usePage<T>(items: T[], resetKey = '') {
  const [page, setPage] = useState(1);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  return {
    page: current,
    pages,
    slice: items.slice(start, start + PAGE_SIZE),
    total: items.length,
    setPage,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + PAGE_SIZE, items.length),
  };
}

export function Pager({ page, pages, total, from, to, onPage }: { page: number; pages: number; total: number; from: number; to: number; onPage: (page: number) => void }) {
  if (total <= PAGE_SIZE) return null;
  return (
    <nav className="pager" aria-label="Paginación">
      <span>{from}–{to} de {total}</span>
      <button type="button" className="ghost-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
      <span>Página {page} de {pages}</span>
      <button type="button" className="ghost-button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</button>
    </nav>
  );
}

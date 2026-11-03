import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Listing } from '../shared/types';
import type { MatchResult } from '../lib/match';
import { ListingCard } from './ListingCard';

const ROW = 116; // 104px card + 12px gap

export function ResultsList({
  items,
  scores,
  selectedId,
  onSelect,
  showScore,
}: {
  items: Listing[];
  scores: Map<string, MatchResult>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showScore: boolean;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => parent.current,
    estimateSize: () => ROW,
    overscan: 6,
  });
  const idx = items.findIndex((l) => l.id === selectedId);
  useEffect(() => {
    if (idx >= 0) v.scrollToIndex(idx, { align: 'auto' });
  }, [idx, v]);

  return (
    <div
      ref={parent}
      className="h-full overflow-y-auto px-3 py-3"
      role="list"
      aria-label="Internship results"
    >
      <div style={{ height: v.getTotalSize(), position: 'relative' }}>
        {v.getVirtualItems().map((row) => {
          const l = items[row.index];
          return (
            <div
              key={l.id}
              role="listitem"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${row.start}px)`,
                paddingBottom: 12,
              }}
            >
              <ListingCard
                l={l}
                match={scores.get(l.id)}
                selected={l.id === selectedId}
                onSelect={() => onSelect(l.id)}
                showScore={showScore}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** j / k move through results, "/" focuses search. Ignored while typing in a field. */
export function useResultKeys(
  items: Listing[],
  selectedId: string | null,
  onSelect: (id: string) => void,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.isContentEditable
      )
        return;
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
        return;
      }
      if (e.key !== 'j' && e.key !== 'k') return;
      if (!items.length) return;
      const i = items.findIndex((l) => l.id === selectedId);
      const next =
        e.key === 'j' ? Math.min(items.length - 1, i + 1) : Math.max(0, i === -1 ? 0 : i - 1);
      onSelect(items[next].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, selectedId, onSelect]);
}

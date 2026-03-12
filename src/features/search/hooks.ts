import { useState, useCallback, useRef } from 'react';
import { SearchResult } from '../../brokers/types';
import { useBrokerStore } from '../../store/broker';
import { SEARCH_DEBOUNCE_MS } from './service';

export function useSearch() {
  const broker = useBrokerStore((s) => s.broker);

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'stock' | 'etf'>('all');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (query: string) => {
      setKeyword(query);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      if (!query.trim()) {
        setResults([]);
        return;
      }

      debounceTimer.current = setTimeout(async () => {
        if (!broker) return;
        setIsSearching(true);
        setError(null);

        try {
          const raw = await broker.searchStock(query);
          const filtered =
            filter === 'all' ? raw : raw.filter((r) => r.type === filter);
          setResults(filtered);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setIsSearching(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [broker, filter]
  );

  const changeFilter = useCallback(
    (newFilter: 'all' | 'stock' | 'etf') => {
      setFilter(newFilter);
      if (keyword) search(keyword);
    },
    [keyword, search]
  );

  return {
    keyword,
    results,
    filter,
    isSearching,
    error,
    search,
    changeFilter,
  };
}

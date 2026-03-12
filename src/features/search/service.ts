import { SearchResult } from '../../brokers/types';

/**
 * 검색 결과를 타입별로 필터링합니다.
 */
export function filterSearchResults(
  results: SearchResult[],
  filter: 'all' | 'stock' | 'etf'
): SearchResult[] {
  if (filter === 'all') return results;
  return results.filter((r) => r.type === filter);
}

/**
 * 검색 키워드 디바운스 (ms)
 */
export const SEARCH_DEBOUNCE_MS = 300;

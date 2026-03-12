import { useState, useCallback } from 'react';
import { Holding } from '../../brokers/types';
import { useBrokerStore } from '../../store/broker';
import { BulkSellItem, BulkSellResult, executeBulkSell } from './executor';

export function useBulkSell(holdings: Holding[]) {
  const broker = useBrokerStore((s) => s.broker);

  const [items, setItems] = useState<BulkSellItem[]>(
    holdings.map((h) => ({ holding: h, selected: false }))
  );
  const [results, setResults] = useState<BulkSellResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = useCallback((code: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.holding.code === code ? { ...i, selected: !i.selected } : i
      )
    );
  }, []);

  const selectAll = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
  }, []);

  const execute = useCallback(async () => {
    if (!broker) return;
    setIsExecuting(true);
    setError(null);

    try {
      const sellResults = await executeBulkSell(broker, items);
      setResults(sellResults);
      setIsDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsExecuting(false);
    }
  }, [broker, items]);

  const selectedCount = items.filter((i) => i.selected).length;

  return {
    items,
    results,
    isExecuting,
    isDone,
    error,
    selectedCount,
    toggleItem,
    selectAll,
    deselectAll,
    execute,
  };
}

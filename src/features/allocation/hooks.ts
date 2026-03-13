import { useState, useCallback } from 'react';
import { useBrokerStore } from '../../store/broker';
import { usePortfolioStore } from '../../store/portfolio';
import { useAllocationStore } from '../../store/allocation';
import { calculateRebalance } from './engine';
import { RebalanceResult } from './types';

export function useRebalance() {
  const broker = useBrokerStore((s) => s.broker);
  const { holdings, balance, setBalance, setHoldings } = usePortfolioStore();
  const { config } = useAllocationStore();

  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResults, setOrderResults] = useState<
    { code: string; name: string; success: boolean; message?: string }[]
  >([]);

  const calculate = useCallback(async () => {
    if (!broker) throw new Error('브로커에 연결되어 있지 않습니다.');

    // balance/holdings가 없으면 자동 로드
    let currentBalance = balance;
    let currentHoldings = holdings;
    if (!currentBalance) {
      try {
        const [fetchedBalance, fetchedHoldings] = await Promise.all([
          broker.getAccountBalance(),
          broker.getHoldings(),
        ]);
        setBalance(fetchedBalance);
        setHoldings(fetchedHoldings);
        currentBalance = fetchedBalance;
        currentHoldings = fetchedHoldings;
      } catch {
        throw new Error('계좌 정보를 불러올 수 없습니다. 자산현황 화면에서 먼저 연결 상태를 확인해주세요.');
      }
    }

    setIsCalculating(true);
    setError(null);

    try {
      // 현재 가격 조회
      const stockCodes = config.items
        .filter((i) => i.type !== 'cash')
        .map((i) => i.code);

      const priceEntries = await Promise.allSettled(
        stockCodes.map(async (code) => {
          const price = await broker.getStockPrice(code);
          return [code, price.currentPrice] as [string, number];
        })
      );

      const prices: Record<string, number> = {};
      priceEntries.forEach((entry) => {
        if (entry.status === 'fulfilled') {
          prices[entry.value[0]] = entry.value[1];
        }
      });

      // 기존 보유 가격도 fallback으로 추가
      currentHoldings.forEach((h) => {
        if (!prices[h.code]) prices[h.code] = h.currentPrice;
      });

      const rebalanceResult = calculateRebalance(config, currentHoldings, currentBalance!, prices);
      setResult(rebalanceResult);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsCalculating(false);
    }
  }, [broker, holdings, balance, config, setBalance, setHoldings]);

  const execute = useCallback(async () => {
    if (!broker || !result) return;

    setIsExecuting(true);
    setOrderResults([]);
    setError(null);

    const results: typeof orderResults = [];

    for (const order of result.orders) {
      try {
        const orderResult =
          order.type === 'buy'
            ? await broker.buyStock({
                code: order.code,
                quantity: order.quantity,
                orderType: '01', // 시장가
              })
            : await broker.sellStock({
                code: order.code,
                quantity: order.quantity,
                orderType: '01',
              });

        results.push({
          code: order.code,
          name: order.name,
          success: orderResult.success,
          message: orderResult.message,
        });
      } catch (e) {
        results.push({
          code: order.code,
          name: order.name,
          success: false,
          message: (e as Error).message,
        });
      }
    }

    setOrderResults(results);
    setIsExecuting(false);
  }, [broker, result]);

  return {
    result,
    isCalculating,
    isExecuting,
    error,
    orderResults,
    calculate,
    execute,
  };
}

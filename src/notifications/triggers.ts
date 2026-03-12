import { BrokerAPI } from '../brokers/types';
import { AllocationConfig } from '../store/allocation';
import { calculateRebalance } from '../features/allocation/engine';
import { sendRebalanceNotification } from './service';

let checkTimer: ReturnType<typeof setInterval> | null = null;

export function startRebalanceCheck(
  broker: BrokerAPI,
  config: AllocationConfig,
  intervalMinutes: number
): void {
  stopRebalanceCheck();

  checkTimer = setInterval(async () => {
    try {
      const [holdings, balance] = await Promise.all([
        broker.getHoldings(),
        broker.getAccountBalance(),
      ]);

      const prices: Record<string, number> = {};
      await Promise.allSettled(
        config.items
          .filter((i) => i.type !== 'cash')
          .map(async (i) => {
            const p = await broker.getStockPrice(i.code);
            prices[i.code] = p.currentPrice;
          })
      );

      holdings.forEach((h) => {
        if (!prices[h.code]) prices[h.code] = h.currentPrice;
      });

      const result = calculateRebalance(config, holdings, balance, prices);

      if (result.needsRebalance) {
        const count = result.statuses.filter((s) => s.needsRebalance).length;
        await sendRebalanceNotification(count);
      }
    } catch {
      // 백그라운드 체크 오류 무시
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopRebalanceCheck(): void {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
}

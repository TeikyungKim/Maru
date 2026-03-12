import { AllocationConfig, AllocationItem } from '../../store/allocation';
import { Holding, AccountBalance } from '../../brokers/types';
import { AllocationStatus, RebalanceOrder, RebalanceResult } from './types';

/**
 * 현재 포트폴리오와 목표 배분 설정을 비교하여 리밸런싱 계획을 수립합니다.
 */
export function calculateRebalance(
  config: AllocationConfig,
  holdings: Holding[],
  balance: AccountBalance,
  currentPrices: Record<string, number>
): RebalanceResult {
  const totalAsset = balance.totalAsset;
  if (totalAsset <= 0) {
    return { statuses: [], orders: [], totalAsset: 0, needsRebalance: false };
  }

  const holdingsByCode = new Map(holdings.map((h) => [h.code, h]));

  const statuses: AllocationStatus[] = config.items.map((item) => {
    let currentAmount = 0;

    if (item.type === 'cash') {
      currentAmount = balance.cashBalance;
    } else {
      const holding = holdingsByCode.get(item.code);
      if (holding) {
        const price = currentPrices[item.code] ?? holding.currentPrice;
        currentAmount = holding.quantity * price;
      }
    }

    const currentRatio = (currentAmount / totalAsset) * 100;
    const targetAmount = (item.targetRatio / 100) * totalAsset;
    const deviation = currentRatio - item.targetRatio;
    const needsRebalance = Math.abs(deviation) > config.threshold;

    return {
      item,
      currentRatio,
      currentAmount,
      targetAmount,
      deviation,
      needsRebalance,
    };
  });

  const orders: RebalanceOrder[] = [];

  for (const status of statuses) {
    if (!status.needsRebalance || status.item.type === 'cash') continue;

    const { item, currentAmount, targetAmount } = status;
    const price = currentPrices[item.code];
    if (!price || price <= 0) continue;

    const amountDiff = targetAmount - currentAmount;
    const quantity = Math.floor(Math.abs(amountDiff) / price);
    if (quantity <= 0) continue;

    orders.push({
      code: item.code,
      name: item.name,
      type: amountDiff > 0 ? 'buy' : 'sell',
      quantity,
      estimatedAmount: quantity * price,
      currentPrice: price,
    });
  }

  // 매도 먼저, 매수 나중 (자금 확보)
  orders.sort((a, b) => {
    if (a.type === 'sell' && b.type === 'buy') return -1;
    if (a.type === 'buy' && b.type === 'sell') return 1;
    return 0;
  });

  const needsRebalance = statuses.some((s) => s.needsRebalance);

  return { statuses, orders, totalAsset, needsRebalance };
}

/**
 * 목표 비율 합계를 검증합니다 (100%가 되어야 함).
 */
export function validateAllocation(items: AllocationItem[]): {
  valid: boolean;
  total: number;
  message?: string;
} {
  const total = items.reduce((sum, item) => sum + item.targetRatio, 0);
  if (Math.abs(total - 100) > 0.01) {
    return {
      valid: false,
      total,
      message: `목표 비율의 합이 ${total.toFixed(1)}%입니다. 100%가 되어야 합니다.`,
    };
  }
  return { valid: true, total };
}

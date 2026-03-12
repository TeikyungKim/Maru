import { AllocationItem } from '../../store/allocation';
import { Holding } from '../../brokers/types';

export interface AllocationStatus {
  item: AllocationItem;
  currentRatio: number;     // 현재 비율 (%)
  currentAmount: number;    // 현재 금액
  targetAmount: number;     // 목표 금액
  deviation: number;        // 편차 (currentRatio - targetRatio)
  needsRebalance: boolean;  // 리밸런싱 필요 여부
}

export interface RebalanceOrder {
  code: string;
  name: string;
  type: 'buy' | 'sell';
  quantity: number;
  estimatedAmount: number;
  currentPrice: number;
}

export interface RebalanceResult {
  statuses: AllocationStatus[];
  orders: RebalanceOrder[];
  totalAsset: number;
  needsRebalance: boolean;
}

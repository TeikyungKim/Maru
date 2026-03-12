import { BrokerAPI, Holding, OrderResult } from '../../brokers/types';

export interface BulkSellItem {
  holding: Holding;
  selected: boolean;
}

export interface BulkSellResult {
  code: string;
  name: string;
  quantity: number;
  orderResult: OrderResult;
}

export async function executeBulkSell(
  broker: BrokerAPI,
  items: BulkSellItem[]
): Promise<BulkSellResult[]> {
  const selected = items.filter((i) => i.selected && i.holding.quantity > 0);
  const results: BulkSellResult[] = [];

  for (const item of selected) {
    try {
      const orderResult = await broker.sellStock({
        code: item.holding.code,
        quantity: item.holding.quantity,
        orderType: '01', // 시장가
      });

      results.push({
        code: item.holding.code,
        name: item.holding.name,
        quantity: item.holding.quantity,
        orderResult,
      });
    } catch (e) {
      results.push({
        code: item.holding.code,
        name: item.holding.name,
        quantity: item.holding.quantity,
        orderResult: {
          orderId: '',
          success: false,
          message: (e as Error).message,
        },
      });
    }
  }

  return results;
}

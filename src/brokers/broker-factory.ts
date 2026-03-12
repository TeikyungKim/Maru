import { BrokerAPI } from './types';
import { KISBroker } from './kis';

type BrokerConstructor = () => BrokerAPI;

const brokerRegistry: Record<string, BrokerConstructor> = {
  kis: () => new KISBroker(),
  // 추후 추가:
  // kiwoom: () => new KiwoomBroker(),
  // nhqv: () => new NHQVBroker(),
};

let currentBrokerInstance: BrokerAPI | null = null;
let currentBrokerKey: string | null = null;

export function createBroker(brokerKey: string): BrokerAPI {
  const factory = brokerRegistry[brokerKey];
  if (!factory) {
    throw new Error(`지원하지 않는 증권사: ${brokerKey}`);
  }
  currentBrokerInstance = factory();
  currentBrokerKey = brokerKey;
  return currentBrokerInstance;
}

export function getBroker(): BrokerAPI {
  if (!currentBrokerInstance) {
    throw new Error('증권사가 선택되지 않았습니다.');
  }
  return currentBrokerInstance;
}

export function getCurrentBrokerKey(): string | null {
  return currentBrokerKey;
}

export function resetBroker(): void {
  currentBrokerInstance = null;
  currentBrokerKey = null;
}

export function isBrokerSupported(key: string): boolean {
  return key in brokerRegistry;
}

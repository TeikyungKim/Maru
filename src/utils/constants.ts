export const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';
export const KIS_MOCK_BASE_URL = 'https://openapivts.koreainvestment.com:29443';

export const STORAGE_KEYS = {
  BROKER: 'maru_broker',
  KIS_APP_KEY: 'maru_kis_app_key',
  KIS_APP_SECRET: 'maru_kis_app_secret',
  KIS_ACCOUNT: 'maru_kis_account',
  KIS_ACCESS_TOKEN: 'maru_kis_access_token',
  KIS_TOKEN_EXPIRES: 'maru_kis_token_expires',
  IS_MOCK: 'maru_is_mock',
  ALLOCATION_CONFIG: 'maru_allocation_config',
} as const;

export const REBALANCE_THRESHOLD = 2; // ±2% 허용 오차

export const ORDER_TYPES = {
  MARKET: '01',  // 시장가
  LIMIT: '00',   // 지정가
} as const;

export const BROKERS = {
  KIS: 'kis',
} as const;

export type BrokerKey = keyof typeof BROKERS;

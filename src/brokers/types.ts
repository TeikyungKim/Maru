export interface LoginCredentials {
  appKey: string;
  appSecret: string;
  accountNumber: string;
  isMock?: boolean;
}

export interface AuthToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp
  tokenType: string;
}

export interface AccountBalance {
  totalAsset: number;        // 총 자산
  cashBalance: number;       // 예수금
  stockEvalAmount: number;   // 주식 평가 금액
  profitLoss: number;        // 평가손익
  profitLossRate: number;    // 수익률
}

export interface Holding {
  code: string;              // 종목 코드
  name: string;              // 종목명
  quantity: number;          // 보유 수량
  avgPrice: number;          // 평균 단가
  currentPrice: number;      // 현재가
  evalAmount: number;        // 평가 금액
  profitLoss: number;        // 평가손익
  profitLossRate: number;    // 수익률
  holdingRatio: number;      // 보유 비율 (%)
}

export interface OrderRequest {
  code: string;              // 종목 코드
  quantity: number;          // 주문 수량
  price?: number;            // 주문 가격 (시장가 시 생략)
  orderType: '01' | '00';   // 01: 시장가, 00: 지정가
}

export interface OrderResult {
  orderId: string;           // 주문 번호
  success: boolean;
  message?: string;
}

export interface StockPrice {
  code: string;
  name: string;
  currentPrice: number;
  changeAmount: number;      // 전일 대비
  changeRate: number;        // 등락률
  volume: number;            // 거래량
  openPrice: number;         // 시가
  highPrice: number;         // 고가
  lowPrice: number;          // 저가
  timestamp: number;
}

export interface StockInfo extends StockPrice {
  marketCap: number;         // 시가총액
  per: number;               // PER
  eps: number;               // EPS
  pbr: number;               // PBR
  week52High: number;        // 52주 최고
  week52Low: number;         // 52주 최저
  sector: string;            // 업종
}

export interface ETFInfo {
  code: string;
  name: string;
  currentPrice: number;
  changeAmount: number;
  changeRate: number;
  nav: number;               // 순자산가치
  navDiff: number;           // NAV 괴리율
  baseIndex: string;         // 기초지수
  expense: number;           // 운용보수 (%)
  totalAsset: number;        // 순자산 총액
  components: ETFComponent[];
}

export interface ETFComponent {
  code: string;
  name: string;
  weight: number;            // 비중 (%)
}

export interface SearchResult {
  code: string;
  name: string;
  market: string;            // KOSPI, KOSDAQ
  type: 'stock' | 'etf';
  currentPrice?: number;
  changeRate?: number;
}

export interface BrokerAPI {
  // 인증
  login(credentials: LoginCredentials): Promise<AuthToken>;
  refreshToken(): Promise<AuthToken>;
  isTokenValid(): Promise<boolean>;

  // 계좌
  getAccountBalance(): Promise<AccountBalance>;
  getHoldings(): Promise<Holding[]>;

  // 주문
  buyStock(order: OrderRequest): Promise<OrderResult>;
  sellStock(order: OrderRequest): Promise<OrderResult>;

  // 시세
  getStockPrice(code: string): Promise<StockPrice>;
  getStockInfo(code: string): Promise<StockInfo>;
  getETFInfo(code: string): Promise<ETFInfo>;
  searchStock(keyword: string): Promise<SearchResult[]>;

  // 실시간 (선택)
  subscribePrice?(code: string, callback: (price: StockPrice) => void): void;
  unsubscribePrice?(code: string): void;
}

export interface BrokerMeta {
  key: string;
  name: string;
  logoText: string;
  color: string;
}

export const BROKER_LIST: BrokerMeta[] = [
  {
    key: 'kis',
    name: '한국투자증권',
    logoText: 'KIS',
    color: '#c0392b',
  },
];

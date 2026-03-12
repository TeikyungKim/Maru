# 🐾 Maru - 한국 주식 트레이딩 에이전트

## 프로젝트 개요

- **스택**: React Native + Expo
- **목적**: 한국 증권사 API를 활용한 자동 자산배분 및 주식 트레이딩 앱
- **핵심 컨셉**: 증권사를 선택하면 해당 증권사의 API로 모든 기능이 동작하는 구조

---

## 지원 증권사

| 증권사 | 상태 | API 방식 |
|--------|------|----------|
| 한국투자증권 (KIS) | ✅ 1차 구현 | REST + WebSocket |
| 추가 예정 | 🔜 | - |

---

## 앱 구조

```
maru/
├── app/                          # Expo Router (파일 기반 라우팅)
│   ├── _layout.tsx               # 루트 레이아웃
│   ├── index.tsx                 # 증권사 선택 화면 (진입점)
│   ├── (auth)/
│   │   ├── login.tsx             # 로그인 화면
│   │   └── _layout.tsx
│   └── (main)/
│       ├── _layout.tsx           # 탭 네비게이션
│       ├── dashboard.tsx         # 대시보드 (자산 현황)
│       ├── allocation.tsx        # 동적 자산배분
│       ├── search.tsx            # 주식/ETF 검색
│       ├── stock/[code].tsx      # 주식 상세 정보
│       ├── etf/[code].tsx        # ETF 상세 정보
│       └── settings.tsx          # 설정
│
├── src/
│   ├── brokers/                  # 증권사 API 추상화 (핵심)
│   │   ├── types.ts              # 공통 인터페이스 정의
│   │   ├── broker-factory.ts     # 증권사 팩토리 패턴
│   │   └── kis/                  # 한국투자증권 구현체
│   │       ├── index.ts
│   │       ├── auth.ts           # 인증 (OAuth, 토큰 관리)
│   │       ├── account.ts        # 계좌 조회
│   │       ├── order.ts          # 주문 (매수/매도)
│   │       ├── market.ts         # 시세 조회
│   │       └── websocket.ts      # 실시간 시세
│   │
│   ├── features/
│   │   ├── allocation/           # 동적 자산배분 로직
│   │   │   ├── engine.ts         # 리밸런싱 계산 엔진
│   │   │   ├── hooks.ts          # React 훅
│   │   │   └── types.ts
│   │   ├── bulk-sell/            # 일괄매도
│   │   │   ├── executor.ts
│   │   │   └── hooks.ts
│   │   └── search/               # 검색 기능
│   │       ├── service.ts
│   │       └── hooks.ts
│   │
│   ├── components/               # 공통 UI 컴포넌트
│   │   ├── BrokerSelector.tsx
│   │   ├── StockCard.tsx
│   │   ├── AllocationChart.tsx
│   │   ├── OrderConfirmModal.tsx
│   │   └── PriceDisplay.tsx
│   │
│   ├── store/                    # 상태 관리 (Zustand)
│   │   ├── broker.ts             # 선택된 증권사 상태
│   │   ├── portfolio.ts          # 포트폴리오 상태
│   │   └── allocation.ts         # 자산배분 설정 상태
│   │
│   ├── notifications/            # 알림 시스템
│   │   ├── service.ts            # Expo Notifications 래핑
│   │   └── triggers.ts           # 리밸런싱 알림 트리거
│   │
│   └── utils/
│       ├── format.ts             # 금액/퍼센트 포맷
│       ├── constants.ts
│       └── storage.ts            # SecureStore (토큰 저장)
│
├── app.json
├── package.json
└── tsconfig.json
```

---

## 핵심 설계: 증권사 추상화

새로운 증권사를 추가할 때 `BrokerAPI` 인터페이스만 구현하면 앱 전체에서 동작하도록 설계합니다.

```typescript
// src/brokers/types.ts

interface BrokerAPI {
  // 인증
  login(credentials: LoginCredentials): Promise<AuthToken>;
  refreshToken(): Promise<AuthToken>;

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
```

```typescript
// src/brokers/broker-factory.ts

const brokers = {
  kis: () => new KISBroker(),
  // 추후 추가
  // kiwoom: () => new KiwoomBroker(),
};

function createBroker(brokerKey: string): BrokerAPI {
  const factory = brokers[brokerKey];
  if (!factory) throw new Error(`지원하지 않는 증권사: ${brokerKey}`);
  return factory();
}
```

---

## 기능 상세

### 1. 증권사 선택 (진입점)

- 앱 최초 실행 시 증권사 선택 화면
- 선택한 증권사는 로컬 저장, 이후 자동 진입
- 설정에서 변경 가능

### 2. 로그인

- 한국투자증권: 앱키 + 앱시크릿 + 계좌번호 입력
- 토큰 발급 후 SecureStore에 저장
- 토큰 만료 시 자동 갱신

### 3. 동적 자산배분 (핵심 기능)

```
[사용자 설정]
삼성전자: 40%
KODEX 200: 30%
현금: 30%

[리밸런싱 엔진]
1. 현재 보유 비율 계산
2. 목표 비율과 비교
3. 허용 오차 범위(예: ±2%) 초과 시
   → 초과 종목: 매도 주문 생성
   → 부족 종목: 매수 주문 생성
4. 알림 출력 (Expo Notifications)
5. 사용자 확인 후 주문 실행
```

- 수동 실행 + 주기적 체크(백그라운드) 지원
- 리밸런싱 전 반드시 사용자 확인 필요

### 4. 일괄매도

- 보유 종목 전체 또는 선택 종목 일괄 시장가 매도
- 확인 모달 필수
- 주문 결과 리스트 표시

### 5. 주식정보 / ETF정보

- 종목 코드로 상세 정보 조회
- 주식: 현재가, 등락률, 거래량, 시가총액, 52주 최고/최저
- ETF: 기초지수, 운용보수, 구성종목, NAV

### 6. 검색 기능

- 종목명 또는 코드로 실시간 검색
- 주식/ETF 구분 필터
- 검색 결과에서 바로 상세 정보 진입

---

## 주요 라이브러리

| 용도 | 라이브러리 |
|------|-----------|
| 프레임워크 | Expo SDK + Expo Router |
| 상태 관리 | Zustand |
| HTTP 클라이언트 | Axios |
| 보안 저장소 | expo-secure-store |
| 알림 | expo-notifications |
| 차트 | react-native-chart-kit 또는 Victory Native |
| WebSocket | React Native 내장 WebSocket |

---

## 구현 순서

### Phase 1: 기반 구축
1. Expo 프로젝트 초기화 + 폴더 구조 세팅
2. 증권사 추상화 인터페이스 정의
3. 한국투자증권 로그인 구현
4. 증권사 선택 → 로그인 플로우 완성

### Phase 2: 조회 기능
5. 계좌 잔고/보유 종목 조회
6. 주식 현재가 검색 기능
7. 주식/ETF 상세 정보 화면

### Phase 3: 매매 기능
8. 동적 자산배분 설정 화면
9. 리밸런싱 엔진 구현
10. 리밸런싱 알림 연동
11. 일괄매도 기능

### Phase 4: 고도화
12. 실시간 시세 (WebSocket)
13. 백그라운드 리밸런싱 체크
14. 추가 증권사 연동

---

## 참고: 한국투자증권 API

- **문서**: https://apiportal.koreainvestment.com
- **인증**: 앱키/시크릿 → OAuth 토큰 발급
- **모의투자**: 별도 도메인으로 실거래 전 테스트 가능
- **주요 엔드포인트**:
  - 토큰 발급: `POST /oauth2/tokenP`
  - 주식 현재가: `GET /uapi/domestic-stock/v1/quotations/inquire-price`
  - 주식 주문: `POST /uapi/domestic-stock/v1/trading/order-cash`
  - 잔고 조회: `GET /uapi/domestic-stock/v1/trading/inquire-balance`

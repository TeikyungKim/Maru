# CLAUDE.md - Maru (마루) Project Guide

## Project Overview

Maru is a Korean stock auto-rebalancing mobile/web app built with React Native + Expo. It connects to Korean brokerage APIs (currently KIS - 한국투자증권) to provide portfolio management, automatic rebalancing, and stock trading.

## Tech Stack

- **Framework**: React Native 0.81.5 + Expo SDK 54 + Expo Router 6
- **Language**: TypeScript 5.3 (strict mode)
- **State Management**: Zustand 5.0
- **HTTP Client**: Axios 1.7
- **UI**: React 19.1, react-native-chart-kit, react-native-svg
- **Storage**: expo-secure-store (native) / localStorage (web)
- **Notifications**: expo-notifications

## Commands

- `npm start` — Start Expo dev server (QR code for mobile)
- `npm run web:dev` — Web dev with CORS proxy (required for KIS API on web)
- `npm run web` — Web without proxy
- `npm run android` — Android emulator/device
- `npm run ios` — iOS simulator

No test runner, linter, or formatter is currently configured.

## Directory Structure

```
app/                          # Expo Router file-based routing (screens)
  _layout.tsx                 # Root layout (init, permissions)
  index.tsx                   # Broker selection (entry point)
  (auth)/login.tsx            # KIS login form
  (main)/                     # Tab navigation group
    dashboard.tsx             # Account balance & holdings
    allocation.tsx            # Asset allocation & rebalancing
    search.tsx                # Stock/ETF search
    settings.tsx              # App settings
    stock/[code].tsx          # Stock detail (dynamic route)
    etf/[code].tsx            # ETF detail (dynamic route)

src/
  brokers/                    # Broker API abstraction layer
    types.ts                  # BrokerAPI interface & data models
    broker-factory.ts         # Factory for broker instantiation
    kis/                      # KIS (한국투자증권) implementation
      index.ts                # KISBroker class
      auth.ts                 # OAuth token management
      account.ts              # Balance & holdings
      market.ts               # Stock price & search
      order.ts                # Buy/sell execution
      websocket.ts            # Real-time price subscriptions

  features/                   # Feature business logic modules
    allocation/               # Rebalancing engine & hooks
    bulk-sell/                # Bulk selling feature
    search/                   # Stock search service

  components/                 # Reusable UI components
  store/                      # Zustand stores (broker, portfolio, allocation)
  notifications/              # Push notification service & triggers
  utils/                      # Helpers (storage, format, constants)

proxy.js                      # Local CORS proxy for web dev (port 8088)
```

## Architecture & Key Patterns

### Broker Abstraction (core design)
All brokerage interactions go through `BrokerAPI` interface (`src/brokers/types.ts`). KIS is the first implementation. New brokers implement this interface and register in `broker-factory.ts`.

### Data Flow
```
UI (React) → Zustand Store → BrokerAPI (KIS) → External API
                                ↕
                          Storage Layer (SecureStore / localStorage)
```

### Feature Modules
Each feature (`allocation`, `bulk-sell`, `search`) is self-contained with its own service layer, types, and React hooks. Business logic stays out of screen components.

### Rebalancing Engine
- Compares current vs target allocation percentages
- Threshold-based triggering (default ±2%)
- Generates sell orders first, then buy orders (fund sequencing)
- Located in `src/features/allocation/engine.ts`

### Cross-Platform Storage
`src/utils/storage.ts` abstracts storage: expo-secure-store on native, localStorage on web. Storage keys are defined in `src/utils/constants.ts` with `maru_` prefix.

### Token Management
KIS OAuth tokens auto-refresh on expiry. Credentials saved to secure storage. See `src/brokers/kis/auth.ts`.

### Web Development
Web requires the CORS proxy (`proxy.js` on port 8088). Always use `npm run web:dev` for web development. The proxy routes `/kis/**` to the KIS production API and `/kis/mock/**` to the paper trading API.

## Conventions

### Naming
- **Screens**: lowercase file names (Expo Router convention): `dashboard.tsx`
- **Components**: PascalCase: `StockCard.tsx`
- **Stores/utils**: kebab-case: `broker.ts`, `format.ts`
- **Constants**: UPPER_SNAKE_CASE: `STORAGE_KEYS`

### Imports
Use path alias `@/*` for `src/` imports (configured in `tsconfig.json` and `babel.config.js`).

### State Management
Use Zustand stores in `src/store/`. Each store is a single slice. Async actions include error handling. Do not use React Context for global state.

### Adding a New Broker
1. Create `src/brokers/<name>/` directory implementing `BrokerAPI` interface
2. Register in `broker-factory.ts`
3. No UI changes needed — the factory pattern handles instantiation

## Important Notes

- KIS API credentials are sensitive — never commit real keys or tokens
- Paper trading (mock) mode available via `maru_is_mock` storage flag
- App package ID: `com.maru.trading`
- Custom URL scheme: `maru://`
- Typed routes enabled in Expo Router

# Maru — 한국 주식 자동 리밸런싱 앱

React Native + Expo 기반의 한국 주식 트레이딩 에이전트 앱입니다.
한국투자증권(KIS) API를 통해 계좌 조회, 종목 검색, 동적 자산배분 및 자동 리밸런싱을 지원합니다.

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 실행

| 목적 | 명령어 |
|------|--------|
| Expo Go로 QR 스캔 (Android/iOS 공통) | `npm start` |
| Android 에뮬레이터 / 기기 | `npm run android` |
| iOS 시뮬레이터 / 기기 | `npm run ios` |
| 웹 브라우저 (프록시 포함) | `npm run web:dev` |
| 웹 브라우저 (프록시 없이) | `npm run web` |

> **웹 실행 시 주의:** KIS API는 CORS 제한이 있어 웹에서는 반드시 `npm run web:dev`를 사용해야 합니다.
> 이 명령은 `proxy.js` 로컬 프록시 서버(포트 8088)와 Expo 개발 서버를 동시에 실행합니다.

### 3. 배포용 빌드 (EAS Build)

```bash
# EAS CLI 설치 (최초 1회)
npm install -g eas-cli
eas login

# Android APK / AAB
npx eas build --platform android

# iOS IPA
npx eas build --platform ios

# 전체 플랫폼
npx eas build --platform all
```

---

## 스택

- **Expo SDK 54** + **Expo Router 6** (파일 기반 라우팅)
- **React Native 0.81**
- **Zustand 5** — 상태 관리
- **Axios** — HTTP 요청
- **expo-secure-store** — 토큰 안전 저장
- **TypeScript** strict 모드

## 주요 기능

- KIS (한국투자증권) OAuth 로그인 및 토큰 자동 갱신
- 계좌 잔고 및 보유 종목 조회
- 종목명 검색 → 실시간 시세
- 동적 자산배분 설정 및 리밸런싱 분석 / 자동 주문 실행
- 모의투자(Mock) / 실투자 전환 지원

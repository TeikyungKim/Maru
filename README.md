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

#### Expo Go QR 스캔 상세 (`npm start`)

에뮬레이터/USB 연결 없이 실제 기기에서 바로 테스트할 수 있는 가장 빠른 방법입니다.

1. 핸드폰에 **Expo Go** 앱 설치
   - Android: Play 스토어 → "Expo Go" 검색
   - iOS: App Store → "Expo Go" 검색

2. PC에서 개발 서버 실행:
   ```bash
   npm start
   # 또는
   npx expo start
   ```

3. 터미널에 표시된 QR 코드 스캔
   - Android: Expo Go 앱 → **"Scan QR code"**
   - iOS: 기본 카메라 앱으로 QR 스캔

> **필수 조건:** PC와 핸드폰이 **같은 WiFi 네트워크**에 연결되어 있어야 합니다.
>
> **주의:** 네이티브 모듈(expo-secure-store 등)이 포함된 이 프로젝트는 Expo Go의 내장 네이티브 모듈 범위 내에서만 정상 동작합니다. 커스텀 네이티브 코드 추가 시에는 `npm run android` 또는 EAS Build를 사용해야 합니다.

### 3. Android 네이티브 빌드 (`run:android`)

`npx expo run:android`는 Expo Go 없이 네이티브 APK를 직접 빌드해 기기/에뮬레이터에 설치합니다.
단, 빌드 모드에 따라 Metro 번들러 실행 여부가 달라집니다.

| 모드 | 명령어 | Metro 필요 | 설명 |
|------|--------|-----------|------|
| Debug (기본) | `npx expo run:android` | **필요** | JS 번들을 Metro에서 실시간으로 받아옴. Expo 서버 종료 시 앱 실행 불가 |
| Release | `npx expo run:android --variant release` | 불필요 | JS 번들이 APK에 포함됨. 독립 실행 가능 |

> 개발 중에는 debug 모드를 사용하고(핫리로드 지원), 배포·테스트 배포용은 release 또는 EAS Build를 사용하세요.

### 4. 배포용 빌드 (EAS Build)

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

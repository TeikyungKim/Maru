import { StockPrice } from '../types';
import { getCredentials } from './auth';
import { storage } from '../../utils/storage';
import { STORAGE_KEYS } from '../../utils/constants';

type PriceCallback = (price: StockPrice) => void;

const WS_URL_REAL = 'ws://ops.koreainvestment.com:21000';
const WS_URL_MOCK = 'ws://ops.koreainvestment.com:31000';

let ws: WebSocket | null = null;
let isConnected = false;
const subscriptions = new Map<string, PriceCallback>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let approvalKey = '';

async function connect(): Promise<void> {
  const creds = getCredentials();
  if (!creds) return;

  const wsUrl = creds.isMock ? WS_URL_MOCK : WS_URL_REAL;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    isConnected = true;
    // 재연결 시 모든 구독 재요청
    subscriptions.forEach((_, code) => {
      sendSubscribe(code);
    });
  };

  ws.onmessage = (event) => {
    try {
      handleMessage(event.data as string);
    } catch {
      // 파싱 오류 무시
    }
  };

  ws.onerror = () => {
    isConnected = false;
  };

  ws.onclose = () => {
    isConnected = false;
    ws = null;
    if (subscriptions.size > 0) {
      // 자동 재연결 (5초 후)
      reconnectTimer = setTimeout(() => connect(), 5000);
    }
  };
}

function sendSubscribe(code: string): void {
  if (!ws || !isConnected || !approvalKey) return;

  const msg = JSON.stringify({
    header: {
      approval_key: approvalKey,
      custtype: 'P',
      tr_type: '1',
      'content-type': 'utf-8',
    },
    body: {
      input: {
        tr_id: 'H0STCNT0',
        tr_key: code,
      },
    },
  });

  ws.send(msg);
}

function sendUnsubscribe(code: string): void {
  if (!ws || !isConnected || !approvalKey) return;

  const msg = JSON.stringify({
    header: {
      approval_key: approvalKey,
      custtype: 'P',
      tr_type: '2',
      'content-type': 'utf-8',
    },
    body: {
      input: {
        tr_id: 'H0STCNT0',
        tr_key: code,
      },
    },
  });

  ws.send(msg);
}

function handleMessage(raw: string): void {
  // KIS 실시간 메시지는 | 구분자
  if (raw.startsWith('0') || raw.startsWith('1')) {
    const parts = raw.split('|');
    if (parts.length < 4) return;

    const tr_id = parts[1];
    if (tr_id !== 'H0STCNT0') return;

    const fields = parts[3].split('^');
    const code = fields[0];
    const callback = subscriptions.get(code);
    if (!callback) return;

    callback({
      code,
      name: '',
      currentPrice: Number(fields[2]),
      changeAmount: Number(fields[4]),
      changeRate: Number(fields[5]),
      volume: Number(fields[12]),
      openPrice: Number(fields[7]),
      highPrice: Number(fields[8]),
      lowPrice: Number(fields[9]),
      timestamp: Date.now(),
    });
  }
}

export async function subscribePrice(
  code: string,
  callback: PriceCallback
): Promise<void> {
  // 승인 키 로드
  const token = await storage.get(STORAGE_KEYS.KIS_ACCESS_TOKEN);
  if (!token) return;
  approvalKey = token;

  subscriptions.set(code, callback);

  if (!ws || !isConnected) {
    await connect();
  } else {
    sendSubscribe(code);
  }
}

export function unsubscribePrice(code: string): void {
  sendUnsubscribe(code);
  subscriptions.delete(code);

  if (subscriptions.size === 0) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
  }
}

import axios from 'axios';
import { OrderRequest, OrderResult } from '../types';
import { getAccessToken, getCredentials, getBaseUrl } from './auth';

function makeHeaders(accessToken: string, appKey: string, appSecret: string, trId: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    appkey: appKey,
    appsecret: appSecret,
    tr_id: trId,
  };
}

async function placeOrder(
  order: OrderRequest,
  isBuy: boolean
): Promise<OrderResult> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);

  const [accountPrefix, accountSuffix] = creds.accountNumber.split('-');

  // TR ID: 매수 실거래 TTTC0802U / 매도 TTTC0801U / 모의 VTTC0802U / VTTC0801U
  let trId: string;
  if (creds.isMock) {
    trId = isBuy ? 'VTTC0802U' : 'VTTC0801U';
  } else {
    trId = isBuy ? 'TTTC0802U' : 'TTTC0801U';
  }

  const body = {
    CANO: accountPrefix,
    ACNT_PRDT_CD: accountSuffix ?? '01',
    PDNO: order.code,
    ORD_DVSN: order.orderType,
    ORD_QTY: String(order.quantity),
    ORD_UNPR: order.price ? String(order.price) : '0',
  };

  const response = await axios.post(
    `${baseUrl}/uapi/domestic-stock/v1/trading/order-cash`,
    body,
    { headers: makeHeaders(token, creds.appKey, creds.appSecret, trId) }
  );

  const data = response.data;

  if (data.rt_cd !== '0') {
    return {
      orderId: '',
      success: false,
      message: data.msg1 ?? '주문 실패',
    };
  }

  return {
    orderId: data.output?.odno ?? '',
    success: true,
    message: '주문이 접수되었습니다.',
  };
}

export async function buyStock(order: OrderRequest): Promise<OrderResult> {
  return placeOrder(order, true);
}

export async function sellStock(order: OrderRequest): Promise<OrderResult> {
  return placeOrder(order, false);
}

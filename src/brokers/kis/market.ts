import axios from 'axios';
import { StockPrice, StockInfo, ETFInfo, ETFComponent, SearchResult } from '../types';
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

export async function getStockPrice(code: string): Promise<StockPrice> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);

  const response = await axios.get(
    `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
    {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, 'FHKST01010100'),
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: code,
      },
    }
  );

  const d = response.data.output;

  return {
    code,
    name: d.hts_kor_isnm,
    currentPrice: Number(d.stck_prpr),
    changeAmount: Number(d.prdy_vrss),
    changeRate: Number(d.prdy_ctrt),
    volume: Number(d.acml_vol),
    openPrice: Number(d.stck_oprc),
    highPrice: Number(d.stck_hgpr),
    lowPrice: Number(d.stck_lwpr),
    timestamp: Date.now(),
  };
}

export async function getStockInfo(code: string): Promise<StockInfo> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);

  // 주식 현재가 + 종목 상세
  const [priceRes, detailRes] = await Promise.all([
    axios.get(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`, {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, 'FHKST01010100'),
      params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code },
    }),
    axios.get(`${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`, {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, 'CTPF1002R'),
      params: { PDNO: code, PRDT_TYPE_CD: '300' },
    }),
  ]);

  const p = priceRes.data.output;
  const d = detailRes.data.output;

  return {
    code,
    name: p.hts_kor_isnm,
    currentPrice: Number(p.stck_prpr),
    changeAmount: Number(p.prdy_vrss),
    changeRate: Number(p.prdy_ctrt),
    volume: Number(p.acml_vol),
    openPrice: Number(p.stck_oprc),
    highPrice: Number(p.stck_hgpr),
    lowPrice: Number(p.stck_lwpr),
    timestamp: Date.now(),
    marketCap: Number(p.hts_avls),
    per: Number(p.per),
    eps: Number(p.eps),
    pbr: Number(p.pbr),
    week52High: Number(p.w52_hgpr),
    week52Low: Number(p.w52_lwpr),
    sector: d?.std_idst_clsf_cd_name ?? '',
  };
}

export async function getETFInfo(code: string): Promise<ETFInfo> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);

  const [priceRes, etfRes] = await Promise.all([
    axios.get(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`, {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, 'FHKST01010100'),
      params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code },
    }),
    axios.get(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`, {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, 'FHKST03010100'),
      params: {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: code,
        FID_INPUT_DATE_1: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        FID_INPUT_DATE_2: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '0',
      },
    }),
  ]);

  const p = priceRes.data.output;

  // ETF 구성 종목 조회
  let components: ETFComponent[] = [];
  try {
    const compRes = await axios.get(
      `${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-etf-component`,
      {
        headers: makeHeaders(token, creds.appKey, creds.appSecret, 'FHPST02400000'),
        params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code },
      }
    );
    components = (compRes.data.output2 ?? []).slice(0, 10).map((item: Record<string, string>) => ({
      code: item.stck_iscd,
      name: item.hts_kor_isnm,
      weight: Number(item.etf_cnfg_issu_rt),
    }));
  } catch {
    // 구성 종목 조회 실패 시 빈 배열
  }

  return {
    code,
    name: p.hts_kor_isnm,
    currentPrice: Number(p.stck_prpr),
    changeAmount: Number(p.prdy_vrss),
    changeRate: Number(p.prdy_ctrt),
    nav: Number(p.nav ?? 0),
    navDiff: Number(p.etf_nav_prdy_ctrt ?? 0),
    baseIndex: p.bsis_iscd_name ?? '',
    expense: Number(p.etf_fee_rt ?? 0),
    totalAsset: Number(p.etf_nav_total_asst_amt ?? 0),
    components,
  };
}

export async function searchStock(keyword: string): Promise<SearchResult[]> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);

  const response = await axios.get(
    `${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`,
    {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, 'CTPF1002R'),
      params: {
        PDNO: keyword,
        PRDT_TYPE_CD: '300',
      },
    }
  );

  const results: SearchResult[] = [];

  // 주식 검색
  if (response.data.output) {
    const item = response.data.output;
    if (item.pdno) {
      results.push({
        code: item.pdno,
        name: item.prdt_abrv_name,
        market: item.mket_id_cd === '1' ? 'KOSPI' : 'KOSDAQ',
        type: item.etf_gb_cd === '1' ? 'etf' : 'stock',
      });
    }
  }

  return results;
}

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
    custtype: 'P',
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

  if (response.data.rt_cd !== '0') {
    throw new Error(response.data.msg1 || '종목 정보를 찾을 수 없습니다.');
  }

  const d = response.data.output;
  if (!d) throw new Error('응답 데이터가 없습니다.');

  // 개발 환경 응답 디버그
  if (__DEV__) {
    console.log('[KIS getStockPrice]', code, {
      hts_kor_isnm: d.hts_kor_isnm,
      prdt_name: d.prdt_name,
      prdt_abrv_name: d.prdt_abrv_name,
      stck_prpr: d.stck_prpr,
      rt_cd: response.data.rt_cd,
    });
  }

  // KIS API 응답에서 종목명 필드 우선순위: hts_kor_isnm > prdt_name > prdt_abrv_name
  const name = (d.hts_kor_isnm || d.prdt_name || d.prdt_abrv_name || '').trim();

  return {
    code,
    name,
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

  // 현재가 조회
  const priceRes = await axios.get(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`, {
    headers: makeHeaders(token, creds.appKey, creds.appSecret, 'FHKST01010100'),
    params: { FID_COND_MRKT_DIV_CODE: 'J', FID_INPUT_ISCD: code },
  });

  if (priceRes.data.rt_cd !== '0') {
    throw new Error(priceRes.data.msg1 || '종목 정보를 찾을 수 없습니다.');
  }

  const p = priceRes.data.output;
  if (!p) throw new Error('응답 데이터가 없습니다.');

  // 종목 상세(업종) — 모의투자 서버는 bstp_kor_isnm으로 대체, 실서버는 CTPF1002R
  let sector = p.bstp_kor_isnm ?? '';
  if (!creds.isMock) {
    try {
      const detailRes = await axios.get(`${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`, {
        headers: makeHeaders(token, creds.appKey, creds.appSecret, 'CTPF1002R'),
        params: { PDNO: code, PRDT_TYPE_CD: '300' },
      });
      sector = detailRes.data.output?.std_idst_clsf_cd_name ?? sector;
    } catch {
      // 업종 정보 없어도 계속
    }
  }

  return {
    code,
    name: (p.hts_kor_isnm || p.prdt_name || p.prdt_abrv_name || '').trim() || code,
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
    sector,
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

  // 숫자만이면 코드 직접 조회, 아니면 이름 검색(CTPF1604R)
  const isCode = /^\d+$/.test(keyword.trim());

  // 코드 조회: CTPF1002R 시도 → 실패 시 getStockPrice fallback
  if (isCode) {
    const code = keyword.trim();

    // CTPF1002R 시도 (모의투자 서버 미지원 → 바로 fallback)
    if (!creds.isMock) {
      try {
        const response = await axios.get(
          `${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`,
          {
            headers: makeHeaders(token, creds.appKey, creds.appSecret, 'CTPF1002R'),
            params: { PDNO: code, PRDT_TYPE_CD: '300' },
          }
        );
        if (response.data.rt_cd === '0' && response.data.output?.pdno) {
          const item = response.data.output;
          return [{
            code: item.pdno,
            name: item.prdt_abrv_name || item.prdt_name || '',
            market: item.mket_id_cd === '1' ? 'KOSPI' : 'KOSDAQ',
            type: item.etf_gb_cd === '1' ? 'etf' : 'stock',
          }];
        }
      } catch {
        // CTPF1002R 미지원 — fallback
      }
    }

    // Fallback: getStockPrice로 이름 조회 (모의투자 서버는 종목명 미반환 → code로 대체)
    try {
      const price = await getStockPrice(code);
      return [{
        code,
        name: price.name || code,
        market: '',
        type: 'stock',
      }];
    } catch {
      // 유효하지 않은 코드
    }

    return [];
  }

  // 이름 검색(CTPF1604R) — 모의투자 서버에서는 미지원
  if (creds.isMock) {
    throw new Error('모의투자 환경에서는 이름 검색이 지원되지 않습니다.\n종목 코드(숫자)로 검색해 주세요.');
  }

  let response;
  try {
    response = await axios.get(
      `${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`,
      {
        headers: makeHeaders(token, creds.appKey, creds.appSecret, 'CTPF1604R'),
        params: { PDNO_ABRV_NAME: keyword, PRDT_TYPE_CD: '300' },
      }
    );
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { msg1?: string } } })?.response?.data?.msg1;
    throw new Error(msg || '종목 검색 중 오류가 발생했습니다.');
  }

  if (response.data.rt_cd !== '0') {
    throw new Error(response.data.msg1 || '종목 검색에 실패했습니다.');
  }

  const results: SearchResult[] = [];
  if (response.data.output2) {
    for (const item of (response.data.output2 as Record<string, string>[]).slice(0, 10)) {
      if (item.pdno) {
        results.push({
          code: item.pdno,
          name: item.prdt_abrv_name || item.prdt_name || '',
          market: item.mket_id_cd === '1' ? 'KOSPI' : 'KOSDAQ',
          type: item.etf_gb_cd === '1' ? 'etf' : 'stock',
        });
      }
    }
  }

  return results;
}

import axios from 'axios';
import { AccountBalance, Holding } from '../types';
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

export async function getAccountBalance(): Promise<AccountBalance> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);
  const [accountPrefix, accountSuffix] = creds.accountNumber.split('-');
  const trId = creds.isMock ? 'VTTC8434R' : 'TTTC8434R';

  const response = await axios.get(
    `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-account-balance`,
    {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, trId),
      params: {
        CANO: accountPrefix,
        ACNT_PRDT_CD: accountSuffix ?? '01',
        AFHR_FLPR_YN: 'N',
        OFL_YN: 'N',
        INQR_DVSN: '01',
        UNPR_DVSN: '01',
        FUND_STTL_ICLD_YN: 'N',
        FNCG_AMT_AUTO_RDPT_YN: 'N',
        PRCS_DVSN: '00',
        CTX_AREA_FK100: '',
        CTX_AREA_NK100: '',
      },
    }
  );

  const data = response.data;
  const summary = data.output2?.[0] ?? {};

  return {
    totalAsset: Number(summary.tot_asst_amt ?? 0),
    cashBalance: Number(summary.dnca_tot_amt ?? 0),
    stockEvalAmount: Number(summary.scts_evlu_amt ?? 0),
    profitLoss: Number(summary.evlu_pfls_smtl_amt ?? 0),
    profitLossRate: Number(summary.asst_icdc_erng_rt ?? 0),
  };
}

export async function getHoldings(): Promise<Holding[]> {
  const creds = getCredentials();
  if (!creds) throw new Error('인증 정보가 없습니다.');

  const token = await getAccessToken();
  const baseUrl = getBaseUrl(creds.isMock);
  const [accountPrefix, accountSuffix] = creds.accountNumber.split('-');
  const trId = creds.isMock ? 'VTTC8434R' : 'TTTC8434R';

  const response = await axios.get(
    `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`,
    {
      headers: makeHeaders(token, creds.appKey, creds.appSecret, trId),
      params: {
        CANO: accountPrefix,
        ACNT_PRDT_CD: accountSuffix ?? '01',
        AFHR_FLPR_YN: 'N',
        OFL_YN: 'N',
        INQR_DVSN: '01',
        UNPR_DVSN: '01',
        FUND_STTL_ICLD_YN: 'N',
        FNCG_AMT_AUTO_RDPT_YN: 'N',
        PRCS_DVSN: '00',
        CTX_AREA_FK100: '',
        CTX_AREA_NK100: '',
      },
    }
  );

  const data = response.data;

  const items: Holding[] = (data.output1 ?? []).map((item: Record<string, string>) => ({
    code: item.pdno,
    name: item.prdt_name,
    quantity: Number(item.hldg_qty),
    avgPrice: Number(item.pchs_avg_pric),
    currentPrice: Number(item.prpr),
    evalAmount: Number(item.evlu_amt),
    profitLoss: Number(item.evlu_pfls_amt),
    profitLossRate: Number(item.evlu_pfls_rt),
    holdingRatio: Number(item.hldg_rt ?? 0),
  }));

  return items;
}

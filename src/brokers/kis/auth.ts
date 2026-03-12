import axios from 'axios';
import { AuthToken, LoginCredentials } from '../types';
import { storage } from '../../utils/storage';
import { KIS_BASE_URL, KIS_MOCK_BASE_URL, STORAGE_KEYS } from '../../utils/constants';

interface KISCredentials extends LoginCredentials {
  isMock: boolean;
}

let currentCredentials: KISCredentials | null = null;

export function getBaseUrl(isMock: boolean): string {
  return isMock ? KIS_MOCK_BASE_URL : KIS_BASE_URL;
}

export async function loadCredentials(): Promise<KISCredentials | null> {
  const appKey = await storage.get(STORAGE_KEYS.KIS_APP_KEY);
  const appSecret = await storage.get(STORAGE_KEYS.KIS_APP_SECRET);
  const accountNumber = await storage.get(STORAGE_KEYS.KIS_ACCOUNT);
  const isMockStr = await storage.get(STORAGE_KEYS.IS_MOCK);

  if (!appKey || !appSecret || !accountNumber) return null;

  currentCredentials = {
    appKey,
    appSecret,
    accountNumber,
    isMock: isMockStr === 'true',
  };
  return currentCredentials;
}

export function getCredentials(): KISCredentials | null {
  return currentCredentials;
}

export async function issueToken(credentials: LoginCredentials): Promise<AuthToken> {
  const isMock = credentials.isMock ?? false;
  const baseUrl = getBaseUrl(isMock);

  const response = await axios.post(
    `${baseUrl}/oauth2/tokenP`,
    {
      grant_type: 'client_credentials',
      appkey: credentials.appKey,
      appsecret: credentials.appSecret,
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = response.data;
  const expiresAt = Date.now() + (data.expires_in - 60) * 1000;

  const token: AuthToken = {
    accessToken: data.access_token,
    expiresAt,
    tokenType: data.token_type,
  };

  await storage.set(STORAGE_KEYS.KIS_ACCESS_TOKEN, token.accessToken);
  await storage.set(STORAGE_KEYS.KIS_TOKEN_EXPIRES, String(token.expiresAt));

  currentCredentials = {
    appKey: credentials.appKey,
    appSecret: credentials.appSecret,
    accountNumber: credentials.accountNumber!,
    isMock,
  };

  await storage.set(STORAGE_KEYS.KIS_APP_KEY, credentials.appKey);
  await storage.set(STORAGE_KEYS.KIS_APP_SECRET, credentials.appSecret);
  await storage.set(STORAGE_KEYS.KIS_ACCOUNT, credentials.accountNumber!);
  await storage.set(STORAGE_KEYS.IS_MOCK, String(isMock));

  return token;
}

export async function getAccessToken(): Promise<string> {
  const tokenStr = await storage.get(STORAGE_KEYS.KIS_ACCESS_TOKEN);
  const expiresStr = await storage.get(STORAGE_KEYS.KIS_TOKEN_EXPIRES);

  if (!tokenStr || !expiresStr) {
    throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
  }

  const expiresAt = Number(expiresStr);
  if (Date.now() >= expiresAt) {
    // 토큰 만료 - 재발급
    const creds = await loadCredentials();
    if (!creds) throw new Error('저장된 인증 정보가 없습니다.');
    const newToken = await issueToken(creds);
    return newToken.accessToken;
  }

  return tokenStr;
}

export async function isTokenValid(): Promise<boolean> {
  const tokenStr = await storage.get(STORAGE_KEYS.KIS_ACCESS_TOKEN);
  const expiresStr = await storage.get(STORAGE_KEYS.KIS_TOKEN_EXPIRES);
  if (!tokenStr || !expiresStr) return false;
  return Date.now() < Number(expiresStr);
}

export async function clearTokens(): Promise<void> {
  await storage.delete(STORAGE_KEYS.KIS_ACCESS_TOKEN);
  await storage.delete(STORAGE_KEYS.KIS_TOKEN_EXPIRES);
  currentCredentials = null;
}

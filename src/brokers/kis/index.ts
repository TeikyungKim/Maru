import { BrokerAPI, LoginCredentials, AuthToken, AccountBalance, Holding, OrderRequest, OrderResult, StockPrice, StockInfo, ETFInfo, SearchResult } from '../types';
import { issueToken, isTokenValid as checkTokenValid, clearTokens } from './auth';
import { getAccountBalance, getHoldings } from './account';
import { getStockPrice, getStockInfo, getETFInfo, searchStock } from './market';
import { buyStock, sellStock } from './order';
import { subscribePrice, unsubscribePrice } from './websocket';

export class KISBroker implements BrokerAPI {
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    return issueToken(credentials);
  }

  async refreshToken(): Promise<AuthToken> {
    const { loadCredentials, issueToken: reissue } = await import('./auth');
    const creds = await loadCredentials();
    if (!creds) throw new Error('저장된 인증 정보가 없습니다.');
    return reissue(creds);
  }

  async isTokenValid(): Promise<boolean> {
    return checkTokenValid();
  }

  async getAccountBalance(): Promise<AccountBalance> {
    return getAccountBalance();
  }

  async getHoldings(): Promise<Holding[]> {
    return getHoldings();
  }

  async buyStock(order: OrderRequest): Promise<OrderResult> {
    return buyStock(order);
  }

  async sellStock(order: OrderRequest): Promise<OrderResult> {
    return sellStock(order);
  }

  async getStockPrice(code: string): Promise<StockPrice> {
    return getStockPrice(code);
  }

  async getStockInfo(code: string): Promise<StockInfo> {
    return getStockInfo(code);
  }

  async getETFInfo(code: string): Promise<ETFInfo> {
    return getETFInfo(code);
  }

  async searchStock(keyword: string): Promise<SearchResult[]> {
    return searchStock(keyword);
  }

  subscribePrice(code: string, callback: (price: StockPrice) => void): void {
    subscribePrice(code, callback);
  }

  unsubscribePrice(code: string): void {
    unsubscribePrice(code);
  }
}


import axios from 'axios';
import { PriceData, Token, ChainId } from '../types';
import { API_KEYS } from '../config';
import logger from '../utils/logger';

export class PriceFeedAggregator {
  private priceCache: Map<string, PriceData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private websockets: Map<string, any> = new Map();

  constructor() {
    this.startPriceUpdates();
  }

  private startPriceUpdates(): void {
    // Update prices every 100ms for ultra-fast trading
    this.updateInterval = setInterval(async () => {
      await this.updateAllPrices();
    }, 100);

    logger.info('Price feed aggregator started with 100ms update interval');
  }

  private async updateAllPrices(): Promise<void> {
    try {
      await Promise.all([
        this.updateBinancePrices(),
        this.updateCoinbasePrices(),
        this.updateCoingeckoPrices()
      ]);
    } catch (error) {
      logger.error('Error updating prices:', error);
    }
  }

  private async updateBinancePrices(): Promise<void> {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
        timeout: 5000
      });

      const tickers = response.data;
      const timestamp = Date.now();

      for (const ticker of tickers) {
        if (ticker.symbol.endsWith('USDT')) {
          const symbol = ticker.symbol.replace('USDT', '');
          const priceData: PriceData = {
            token: symbol,
            price: parseFloat(ticker.lastPrice),
            timestamp,
            source: 'binance',
            volume24h: parseFloat(ticker.volume),
            priceChange24h: parseFloat(ticker.priceChangePercent)
          };

          this.priceCache.set(`binance:${symbol}`, priceData);
        }
      }
    } catch (error) {
      logger.debug('Binance price update failed:', error);
    }
  }

  private async updateCoinbasePrices(): Promise<void> {
    try {
      const response = await axios.get('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
        timeout: 5000
      });

      const rates = response.data.data.rates;
      const timestamp = Date.now();

      for (const [symbol, rate] of Object.entries(rates)) {
        const priceData: PriceData = {
          token: symbol,
          price: 1 / parseFloat(rate as string),
          timestamp,
          source: 'coinbase'
        };

        this.priceCache.set(`coinbase:${symbol}`, priceData);
      }
    } catch (error) {
      logger.debug('Coinbase price update failed:', error);
    }
  }

  private async updateCoingeckoPrices(): Promise<void> {
    try {
      const topCoins = [
        'bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana',
        'polkadot', 'dogecoin', 'avalanche-2', 'polygon', 'chainlink',
        'uniswap', 'litecoin', 'algorand', 'cosmos', 'stellar'
      ];

      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: topCoins.join(','),
          vs_currencies: 'usd',
          include_24hr_vol: true,
          include_24hr_change: true
        },
        timeout: 5000,
        headers: API_KEYS.coingecko ? { 'x-cg-pro-api-key': API_KEYS.coingecko } : {}
      });

      const timestamp = Date.now();

      for (const [coinId, data] of Object.entries(response.data)) {
        const priceData: PriceData = {
          token: coinId,
          price: (data as any).usd,
          timestamp,
          source: 'coingecko',
          volume24h: (data as any).usd_24h_vol,
          priceChange24h: (data as any).usd_24h_change
        };

        this.priceCache.set(`coingecko:${coinId}`, priceData);
      }
    } catch (error) {
      logger.debug('Coingecko price update failed:', error);
    }
  }

  public getPrice(token: string, source?: string): PriceData | null {
    if (source) {
      return this.priceCache.get(`${source}:${token}`) || null;
    }

    // Try all sources
    const sources = ['binance', 'coinbase', 'coingecko'];
    for (const src of sources) {
      const price = this.priceCache.get(`${src}:${token}`);
      if (price) return price;
    }

    return null;
  }

  public getAveragePrice(token: string): number | null {
    const prices: number[] = [];
    const sources = ['binance', 'coinbase', 'coingecko'];

    for (const source of sources) {
      const priceData = this.priceCache.get(`${source}:${token}`);
      if (priceData && Date.now() - priceData.timestamp < 10000) { // Within 10 seconds
        prices.push(priceData.price);
      }
    }

    if (prices.length === 0) return null;

    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  public getAllPrices(): Map<string, PriceData> {
    return new Map(this.priceCache);
  }

  public getPricesBySource(source: string): PriceData[] {
    const prices: PriceData[] = [];
    
    for (const [key, value] of this.priceCache.entries()) {
      if (key.startsWith(`${source}:`)) {
        prices.push(value);
      }
    }

    return prices;
  }

  public async getTokenPrice(token: Token): Promise<number | null> {
    // Try to get price from multiple sources
    const symbol = token.symbol.toUpperCase();
    
    // Try direct lookup
    let price = this.getAveragePrice(symbol);
    if (price) return price;

    // Try common variations
    const variations = [
      symbol,
      symbol.replace('W', ''), // WETH -> ETH
      symbol.replace('WBTC', 'BTC'),
      symbol.replace('USDC', 'USD'),
      symbol.replace('USDT', 'USD')
    ];

    for (const variation of variations) {
      price = this.getAveragePrice(variation);
      if (price) return price;
    }

    return null;
  }

  public getArbitragePrices(token: string): { source: string; price: number }[] {
    const prices: { source: string; price: number }[] = [];
    const sources = ['binance', 'coinbase', 'coingecko'];

    for (const source of sources) {
      const priceData = this.priceCache.get(`${source}:${token}`);
      if (priceData && Date.now() - priceData.timestamp < 5000) { // Within 5 seconds
        prices.push({ source, price: priceData.price });
      }
    }

    return prices.sort((a, b) => a.price - b.price);
  }

  public findArbitrageOpportunities(minProfitPercent: number = 0.5): Array<{
    token: string;
    buySource: string;
    sellSource: string;
    buyPrice: number;
    sellPrice: number;
    profitPercent: number;
  }> {
    const opportunities: Array<any> = [];
    const tokens = new Set<string>();

    // Collect all unique tokens
    for (const key of this.priceCache.keys()) {
      const token = key.split(':')[1];
      tokens.add(token);
    }

    // Check each token for arbitrage
    for (const token of tokens) {
      const prices = this.getArbitragePrices(token);
      
      if (prices.length >= 2) {
        const lowest = prices[0];
        const highest = prices[prices.length - 1];
        const profitPercent = ((highest.price - lowest.price) / lowest.price) * 100;

        if (profitPercent >= minProfitPercent) {
          opportunities.push({
            token,
            buySource: lowest.source,
            sellSource: highest.source,
            buyPrice: lowest.price,
            sellPrice: highest.price,
            profitPercent
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Close all websockets
    for (const ws of this.websockets.values()) {
      if (ws && ws.close) {
        ws.close();
      }
    }

    logger.info('Price feed aggregator stopped');
  }
}

export const priceFeedAggregator = new PriceFeedAggregator();

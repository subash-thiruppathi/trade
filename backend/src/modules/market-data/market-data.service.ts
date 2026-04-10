import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import YahooFinance from 'yahoo-finance2';
import { MarketWebSocketGateway } from './market-websocket.gateway';

const yahooFinance = new YahooFinance();

interface StockTick {
  symbol: string;
  lastPrice: string;
  volume: number;
  timestamp: string;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  private readonly symbolMap: Record<string, string> = {
    RELIANCE: 'RELIANCE.NS',
    HDFC: 'HDFCLIFE.NS',
    TCS: 'TCS.NS',
    INFOSYS: 'INFY.NS',
    ICICI: 'ICICIBANK.NS',
    HDFCBANK: 'HDFCBANK.NS',
    AXISBANK: 'AXISBANK.NS',
    KOTAKBANK: 'KOTAKBANK.NS',
    SBIN: 'SBIN.NS',
    TATASTEEL: 'TATASTEEL.NS',
    JSWSTEEL: 'JSWSTEEL.NS',
    HINDALCO: 'HINDALCO.NS',
    SUNPHARMA: 'SUNPHARMA.NS',
    CIPLA: 'CIPLA.NS',
    DRREDDY: 'DRREDDY.NS',
    MARUTI: 'MARUTI.NS',
    'M&M': 'M&M.NS',
    TATAMOTORS: 'TATAMOTORS.NS',
  };

  // Keep a small in-memory cache to facilitate the OMS Execution Router
  private readonly liveCache = new Map<string, number>();

  constructor(
    @Inject(forwardRef(() => MarketWebSocketGateway))
    private readonly marketGateway: MarketWebSocketGateway,
  ) { }

  /** Public getter for the OMS exchange router to execute orders precisely */
  getLivePrice(symbol: string): number | null {
    return this.liveCache.get(symbol) || null;
  }

  // Polls Yahoo Finance API every 2 seconds to stream real market data
  @Interval(2000)
  async generateTickData() {
    try {
      const symbolsToFetch = Object.values(this.symbolMap);
      const quotes = (await yahooFinance.quote(symbolsToFetch)) as any[];

      quotes.forEach((quote) => {
        // Reverse map Yahoo symbol back to internal symbol
        const internalSymbol = Object.keys(this.symbolMap).find(
          (k) => this.symbolMap[k] === quote.symbol,
        );

        if (internalSymbol && quote.regularMarketPrice) {
          const lastPrice = quote.regularMarketPrice;
          const volume = quote.regularMarketVolume || 0;

          // Update the cache for actual OMS execution
          this.liveCache.set(internalSymbol, lastPrice);

          const tick: StockTick = {
            symbol: internalSymbol,
            lastPrice: lastPrice.toString(),
            volume,
            timestamp: new Date().toISOString(),
          };

          // Push tick directly to WebSocket gateway (in-process)
          this.marketGateway.broadcastTick(tick);
        }
      });
    } catch (error: any) {
      this.logger.error(`[Market Feed] Failed to fetch real-time data: ${error.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';

@Injectable()
export class BlackScholesService {
    private readonly logger = new Logger(BlackScholesService.name);

    constructor(private readonly marketDataService: MarketDataService) { }

    // Standard Normal Cumulative Distribution Function
    private CND(x: number): number {
        const a1 = 0.31938153;
        const a2 = -0.356563782;
        const a3 = 1.781477937;
        const a4 = -1.821255978;
        const a5 = 1.330274429;
        const L = Math.abs(x);
        const K = 1.0 / (1.0 + 0.2316419 * L);
        const w = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
        if (x < 0) {
            return 1.0 - w;
        }
        return w;
    }

    // Calculate Option Price
    private calculatePrice(S: number, X: number, T: number, r: number, v: number, type: 'CALL' | 'PUT'): number {
        const d1 = (Math.log(S / X) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
        const d2 = d1 - v * Math.sqrt(T);

        if (type === 'CALL') {
            return S * this.CND(d1) - X * Math.exp(-r * T) * this.CND(d2);
        } else {
            return X * Math.exp(-r * T) * this.CND(-d2) - S * this.CND(-d1);
        }
    }

    // Calculate Greeks
    private getGreeks(S: number, X: number, T: number, r: number, v: number) {
        const d1 = (Math.log(S / X) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
        const d2 = d1 - v * Math.sqrt(T);
        const nd1 = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-Math.pow(d1, 2) / 2);

        const callDelta = this.CND(d1);
        const putDelta = callDelta - 1;

        const gamma = nd1 / (S * v * Math.sqrt(T));
        const vega = S * nd1 * Math.sqrt(T) / 100;
        const callTheta = (- (S * v * nd1) / (2 * Math.sqrt(T)) - r * X * Math.exp(-r * T) * this.CND(d2)) / 365;
        const putTheta = (- (S * v * nd1) / (2 * Math.sqrt(T)) + r * X * Math.exp(-r * T) * this.CND(-d2)) / 365;

        return {
            callDelta, putDelta, gamma, vega, callTheta, putTheta
        };
    }

    async generateOptionChain(symbol: string, strikeCount: number = 10, expiryDays: number = 7) {
        // 1. Standardize the symbol to match internal MarketDataService cache map
        const cleanSymbol = symbol.replace('.NS', '').toUpperCase();
        const spotPrice = this.marketDataService.getLivePrice(cleanSymbol);

        if (!spotPrice) {
            throw new Error(`Spot price unavailable for ${cleanSymbol}. Please try again in 5 seconds as WebSockets connect.`);
        }

        const strikes: any[] = [];

        // Step size heuristics based on Indian spot price tiers
        let step = 50;
        if (spotPrice > 10000) step = 100;       // Like BankNifty
        else if (spotPrice < 1000) step = 10;    // Like Tata Motors
        else if (spotPrice < 200) step = 5;      // Like Zomato

        // Closest At-The-Money (ATM) Strike
        const atmStrike = Math.round(spotPrice / step) * step;

        const r = 0.06; // 6% risk free rate representing Indian Repo Rate

        // Pseudo-random IV generation around 15-30%
        const getSimulatedIV = (strike: number) => {
            const distance = Math.abs(strike - spotPrice) / spotPrice;
            return 0.15 + (distance * 1.5); // Volatility smile simulator
        };

        const T = expiryDays / 365.0;

        for (let i = -strikeCount; i <= strikeCount; i++) {
            const strike = atmStrike + (i * step);
            if (strike <= 0) continue;

            const v = getSimulatedIV(strike);

            const callLTP = this.calculatePrice(spotPrice, strike, T, r, v, 'CALL');
            const putLTP = this.calculatePrice(spotPrice, strike, T, r, v, 'PUT');
            const greeks = this.getGreeks(spotPrice, strike, T, r, v);

            // Simulated OI dropping off as it gets further OTM
            const dropoffFactor = 1 - Math.min(Math.abs(i) / strikeCount, 0.9);
            const callOI = Math.floor((Math.random() * 50000 + 10000) * dropoffFactor * 100);
            const putOI = Math.floor((Math.random() * 50000 + 10000) * dropoffFactor * 100);

            strikes.push({
                strikePrice: strike,
                impliedVolatility: (v * 100).toFixed(2),
                call: {
                    ltp: Math.max(callLTP, 0.05).toFixed(2),
                    oi: callOI,
                    delta: greeks.callDelta.toFixed(4),
                    theta: greeks.callTheta.toFixed(4),
                    gamma: greeks.gamma.toFixed(4),
                    vega: greeks.vega.toFixed(4)
                },
                put: {
                    ltp: Math.max(putLTP, 0.05).toFixed(2),
                    oi: putOI,
                    delta: greeks.putDelta.toFixed(4),
                    theta: greeks.putTheta.toFixed(4),
                    gamma: greeks.gamma.toFixed(4),
                    vega: greeks.vega.toFixed(4)
                }
            });
        }

        return { symbol, spotPrice, expiryDays, step, strikes };
    }
}

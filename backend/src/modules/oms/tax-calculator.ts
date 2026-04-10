import { Decimal } from 'decimal.js';

export interface TaxBreakdown {
    brokerage: Decimal;
    stt: Decimal; // Securities Transaction Tax
    exchangeCharge: Decimal;
    gst: Decimal;
    stampDuty: Decimal;
    totalCharges: Decimal;
}

export function calculateIndianTaxes(
    turnover: Decimal,
    isBuy: boolean,
    productType: 'INTRADAY' | 'DELIVERY' | 'MARGIN'
): TaxBreakdown {
    // 1. Brokerage (Max Rs 20, or 0.05% for intraday, 0% for delivery conceptually but let's charge Rs 20 for simplicity)
    let brokerage = new Decimal(20);
    if (productType === 'INTRADAY') {
        const calculatedBrokerage = turnover.mul(0.0005);
        brokerage = Decimal.min(20, calculatedBrokerage);
    }

    // 2. STT (Securities Transaction Tax)
    let stt = new Decimal(0);
    if (productType === 'DELIVERY' || productType === 'MARGIN') {
        stt = turnover.mul(0.001); // 0.1% on both Buy and Sell
    } else if (productType === 'INTRADAY' && !isBuy) {
        stt = turnover.mul(0.00025); // 0.025% on Sell only
    }

    // 3. Exchange Transaction Charges (NSE standard ~0.00325%)
    const exchangeCharge = turnover.mul(0.0000325);

    // 4. GST (18% on Brokerage + Exchange Charges)
    const gst = brokerage.plus(exchangeCharge).mul(0.18);

    // 5. Stamp Duty (0.015% on Buy only)
    let stampDuty = new Decimal(0);
    if (isBuy) {
        stampDuty = turnover.mul(0.00015);
    }

    const totalCharges = brokerage.plus(stt).plus(exchangeCharge).plus(gst).plus(stampDuty);

    return {
        brokerage,
        stt,
        exchangeCharge,
        gst,
        stampDuty,
        totalCharges
    };
}

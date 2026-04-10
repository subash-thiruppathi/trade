'use client';

import React, { useState, useEffect } from 'react';

interface OrderTicketProps {
  userId: string;
  selectedSymbol?: string;
  currentPrice?: number;
  defaultSide?: 'BUY' | 'SELL';
}

export default function OrderTicket({ userId, selectedSymbol = 'RELIANCE', currentPrice = 2950.00, defaultSide = 'BUY' }: OrderTicketProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>(defaultSide);
  const [productType, setProductType] = useState<'INTRADAY' | 'DELIVERY'>('INTRADAY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL' | 'SL_M'>('MARKET');

  const [quantity, setQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>(currentPrice.toString());
  const [triggerPrice, setTriggerPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Sync initial price if symbol changes
  useEffect(() => {
    setPrice(currentPrice.toString());
  }, [currentPrice, selectedSymbol]);

  // Calculate Margin
  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = (orderType === 'LIMIT' || orderType === 'SL') ? (parseFloat(price) || currentPrice) : currentPrice;
  const totalValue = qtyNum * priceNum;
  // Mock Margin Multiplier: 5x for Intraday (requires 20%), 1x for Delivery (requires 100%)
  const marginRequired = productType === 'INTRADAY' ? totalValue * 0.20 : totalValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyNum <= 0) return;
    if (orderType === 'LIMIT' && parseFloat(price) <= 0) return;

    setIsSubmitting(true);
    setStatus(null);

    const payload = {
      userId: userId, // Dynamic from parent
      symbol: selectedSymbol,
      side,
      orderType,
      productType,
      requestedQty: qtyNum,
      ...((orderType === 'LIMIT' || orderType === 'SL') ? { price: parseFloat(price) } : {}),
      ...((orderType === 'SL' || orderType === 'SL_M') ? { triggerPrice: parseFloat(triggerPrice) } : {})
    };

    try {
      const res = await fetch('http://localhost:3001/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', msg: `Order Submitted: ${data.idempotencyKey}` });
      } else {
        setStatus({ type: 'error', msg: data.message || 'Order failed' });
      }
    } catch (err) {
      setStatus({ type: 'error', msg: 'Network error connecting to OMS.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const isBuy = side === 'BUY';

  return (
    <div className="w-[400px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col font-sans">
      {/* Header - Buy/Sell Toggle */}
      <div className="flex text-lg font-bold">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`flex-1 py-3 text-center transition-colors ${isBuy ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`flex-1 py-3 text-center transition-colors ${!isBuy ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          SELL
        </button>
      </div>

      <div className="p-5 flex flex-col gap-5">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100">{selectedSymbol}</h3>
            <span className="text-xs text-gray-500">NSE</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500 mr-2">LTP</span>
            <span className="font-mono font-medium text-gray-800 dark:text-gray-200">₹{currentPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium">
          <button onClick={() => setProductType('INTRADAY')} className={`flex-1 py-1.5 rounded-md transition-colors ${productType === 'INTRADAY' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>INTRADAY <span className="text-[10px] ml-1 opacity-70">MIS</span></button>
          <button onClick={() => setProductType('DELIVERY')} className={`flex-1 py-1.5 rounded-md transition-colors ${productType === 'DELIVERY' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>DELIVERY <span className="text-[10px] ml-1 opacity-70">CNC</span></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Qty.</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Price</label>
              <input
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET' || orderType === 'SL_M'}
                value={(orderType === 'MARKET' || orderType === 'SL_M') ? currentPrice : price}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono dark:text-white ${(orderType === 'MARKET' || orderType === 'SL_M') ? 'bg-gray-100 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
              <input type="radio" name="orderType" checked={orderType === 'MARKET'} onChange={() => setOrderType('MARKET')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
              Market
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
              <input type="radio" name="orderType" checked={orderType === 'LIMIT'} onChange={() => setOrderType('LIMIT')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
              Limit
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
              <input type="radio" name="orderType" checked={orderType === 'SL'} onChange={() => setOrderType('SL')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
              SL
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
              <input type="radio" name="orderType" checked={orderType === 'SL_M'} onChange={() => setOrderType('SL_M')} className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
              SL-M
            </label>
          </div>

          {(orderType === 'SL' || orderType === 'SL_M') && (
            <div className="mt-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Trigger Price</label>
              <input
                type="number"
                step="0.05"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                placeholder="0.00"
                required
              />
            </div>
          )}

          <div className="mt-2 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-gray-500">Margin Req.</span>
            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">₹{marginRequired.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-bold text-white uppercase tracking-wider transition-all transform active:scale-[0.98] mt-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed bg-gray-500' : isBuy ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 shadow-lg' : 'bg-red-500 hover:bg-red-600 shadow-red-500/30 shadow-lg'}`}
          >
            {isSubmitting ? 'Processing...' : `${side} ${selectedSymbol}`}
          </button>

          {status && (
            <div className={`p-2 rounded text-xs font-medium text-center ${status.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {status.msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
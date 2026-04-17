'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

// Mocked Position interface
interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  productType?: 'INTRADAY' | 'DELIVERY'; // Backend assumes INTRADAY for Position table
}

export default function PositionsTable({ userId }: { userId: string }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  // UI Interaction States
  const [squareOffPosition, setSquareOffPosition] = useState<Position | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch live positions from database
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/portfolio/${userId}/positions`);
        const data = await res.json();
        const parsedPositions = data.map((p: any) => ({
          ...p,
          quantity: parseFloat(p.quantity),
          averagePrice: parseFloat(p.averagePrice),
          productType: 'INTRADAY'
        }));
        setPositions(parsedPositions);
      } catch (err) {
        console.error('Failed to fetch positions');
      }
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/market`);

    socket.on('connect', () => {
      // Subscribe to all symbols we have open positions in
      positions.forEach(p => socket.emit('subscribe', p.symbol));
    });

    socket.on('tick', (data: any) => {
      setLivePrices(prev => ({
        ...prev,
        [data.symbol]: parseFloat(data.lastPrice)
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [positions]);

  const confirmSquareOff = (position: Position) => {
    setSquareOffPosition(position);
  };

  const executeSquareOff = async () => {
    if (!squareOffPosition) return;
    const side = squareOffPosition.quantity > 0 ? 'SELL' : 'BUY';
    const absQty = Math.abs(squareOffPosition.quantity);

    // Simulating OMS Square Off Call
    showToast(`Squaring Off Complete: ${side} ${absQty} ${squareOffPosition.symbol} @ MARKET ROUTED`);
    setSquareOffPosition(null);
  };

  const calculatePnl = (pos: Position) => {
    const ltp = livePrices[pos.symbol];
    if (!ltp) return { pnl: 0, pnlPercent: 0 };

    let pnl = 0;
    if (pos.quantity > 0) {
      pnl = (ltp - pos.averagePrice) * pos.quantity;
    } else {
      pnl = (pos.averagePrice - ltp) * Math.abs(pos.quantity);
    }

    const investment = pos.averagePrice * Math.abs(pos.quantity);
    const pnlPercent = (pnl / investment) * 100;

    return { pnl, pnlPercent };
  };

  // Calculate Total PnL
  const totalPnl = positions.reduce((acc, pos) => acc + calculatePnl(pos).pnl, 0);

  return (
    <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col relative">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">POSITIONS</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Total MTM</span>
          <span className={`text-lg font-bold font-mono ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-medium">Product</th>
              <th className="p-4 font-medium">Instrument</th>
              <th className="p-4 font-medium text-right">Qty.</th>
              <th className="p-4 font-medium text-right">Avg.</th>
              <th className="p-4 font-medium text-right">LTP</th>
              <th className="p-4 font-medium text-right">P&L</th>
              <th className="p-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {positions.map((pos) => {
              const { pnl, pnlPercent } = calculatePnl(pos);
              const ltp = livePrices[pos.symbol];
              const isProfit = pnl >= 0;

              return (
                <tr key={pos.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${pos.productType === 'INTRADAY' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'}`}>
                      {pos.productType === 'INTRADAY' ? 'MIS' : 'CNC'}
                    </span>
                  </td>
                  <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{pos.symbol}</td>
                  <td className={`p-4 text-right font-mono font-medium ${pos.quantity > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {pos.quantity > 0 ? `+${pos.quantity}` : pos.quantity}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-600 dark:text-gray-400">{pos.averagePrice.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono font-medium text-gray-800 dark:text-gray-200">
                    {ltp ? ltp.toFixed(2) : '-'}
                  </td>
                  <td className={`p-4 text-right font-mono font-medium ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                    {isProfit ? '+' : ''}{pnl.toFixed(2)}
                    <span className="block text-[10px] opacity-80">{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => confirmSquareOff(pos)}
                      className="text-xs font-semibold px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Exit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Global Embedded Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-100 text-black px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.4)] text-sm font-bold z-[200]">
          ✓ {toast}
        </div>
      )}

      {/* Square Off Confirmation Modal overlay */}
      {squareOffPosition && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-center">
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Execute Square Off?</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              You are instructing a MARKET closing order for <strong>{Math.abs(squareOffPosition.quantity)} units</strong> of {squareOffPosition.symbol}. This will execute immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setSquareOffPosition(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={executeSquareOff}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors"
              >
                EXECUTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
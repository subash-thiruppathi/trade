'use client';

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

interface Holding {
    id: string;
    symbol: string;
    quantity: number;
    averagePrice: number;
}

export default function HoldingsTable({ userId }: { userId: string }) {
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [livePrices, setLivePrices] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchHoldings = async () => {
            try {
                const res = await fetch(`http://localhost:3001/portfolio/${userId}/holdings`);
                const data = await res.json();
                const parsed = data.map((h: any) => ({
                    ...h,
                    quantity: parseFloat(h.quantity),
                    averagePrice: parseFloat(h.averagePrice)
                }));
                setHoldings(parsed);
            } catch (err) {
                console.error('Failed to fetch holdings');
            }
        };

        fetchHoldings();
        const interval = setInterval(fetchHoldings, 5000);
        return () => clearInterval(interval);
    }, [userId]);

    useEffect(() => {
        if (holdings.length === 0) return;
        const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001/market');

        socket.on('connect', () => {
            holdings.forEach(h => socket.emit('subscribe', h.symbol));
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
    }, [holdings]);

    const calculatePnl = (holding: Holding) => {
        const ltp = livePrices[holding.symbol];
        if (!ltp) return { inv: holding.quantity * holding.averagePrice, cv: 0, pnl: 0, pnlPercent: 0 };

        const inv = holding.quantity * holding.averagePrice;
        const cv = holding.quantity * ltp;
        const pnl = cv - inv;
        const pnlPercent = inv > 0 ? (pnl / inv) * 100 : 0;

        return { inv, cv, pnl, pnlPercent };
    };

    const totals = holdings.reduce((acc, h) => {
        const { inv, cv, pnl } = calculatePnl(h);
        return { inv: acc.inv + inv, cv: acc.cv + cv, pnl: acc.pnl + pnl };
    }, { inv: 0, cv: 0, pnl: 0 });

    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                <div className="flex gap-10">
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Investment</div>
                        <div className="text-xl font-mono text-gray-800 dark:text-gray-200 font-bold">₹{totals.inv.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Current Value</div>
                        <div className="text-xl font-mono text-gray-800 dark:text-gray-200 font-bold">₹{totals.cv.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total P&L</div>
                        <div className={`text-xl font-mono font-bold ${totals.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {totals.pnl >= 0 ? '+' : ''}₹{totals.pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase tracking-wider sticky top-0">
                            <th className="p-4 font-medium">Instrument</th>
                            <th className="p-4 font-medium text-right">Qty</th>
                            <th className="p-4 font-medium text-right">Avg Cost</th>
                            <th className="p-4 font-medium text-right">LTP</th>
                            <th className="p-4 font-medium text-right">Cur. Val</th>
                            <th className="p-4 font-medium text-right">P&L</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {holdings.map((h) => {
                            const { cv, pnl, pnlPercent } = calculatePnl(h);
                            const ltp = livePrices[h.symbol];
                            const isProfit = pnl >= 0;

                            return (
                                <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{h.symbol}</td>
                                    <td className="p-4 text-right font-mono font-medium text-gray-600 dark:text-gray-400">{h.quantity}</td>
                                    <td className="p-4 text-right font-mono text-gray-600 dark:text-gray-400">{h.averagePrice.toFixed(2)}</td>
                                    <td className="p-4 text-right font-mono font-medium text-gray-800 dark:text-gray-200">
                                        {ltp ? ltp.toFixed(2) : '-'}
                                    </td>
                                    <td className="p-4 text-right font-mono text-gray-800 dark:text-gray-200">
                                        {cv ? cv.toFixed(2) : '-'}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-medium ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                        {isProfit ? '+' : ''}{pnl.toFixed(2)}
                                        <span className="block text-[10px] opacity-80">{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</span>
                                    </td>
                                </tr>
                            );
                        })}
                        {holdings.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-10 text-gray-500 font-medium">No active holdings (CNC / SIPs).</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

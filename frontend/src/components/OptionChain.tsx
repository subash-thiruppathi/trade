'use client';

import React, { useState, useEffect } from 'react';

interface StrikeData {
    strikePrice: number;
    impliedVolatility: string;
    call: {
        ltp: string;
        oi: number;
        delta: string;
        theta: string;
        gamma: string;
        vega: string;
    };
    put: {
        ltp: string;
        oi: number;
        delta: string;
        theta: string;
        gamma: string;
        vega: string;
    };
}

interface OptionChainProps {
    symbol: string;
}

export default function OptionChain({ symbol }: OptionChainProps) {
    const [data, setData] = useState<StrikeData[]>([]);
    const [spotPrice, setSpotPrice] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChain = async () => {
            try {
                const res = await fetch(`http://localhost:3001/fno/option-chain/${symbol}?strikes=10&expiryDays=7`);
                const json = await res.json();
                if (json.status === 'success') {
                    setData(json.data.strikes);
                    setSpotPrice(json.data.spotPrice);
                }
            } catch (err) {
                console.error('Failed to fetch Option Chain:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChain();
        const interval = setInterval(fetchChain, 5000); // 5 sec live refresh
        return () => clearInterval(interval);
    }, [symbol]);

    if (loading) {
        return <div className="p-10 flex items-center justify-center animate-pulse text-gray-500">Generating Black-Scholes Derivatives Engine...</div>;
    }

    return (
        <div className="flex flex-col w-full h-[600px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden font-sans">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/40">
                <div>
                    <h2 className="text-xl font-bold dark:text-white">Option Chain : {symbol}</h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                        <span>Spot Price: <strong className="text-blue-600 dark:text-blue-400">₹{spotPrice.toFixed(2)}</strong></span>
                        <span>Expiry: <strong>7 Days (Simulated)</strong></span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold font-mono text-center leading-[14px]">ITM Calls<br />(In The Money)</span>
                    <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-bold font-mono text-center leading-[14px]">ITM Puts<br />(In The Money)</span>
                </div>
            </div>

            <div className="overflow-auto flex-1">
                <table className="w-full text-xs text-right border-collapse">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10 shadow-sm text-gray-500 dark:text-gray-400">
                        <tr>
                            <th colSpan={6} className="text-center py-2 font-bold text-gray-800 dark:text-gray-200 tracking-wider">CALLS</th>
                            <th className="text-center py-2 bg-gray-200 dark:bg-gray-700 text-black dark:text-white w-24">STRIKE</th>
                            <th colSpan={6} className="text-center py-2 font-bold text-gray-800 dark:text-gray-200 tracking-wider">PUTS</th>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-[10px] uppercase font-semibold">
                            <th className="py-2 px-2">OI</th>
                            <th className="py-2 px-2">Vega</th>
                            <th className="py-2 px-2">Theta</th>
                            <th className="py-2 px-2">Gamma</th>
                            <th className="py-2 px-2">Delta</th>
                            <th className="py-2 px-3 text-blue-600 dark:text-blue-400">LTP</th>

                            <th className="py-2 px-2 bg-gray-200 dark:bg-gray-700 text-center">IV</th>

                            <th className="py-2 px-3 text-blue-600 dark:text-blue-400">LTP</th>
                            <th className="py-2 px-2">Delta</th>
                            <th className="py-2 px-2">Gamma</th>
                            <th className="py-2 px-2">Theta</th>
                            <th className="py-2 px-2">Vega</th>
                            <th className="py-2 px-2">OI</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                        {data.map((row) => {
                            const callITM = row.strikePrice < spotPrice;
                            const putITM = row.strikePrice > spotPrice;

                            return (
                                <tr key={row.strikePrice} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    {/* CALLS */}
                                    <td className={`py-2 px-2 ${callITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.call.oi.toLocaleString('en-IN')}</td>
                                    <td className={`py-2 px-2 ${callITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.call.vega}</td>
                                    <td className={`py-2 px-2 text-red-500 ${callITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.call.theta}</td>
                                    <td className={`py-2 px-2 ${callITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.call.gamma}</td>
                                    <td className={`py-2 px-2 text-blue-500 ${callITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.call.delta}</td>
                                    <td className={`py-2 px-3 font-semibold text-gray-900 dark:text-gray-100 ${callITM ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>₹{row.call.ltp}</td>

                                    {/* STRIKE */}
                                    <td className="py-2 px-2 text-center font-bold bg-gray-100 dark:bg-gray-800/80 text-gray-800 dark:text-gray-200 relative group cursor-pointer">
                                        {row.strikePrice.toLocaleString('en-IN')}
                                        <div className="absolute inset-0 border border-transparent group-hover:border-blue-500 pointer-events-none transition-all"></div>
                                    </td>

                                    {/* PUTS */}
                                    <td className={`py-2 px-3 font-semibold text-gray-900 dark:text-gray-100 ${putITM ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>₹{row.put.ltp}</td>
                                    <td className={`py-2 px-2 text-blue-500 ${putITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.put.delta}</td>
                                    <td className={`py-2 px-2 ${putITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.put.gamma}</td>
                                    <td className={`py-2 px-2 text-red-500 ${putITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.put.theta}</td>
                                    <td className={`py-2 px-2 ${putITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.put.vega}</td>
                                    <td className={`py-2 px-2 ${putITM ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}>{row.put.oi.toLocaleString('en-IN')}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

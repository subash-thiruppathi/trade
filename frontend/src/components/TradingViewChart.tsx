'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, Time } from 'lightweight-charts';
import { io } from 'socket.io-client';

// Generate realistic mock data that terminates perfectly at the `targetLastPrice`
function generateData(targetLastPrice: number) {
    const res = [];
    const time = new Date().getTime() - 500 * 60 * 1000; // start 500 min ago
    let price = targetLastPrice;

    for (let i = 0; i < 500; i++) {
        const volatility = price * 0.002;
        const open = price + (Math.random() - 0.5) * volatility;
        const close = open + (Math.random() - 0.5) * volatility * 2;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;
        res.push({
            time: ((time + i * 60 * 1000) / 1000) as Time,
            open,
            high,
            low,
            close,
        });
        price = close;
    }

    // Offset all elements so the final close precisely hits the target LastPrice
    const diff = targetLastPrice - res[res.length - 1].close;
    return res.map(r => ({
        ...r,
        open: r.open + diff,
        high: r.high + diff,
        low: r.low + diff,
        close: r.close + diff
    }));
}

export default function TradingViewChart({ symbol, ltp }: { symbol: string, ltp?: number }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    const [liveLtp, setLiveLtp] = useState<number | undefined>(ltp);

    // Initial mount and chart generation
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#1a1a1a' },
                textColor: '#d1d5db',
            },
            grid: {
                vertLines: { color: '#2b2b2b' },
                horzLines: { color: '#2b2b2b' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            }
        });

        chartRef.current = chart;
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        seriesRef.current = candlestickSeries;

        const data = generateData(ltp || 2500);
        candlestickSeries.setData(data);

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [symbol]); // Recalculate if symbol changes

    // Update liveLtp when selected from parent changes
    useEffect(() => {
        setLiveLtp(ltp);
    }, [ltp]);

    // Independent WebSocket listener for this active symbol
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001/market');
        socket.on('connect', () => {
            socket.emit('subscribe', symbol);
        });

        socket.on('tick', (data: any) => {
            if (data.symbol === symbol) {
                setLiveLtp(parseFloat(data.lastPrice));
            }
        });

        return () => { socket.disconnect(); };
    }, [symbol]);

    // Update the last candle when liveLtp ticks
    useEffect(() => {
        if (!liveLtp || !seriesRef.current) return;

        const data = seriesRef.current.data();
        if (data && data.length > 0) {
            const last = data[data.length - 1];
            seriesRef.current.update({
                time: last.time,
                open: last.open,
                high: Math.max(last.high, liveLtp),
                low: Math.min(last.low, liveLtp),
                close: liveLtp,
            });
        }
    }, [liveLtp]);

    return (
        <div className="w-full h-full relative border border-gray-800 rounded-lg overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/60 to-transparent flex items-center gap-3">
                <span className="text-xl font-bold text-white tracking-widest">{symbol}</span>
                <span className="text-sm font-medium text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded">NSE</span>
                {liveLtp && (
                    <div className="flex items-center gap-2 ml-auto mr-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-lg font-mono text-green-400">{liveLtp.toFixed(2)}</span>
                    </div>
                )}
            </div>
            <div ref={chartContainerRef} className="flex-1" />
        </div>
    );
}

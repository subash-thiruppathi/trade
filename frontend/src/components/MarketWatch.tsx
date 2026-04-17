'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Search, Plus } from 'lucide-react';

interface TickData {
  symbol: string;
  lastPrice: string;
  volume: number;
  timestamp: string;
}

interface StockDisplay {
  symbol: string;
  ltp: string;
  prevLtp: string;
  change: string;
  changePercent: string;
  colorClass: string;
}

interface MarketWatchProps {
  onSelectSymbol: (symbol: string, ltp: number) => void;
  selectedSymbol?: string;
}

const WATCHLISTS = [
  ['RELIANCE', 'HDFC', 'TCS', 'INFOSYS', 'ICICI'],
  ['HDFCBANK', 'AXISBANK', 'KOTAKBANK', 'SBIN'],
  ['TATASTEEL', 'JSWSTEEL', 'HINDALCO'],
  ['SUNPHARMA', 'CIPLA', 'DRREDDY'],
  ['MARUTI', 'M&M', 'TATAMOTORS']
];

export default function MarketWatch({ onSelectSymbol, selectedSymbol }: MarketWatchProps) {
  const [stocks, setStocks] = useState<Record<string, StockDisplay>>({});
  const [activeTab, setActiveTab] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const currentSymbols = WATCHLISTS[activeTab];

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/market`);
    socketRef.current = socket;

    socket.on('connect', () => {
      currentSymbols.forEach(symbol => socket.emit('subscribe', symbol));
    });

    socket.on('tick', (data: TickData) => {
      setStocks((prev) => {
        const currentData = prev[data.symbol];
        const prevPrice = currentData ? parseFloat(currentData.ltp) : parseFloat(data.lastPrice);
        const newPrice = parseFloat(data.lastPrice);

        const mockPrevClose = prevPrice;
        const change = (newPrice - mockPrevClose).toFixed(2);
        const changePercent = mockPrevClose > 0 ? ((newPrice - mockPrevClose) / mockPrevClose * 100).toFixed(2) : "0.00";

        let colorClass = 'text-gray-900 dark:text-gray-100';
        if (newPrice > prevPrice) colorClass = 'text-green-500';
        else if (newPrice < prevPrice) colorClass = 'text-red-500';

        return {
          ...prev,
          [data.symbol]: {
            symbol: data.symbol,
            ltp: data.lastPrice,
            prevLtp: prevPrice.toString(),
            change,
            changePercent,
            colorClass,
          }
        };
      });
    });

    return () => {
      // Disconnect automatically removes all subscriptions on the server side
      socket.disconnect();
    };
  }, []);

  // Handle switching tabs
  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) return;

    // The true Angel One way would be to unsubscribe old and subscribe new, 
    // but a reconnection is easiest for mock cleanup
    WATCHLISTS.forEach((list, i) => {
      if (i !== activeTab) list.forEach(s => socketRef.current?.emit('unsubscribe', s));
    });
    currentSymbols.forEach(s => socketRef.current?.emit('subscribe', s));
  }, [activeTab]);

  return (
    <div className="w-[340px] h-full bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-gray-800 flex flex-col font-sans">

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {[0, 1, 2, 3, 4].map(idx => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === idx ? 'text-blue-500 border-blue-500' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search eg: INFy bse, nifty fut"
            className="w-full bg-gray-100 dark:bg-[#1e1e1e] border-none rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
          />
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto">
        {currentSymbols.map(symbol => {
          const data = stocks[symbol];
          const isSelected = selectedSymbol === symbol;

          if (!data) {
            return (
              <div key={symbol} className="px-4 py-3 border-b border-gray-100 dark:border-gray-800/60 flex justify-between items-center animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div>
              </div>
            );
          }

          const isUp = parseFloat(data.change) >= 0;

          return (
            <div
              key={symbol}
              onClick={() => onSelectSymbol(symbol, parseFloat(data.ltp))}
              className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>{symbol}</span>
                <span className={`font-medium transition-colors duration-300 ${data.colorClass}`}>
                  {data.ltp}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 dark:text-gray-500 text-[10px]">NSE</span>
                <div className={`flex items-center gap-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                  {isUp ? (
                    <span className="text-[10px]">▲</span>
                  ) : (
                    <span className="text-[10px]">▼</span>
                  )}
                  <span>{Math.abs(parseFloat(data.change)).toFixed(2)} ({Math.abs(parseFloat(data.changePercent)).toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          );
        })}
        {/* Placeholder padder */}
        <div className="h-full flex items-end justify-center p-4">
          <span className="text-xs text-gray-400">{currentSymbols.length} / 50</span>
        </div>
      </div>
    </div>
  );
}

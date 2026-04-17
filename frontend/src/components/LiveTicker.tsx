'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface PriceUpdate {
  asset: string;
  price: string;
  timestamp: string;
}

export default function LiveTicker() {
  const [prices, setPrices] = useState<Record<string, { price: string; color: string }>>({
    GOLD: { price: 'Loading...', color: 'text-gray-500' },
    SILV: { price: 'Loading...', color: 'text-gray-500' },
  });

  useEffect(() => {
    // Connect to NestJS WebSocket Gateway
    const socket: Socket = io(process.env.NEXT_PUBLIC_WS_URL || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}`);

    socket.on('price-update', (data: PriceUpdate) => {
      setPrices((prev) => {
        const oldPrice = parseFloat(prev[data.asset]?.price || '0');
        const newPrice = parseFloat(data.price);
        
        let color = 'text-gray-900 dark:text-gray-100';
        if (oldPrice > 0) {
          color = newPrice > oldPrice ? 'text-green-500' : newPrice < oldPrice ? 'text-red-500' : prev[data.asset].color;
        }

        return {
          ...prev,
          [data.asset]: {
            price: data.price,
            color,
          },
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
      {Object.entries(prices).map(([asset, info]) => (
        <div key={asset} className="flex flex-col">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{asset}</span>
          <span className={`text-xl font-bold transition-colors duration-300 ${info.color}`}>
            ₹ {info.price}
          </span>
        </div>
      ))}
    </div>
  );
}
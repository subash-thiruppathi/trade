'use client';

import React, { useState, useEffect } from 'react';

interface Order {
    id: string;
    symbol: string;
    side: string;
    orderType: string;
    productType: string;
    requestedQty: number;
    filledQty: number;
    price: number | null;
    status: string;
    timestamp: string;
}

export default function OrdersTable({ userId }: { userId: string }) {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch(`http://localhost:3001/portfolio/${userId}/orders`);
                const data = await res.json();
                const parsed = data.map((o: any) => ({
                    ...o,
                    requestedQty: parseFloat(o.requestedQty),
                    filledQty: parseFloat(o.filledQty),
                    price: o.price !== null ? parseFloat(o.price) : null
                }));
                setOrders(parsed);
            } catch (err) {
                console.error('Failed to fetch orders');
            }
        };

        fetchOrders();
        const interval = setInterval(fetchOrders, 2000); // Live poll order status
        return () => clearInterval(interval);
    }, [userId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
            case 'EXECUTED':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'REJECTED':
            case 'CANCELLED':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'OPEN':
            case 'TRIGGER_PENDING':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    return (
        <div className="w-full h-full bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase tracking-wider sticky top-0">
                            <th className="p-4 font-medium">Time</th>
                            <th className="p-4 font-medium">Type</th>
                            <th className="p-4 font-medium">Instrument</th>
                            <th className="p-4 font-medium">Product</th>
                            <th className="p-4 font-medium text-right">Qty</th>
                            <th className="p-4 font-medium text-right">Price</th>
                            <th className="p-4 font-medium text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {orders.map((o) => (
                            <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="p-4 text-xs text-gray-500 font-mono">{new Date(o.timestamp).toLocaleTimeString()}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${o.side === 'BUY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                        {o.side}
                                    </span>
                                </td>
                                <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{o.symbol}</td>
                                <td className="p-4 text-xs font-bold text-gray-500">{o.productType} • {o.orderType}</td>
                                <td className="p-4 text-right font-mono text-gray-600 dark:text-gray-400">{o.filledQty}/{o.requestedQty}</td>
                                <td className="p-4 text-right font-mono text-gray-800 dark:text-gray-200">
                                    {o.price ? o.price.toFixed(2) : 'MKT'}
                                </td>
                                <td className="p-4 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${getStatusColor(o.status)}`}>
                                        {o.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-10 text-gray-500 font-medium">No historical orders found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

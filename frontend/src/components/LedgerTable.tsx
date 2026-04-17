'use client';

import React, { useState, useEffect } from 'react';

interface LedgerEntry {
    id: string;
    transactionType: string;
    amount: string;
    balanceAfter: string;
    referenceId: string | null;
    description: string | null;
    timestamp: string;
}

interface LedgerTableProps {
    activeUserId: string;
    availableMargin: number;
}

export default function LedgerTable({ activeUserId, availableMargin }: LedgerTableProps) {
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/portfolio/${activeUserId}/ledger`);
                const data = await res.json();
                setLedger(data);
            } catch (err) {
                console.error('Failed to fetch ledger:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLedger();
        const interval = setInterval(fetchLedger, 5000); // 5 sec live sync
        return () => clearInterval(interval);
    }, [activeUserId]);

    const getTransactionColor = (type: string, amount: number) => {
        if (type === 'DEPOSIT' || type === 'PROFIT_REALIZED' || type === 'MARGIN_RELEASE') return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10';
        if (type === 'WITHDRAWAL' || type === 'LOSS_REALIZED' || type === 'MARGIN_BLOCK') return 'text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
        // Taxes
        return 'text-red-500 bg-red-50 dark:bg-red-900/10';
    };

    const getTransactionLabel = (type: string) => {
        return type.replace(/_/g, ' ');
    };

    if (loading) return <div className="p-8 text-gray-500 text-sm">Synchronizing Ledger...</div>;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#121212]">
            {/* Funds Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a]">
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white uppercase">Funds & Margins</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Immutable Financial Ledger & Tax Tracking</p>
                </div>
                <div className="flex gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Cash</span>
                        <span className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-500">₹{availableMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-6 cursor-not-allowed opacity-50">
                        <button className="px-5 py-2 bg-blue-600 text-white rounded font-bold shadow transition-transform text-sm">ADD FUNDS</button>
                        <button className="px-5 py-2 border border-blue-600 text-blue-600 rounded font-bold shadow transition-transform text-sm">WITHDRAW</button>
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider z-10 shadow-sm border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-3">Timestamp</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3">Description</th>
                            <th className="px-6 py-3 text-right">Amount</th>
                            <th className="px-6 py-3 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-mono">
                        {ledger.map((entry) => {
                            const amountNum = parseFloat(entry.amount);
                            const colorClass = getTransactionColor(entry.transactionType, amountNum);
                            const isNegative = amountNum < 0;

                            return (
                                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                                        {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest ${colorClass}`}>
                                            {getTransactionLabel(entry.transactionType)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300 text-xs truncate max-w-[300px]">
                                        {entry.description || '-'}
                                        {entry.referenceId && <span className="block text-[10px] text-gray-400 mt-0.5" title={entry.referenceId}>Ref: {entry.referenceId.slice(0, 8)}...</span>}
                                    </td>
                                    <td className={`px-6 py-3 text-right font-semibold whitespace-nowrap ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
                                        {isNegative ? '-' : '+'}₹{Math.abs(amountNum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap group-hover:text-blue-500 transition-colors">
                                        ₹{parseFloat(entry.balanceAfter).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            );
                        })}

                        {ledger.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-sans">
                                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">No transactions yet</div>
                                    <p className="mt-1">Execute your first order to see immutable ledger tracing.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

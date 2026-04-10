'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface MutualFund {
    id: string;
    schemeCode: string;
    schemeName: string;
    amc: string;
    nav: string;
    category: string;
    threeYearReturn: string;
}

export default function MutualFundsPage() {
    const [funds, setFunds] = useState<MutualFund[]>([]);
    const [sips, setSips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string>('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFund, setSelectedFund] = useState<MutualFund | null>(null);
    const [sipAmount, setSipAmount] = useState<number>(1000);
    const [sipFrequency, setSipFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');

    // UI Feedback States
    const [toast, setToast] = useState<string | null>(null);
    const [sipToCancel, setSipToCancel] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const u = JSON.parse(userStr);
            setUserId(u.id);
            fetchData(u.id);
        }
    }, []);

    const fetchData = async (uid: string) => {
        try {
            const [fundsRes, sipsRes] = await Promise.all([
                fetch('http://localhost:3001/mutual-funds/explore'),
                fetch(`http://localhost:3001/mutual-funds/${uid}/sips`)
            ]);
            const fundsData = await fundsRes.json();
            const sipsData = await sipsRes.json();

            setFunds(fundsData);
            setSips(sipsData);
        } catch (err) {
            console.error('Failed to load MFs', err);
        } finally {
            setLoading(false);
        }
    };

    const confirmStartSip = async () => {
        if (!selectedFund) return;
        try {
            await fetch('http://localhost:3001/mutual-funds/start-sip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, mutualFundId: selectedFund.id, amount: sipAmount, frequency: sipFrequency })
            });
            setIsModalOpen(false);
            showToast('SIP Started Successfully! Executing pending capital allocations.');
            fetchData(userId);
        } catch (err) {
            showToast('Failed to start SIP');
        }
    };

    const executeCancelSip = async () => {
        if (!sipToCancel) return;
        try {
            await fetch(`http://localhost:3001/mutual-funds/${sipToCancel}/cancel`, { method: 'POST' });
            setSipToCancel(null);
            showToast('SIP Subscription permanently paused.');
            fetchData(userId);
        } catch (err) {
            showToast('Failed to cancel SIP');
        }
    };

    if (loading) return <div className="p-10 flex text-white justify-center">Loading Institutional Market Data...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 font-sans relative">
            <div className="max-w-[1200px] mx-auto">

                {/* Header */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <Link href="/" className="text-sm font-bold text-blue-500 hover:text-blue-400 mb-4 inline-block">← Back to Terminal</Link>
                        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">Mutual Funds Discovery</h1>
                        <p className="text-gray-400 mt-2">Invest in top-rated equity and debt funds via Systematic Investment Plans.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Active SIPs</div>
                        <div className="text-3xl font-mono text-green-400 font-bold">{sips.filter(s => s.status === 'ACTIVE').length}</div>
                    </div>
                </div>

                {/* Current SIPs Section */}
                {sips.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">Your Active SIPs</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sips.map((sip) => (
                                <div key={sip.id} className={`bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden group ${sip.status === 'CANCELLED' ? 'opacity-50 grayscale' : ''}`}>
                                    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full ${sip.status === 'CANCELLED' ? 'bg-gray-500/10' : 'bg-blue-500/10'}`} />
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-bold text-gray-300 truncate w-3/4" title={sip.mutualFund?.schemeName}>{sip.mutualFund?.schemeName || 'Unknown Fund'}</h3>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${sip.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {sip.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-between items-end">
                                        <div>
                                            <span className="text-xs text-gray-500 block uppercase">Installment</span>
                                            <span className="text-xl font-mono text-white font-bold">₹{parseFloat(sip.amount).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{sip.frequency}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-[10px] text-gray-400 border-t border-white/10 pt-3 flex justify-between items-center">
                                        <div>
                                            Next Trigger: <strong className={sip.status === 'ACTIVE' ? 'text-blue-400' : 'text-gray-500'}>{sip.status === 'ACTIVE' ? new Date(sip.nextExecutionDate).toLocaleString() : 'N/A'}</strong>
                                        </div>
                                        {sip.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => setSipToCancel(sip.id)}
                                                className="text-red-400 hover:text-red-300 font-bold tracking-wider hover:underline"
                                            >
                                                CANCEL
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explore Funds Section */}
                <div>
                    <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">Explore Top Funds</h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-gray-400 font-semibold border-b border-white/10 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Scheme Name</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4 text-right">NAV</th>
                                    <th className="p-4 text-center">3Y Returns</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {funds.map((fund) => (
                                    <tr key={fund.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-100">{fund.schemeName}</div>
                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{fund.amc} • {fund.schemeCode}</div>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <span className="px-2 py-1 bg-white/5 rounded text-[10px] uppercase tracking-wide">{fund.category}</span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-gray-100">
                                            ₹{parseFloat(fund.nav).toFixed(2)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-green-400 font-bold">+{parseFloat(fund.threeYearReturn).toFixed(1)}%</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedFund(fund);
                                                    setIsModalOpen(true);
                                                }}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors text-xs shadow-lg shadow-blue-500/20"
                                            >
                                                SETUP SIP
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-[0_10px_40px_rgba(255,255,255,0.2)] text-sm font-bold z-50">
                    ✓ {toast}
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {sipToCancel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative text-center">
                        <h2 className="text-xl font-bold text-red-400 mb-2">Cancel Subscription?</h2>
                        <p className="text-gray-400 text-sm mb-8">Are you sure you want to cancel this SIP? All automatic order placements will permanently stop.</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setSipToCancel(null)}
                                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
                            >
                                KEEP
                            </button>
                            <button
                                onClick={executeCancelSip}
                                className="flex-1 px-4 py-2 bg-red-600/90 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors"
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIP Configuration Modal */}
            {isModalOpen && selectedFund && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
                        <h2 className="text-2xl font-black text-white mb-1">SIP Configuration</h2>
                        <p className="text-sm text-gray-400 mb-6 border-b border-gray-800 pb-4">{selectedFund.schemeName}</p>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Installment Amount (₹)</label>
                                <input
                                    type="number"
                                    min={500}
                                    step={100}
                                    value={sipAmount}
                                    onChange={e => setSipAmount(Number(e.target.value))}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 font-mono text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Execution Frequency</label>
                                <select
                                    value={sipFrequency}
                                    onChange={e => setSipFrequency(e.target.value as any)}
                                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="DAILY">Daily Extraction</option>
                                    <option value="WEEKLY">Weekly Extraction</option>
                                    <option value="MONTHLY">Monthly Extraction</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors"
                            >
                                BACK
                            </button>
                            <button
                                onClick={confirmStartSip}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                            >
                                START SIP
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

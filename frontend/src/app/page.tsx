'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MarketWatch from "@/components/MarketWatch";
import OrderTicket from "@/components/OrderTicket";
import PositionsTable from "@/components/PositionsTable";
import TradingViewChart from "@/components/TradingViewChart";
import LedgerTable from "@/components/LedgerTable";
import { X } from 'lucide-react';
import Link from 'next/link';
import HoldingsTable from '@/components/HoldingsTable';
import OrdersTable from '@/components/OrdersTable';

export default function Home() {
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [margin, setMargin] = useState<number>(0);

  // Interactive States
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [selectedLtp, setSelectedLtp] = useState<number>(2950.00);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [bottomTab, setBottomTab] = useState<'POSITIONS' | 'HOLDINGS' | 'ORDERS' | 'FUNDS'>('POSITIONS');

  const router = useRouter();

  // Authentication Check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      setActiveUserId(user.id);
      setActiveUserEmail(user.email);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  // Fetch Live Margin
  useEffect(() => {
    if (!activeUserId) return;

    const fetchMargin = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/portfolio/${activeUserId}/margin`);
        const data = await res.json();
        setMargin(parseFloat(data.availableCash || 0));
      } catch (err) {
        console.error('Failed to fetch margin');
      }
    };

    fetchMargin();
    const interval = setInterval(fetchMargin, 2000); // Poll faster
    return () => clearInterval(interval);
  }, [activeUserId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleSelectSymbol = (symbol: string, ltp: number) => {
    setSelectedSymbol(symbol);
    setSelectedLtp(ltp);
  };

  const openOrderDrawer = (side: 'BUY' | 'SELL') => {
    setOrderSide(side);
    setIsOrderDrawerOpen(true);
  };

  if (!activeUserId) return <div className="h-screen flex items-center justify-center bg-black text-white">Loading Platform...</div>;

  return (
    <main className="flex h-screen bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden font-sans">
      {/* Left Sidebar: Market Feed */}
      <MarketWatch onSelectSymbol={handleSelectSymbol} selectedSymbol={selectedSymbol} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">

        {/* Header */}
        <header className="h-[60px] min-h-[60px] flex justify-between items-center px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121212]">
          <div className="flex items-center gap-6">
            {/* <h1 className="text-xl font-black tracking-tight text-blue-600 dark:text-blue-500"><span className="font-light text-gray-500">CLONE</span></h1> */}

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-sm">
                {activeUserEmail.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold dark:text-gray-200">{activeUserEmail.split('@')[0]}</span>
                <button onClick={handleLogout} className="text-[10px] text-gray-500 hover:text-red-500 text-left w-fit">Logout</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/mutual-funds" className="px-4 py-1.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-xs tracking-wider border border-purple-100 dark:border-purple-900/50 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors flex items-center justify-center">
              MUTUAL FUNDS & SIP ↗
            </Link>
            <Link href="/options" className="px-4 py-1.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs tracking-wider border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center justify-center">
              OPTION CHAIN ↗
            </Link>

            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Available Margin</span>
              <span className="text-lg font-mono font-bold text-gray-800 dark:text-gray-100">
                ₹{margin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Action Buttons for selected symbol */}
            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-800 pl-6">
              <button onClick={() => openOrderDrawer('BUY')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">BUY</button>
              <button onClick={() => openOrderDrawer('SELL')} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]">SELL</button>
            </div>
          </div>
        </header>

        {/* Content Split: Chart (Top) and Portfolio (Bottom) */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">

          {/* Chart Container */}
          <div className="flex-[3] min-h-[300px]">
            <TradingViewChart symbol={selectedSymbol} ltp={selectedLtp} />
          </div>

          {/* Positions Table */}
          <div className="flex-[2] min-h-[250px] overflow-auto border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#121212] flex flex-col">
            <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
              <button onClick={() => setBottomTab('POSITIONS')} className={`px-4 py-3 text-sm font-semibold transition-colors ${bottomTab === 'POSITIONS' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'}`}>Positions</button>
              <button onClick={() => setBottomTab('HOLDINGS')} className={`px-4 py-3 text-sm font-semibold transition-colors ${bottomTab === 'HOLDINGS' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'}`}>Holdings</button>
              <button onClick={() => setBottomTab('ORDERS')} className={`px-4 py-3 text-sm font-semibold transition-colors ${bottomTab === 'ORDERS' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'}`}>Orders</button>
              <button onClick={() => setBottomTab('FUNDS')} className={`px-4 py-3 text-sm font-semibold transition-colors ${bottomTab === 'FUNDS' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'}`}>Funds & Ledger</button>
            </div>
            <div className="flex-1 w-full relative">
              <div className="absolute inset-0 overflow-auto">
                {bottomTab === 'POSITIONS' && <div className="h-full"><PositionsTable userId={activeUserId} /></div>}
                {bottomTab === 'HOLDINGS' && <div className="h-full"><HoldingsTable userId={activeUserId} /></div>}
                {bottomTab === 'ORDERS' && <div className="h-full"><OrdersTable userId={activeUserId} /></div>}
                {bottomTab === 'FUNDS' && <div className="h-full"><LedgerTable activeUserId={activeUserId} availableMargin={margin} /></div>}
              </div>
            </div>
          </div>

        </div>

        {/* Slide-out Order Drawer Overlay */}
        {isOrderDrawerOpen && (
          <div className="absolute inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOrderDrawerOpen(false)} />
            <div className="relative w-[400px] h-full bg-white dark:bg-[#121212] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 border-l border-gray-800">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold dark:text-white">Order Details</h2>
                <button onClick={() => setIsOrderDrawerOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                {/* We pass a key to force re-render if symbol changes while drawer is open, though we usually close it */}
                <OrderTicket key={`${selectedSymbol}-${orderSide}`} userId={activeUserId} selectedSymbol={selectedSymbol} currentPrice={selectedLtp} defaultSide={orderSide} />
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
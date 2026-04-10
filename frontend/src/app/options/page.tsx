'use client';

import React, { useState } from 'react';
import OptionChain from '@/components/OptionChain';
import Link from 'next/link';

export default function OptionsPage() {
    const [symbol, setSymbol] = useState('RELIANCE');
    const [inputVal, setInputVal] = useState('RELIANCE');

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-[#0a0a0a] p-6 text-gray-900 dark:text-gray-100">
            <div className="flex justify-between items-center mb-6 max-w-[1400px] mx-auto w-full">
                <div className="flex items-center gap-6">
                    <Link href="/" className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-colors text-sm font-semibold">
                        ← Back
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Derivatives (F&O)</h1>
                        <p className="text-xs text-gray-500">Live Option Chain & Greeks Simulator</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && setSymbol(inputVal)}
                        className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm w-48 transition-all focus:w-64"
                        placeholder="Symbol (e.g. RELIANCE)"
                    />
                    <button onClick={() => setSymbol(inputVal)} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-transform text-sm uppercase tracking-wider">
                        Load Chain
                    </button>
                </div>
            </div>

            <div className="max-w-[1400px] w-full mx-auto flex-1 min-h-0 flex flex-col">
                {/* Setting key forces re-mount of OptionChain when symbol changes to display loading state accurately */}
                <OptionChain key={symbol} symbol={symbol} />
            </div>
        </div>
    );
}

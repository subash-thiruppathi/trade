'use client';

import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface TradeFormProps {
  asset: 'GOLD' | 'SILV';
  currentPrice: string;
}

export default function TradeForm({ asset, currentPrice }: TradeFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setStatus('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Processing...');
    
    const idempotencyKey = uuidv4();
    const payload = {
      idempotencyKey,
      userId: 'user-uuid-placeholder', // In a real app, get from auth context
      asset,
      type: 'BUY',
      amount,
      currentPrice,
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('Trade request submitted successfully.');
        setAmount('');
      } else {
        const errorData = await response.json();
        setStatus(`Error: ${errorData.message || 'Failed to submit trade.'}`);
      }
    } catch (err) {
      setStatus('Network error. Failed to reach the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleTrade} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 w-full max-w-sm">
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">Buy {asset}</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
          Amount (₹)
        </label>
        <input
          type="number"
          step="0.01"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="e.g. 5000"
          required
        />
      </div>

      <div className="text-sm text-gray-500 mb-4">
        Est. {asset}: {amount && currentPrice !== 'Loading...' ? (Number(amount) / Number(currentPrice)).toFixed(6) : '0.000000'}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 px-4 rounded-lg text-white font-semibold transition-colors ${
          isSubmitting ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isSubmitting ? 'Submitting...' : `Buy ${asset}`}
      </button>

      {status && (
        <p className={`mt-3 text-sm font-medium ${status.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
          {status}
        </p>
      )}
    </form>
  );
}
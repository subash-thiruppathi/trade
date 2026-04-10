'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Lock, Mail, Activity } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/');
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Network error. Unable to reach the server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Background floating shapes
  const FloatingShape = ({ className, delay, duration }: any) => (
    <motion.div
      className={`absolute opacity-20 filter blur-3xl rounded-full ${className}`}
      animate={{
        x: [0, 100, 0, -100, 0],
        y: [0, -100, 100, -50, 0],
        scale: [1, 1.2, 0.8, 1.1, 1],
      }}
      transition={{
        duration: duration || 20,
        repeat: Infinity,
        ease: "linear",
        delay: delay || 0,
      }}
    />
  );

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#050505] font-sans px-4 overflow-hidden text-gray-100 z-0">

      {/* Dynamic Animated Background Space */}
      <div className="absolute inset-0 pointer-events-none w-full h-full">
        <FloatingShape className="w-[500px] h-[500px] bg-blue-600 top-[-100px] left-[-200px]" duration={25} />
        <FloatingShape className="w-[600px] h-[600px] bg-purple-600 bottom-[-200px] right-[-100px]" delay={5} duration={30} />
        <FloatingShape className="w-[400px] h-[400px] bg-cyan-500 top-[20%] right-[30%]" delay={10} duration={22} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 relative overflow-hidden">

          {/* Subtle shine effect on card */}
          <div className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none transform -skew-x-12 animate-shine" />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              PRO TRADER
            </h1>
            <p className="text-sm text-gray-400 mt-3 font-medium">Terminal access requires authorization</p>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-1.5"
            >
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Secure Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/10 bg-black/40 focus:bg-black/60 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 text-white placeholder-gray-600 transition-all shadow-inner"
                  placeholder="trader@institutional.net"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-1.5"
            >
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Authentication Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-purple-400 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/10 bg-black/40 focus:bg-black/60 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 text-white placeholder-gray-600 transition-all shadow-inner"
                  placeholder="••••••••••••"
                />
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pt-2"
            >
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-bold text-gray-900 rounded-xl group bg-gradient-to-br from-blue-500 to-purple-600 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-shadow duration-300"
              >
                <span className="relative w-full px-5 py-3.5 transition-all ease-in duration-75 bg-transparent rounded-xl flex items-center justify-center gap-2 text-white">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      INITIALIZE SESSION <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-center"
          >
            <p className="text-sm text-gray-400">
              New to the terminal? <Link href="/register" className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hover:opacity-80 transition-opacity">Request an account</Link>
            </p>
          </motion.div>

        </div>
      </motion.div>

      {/* Tailwind plugin to enable shine animation globally easily if we wanted, but inline works too */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shine {
          animation: shine 6s infinite linear;
        }
      `}} />
    </div>
  );
}
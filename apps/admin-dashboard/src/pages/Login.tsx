import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Zap, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, enableDemoMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSetupHelp, setShowSetupHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setErrorMessage(res.error || 'Failed to authenticate');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLaunch = () => {
    enableDemoMode();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Brand Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 text-white shadow-xl shadow-emerald-500/20 mb-3">
            <span className="font-black text-2xl">M</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            MyMart Owner Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Store Management, Realtime Orders & Inventory
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Admin Sign In</h2>
              <p className="text-xs text-slate-500">Only authorized owners have access</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 leading-relaxed">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Owner Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@mymartdelivery.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>

          {/* Demo Launch Option for Immediate Testing */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Quick Testing Mode
              </div>
              <p className="text-[11px] text-emerald-700 mt-1 mb-3">
                Inspect all admin features with preloaded mock grocery data & orders
              </p>
              <button
                type="button"
                onClick={handleDemoLaunch}
                className="w-full py-2 px-3 bg-white hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-300 shadow-xs transition"
              >
                Launch Live Demo as Store Owner
              </button>
            </div>
          </div>

          {/* Supabase Setup Instructions Helper */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setShowSetupHelp(!showSetupHelp)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How to setup Admin user in Supabase?</span>
            </button>

            {showSetupHelp && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-slate-800">Assigning Admin Role:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Sign up your account in Supabase Auth or Mobile App.</li>
                  <li>Open Supabase SQL Editor and execute:</li>
                </ol>
                <pre className="bg-slate-900 text-emerald-400 p-2 rounded-lg text-[10px] overflow-x-auto">
{`UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Tags,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  Radio,
  Store,
  ChevronRight,
  ShieldCheck,
  Zap,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getStoreSettings, updateStoreSettings } from '../lib/api';

export const AdminLayout: React.FC = () => {
  const { user, profile, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isTogglingStore, setIsTogglingStore] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  useEffect(() => {
    // Fetch initial store status
    getStoreSettings()
      .then((settings) => {
        setIsStoreOpen(settings.is_store_open);
      })
      .catch(console.error);

    // Setup Supabase Realtime channel status
    if (isSupabaseConfigured && !isDemoMode) {
      const channel = supabase.channel('system_status');
      channel.subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isDemoMode]);

  const handleToggleStore = async () => {
    setIsTogglingStore(true);
    try {
      const newStatus = !isStoreOpen;
      await updateStoreSettings({ is_store_open: newStatus });
      setIsStoreOpen(newStatus);
    } catch (err) {
      console.error('Failed to toggle store status:', err);
    } finally {
      setIsTogglingStore(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, exact: true },
    { to: '/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/categories', label: 'Categories', icon: Tags },
    { to: '/inventory', label: 'Inventory', icon: Layers },
    { to: '/offers', label: 'Offers & Banners', icon: Sparkles },
    { to: '/settings', label: 'Store Settings', icon: Settings },
    { to: '/customer-preview', label: 'Customer App', icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white flex-shrink-0 min-h-screen border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-xl">
              M
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                MyMart <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Owner</span>
              </h1>
              <p className="text-xs text-slate-400">Quick Commerce Hub</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Store Open/Close Switch in Sidebar */}
        <div className="p-4 mx-4 mb-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">Store Status</span>
            </div>
            <button
              onClick={handleToggleStore}
              disabled={isTogglingStore}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isStoreOpen ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isStoreOpen ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Current:</span>
            <span
              className={`font-bold ${
                isStoreOpen ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isStoreOpen ? 'Accepting Orders' : 'Store Closed'}
            </span>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
              {profile?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Owner Account
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="text-slate-400">MyMart Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-800 font-semibold capitalize">
                {window.location.pathname.replace('/', '') || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* View Customer App Live Link */}
            <NavLink
              to="/customer-preview"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
              title="Open Customer Mobile App View in new tab"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>📱 Customer App</span>
            </NavLink>

            {/* Realtime Connection Status Pill */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">Supabase Realtime Live</span>
              <span className="sm:hidden">Live</span>
            </div>

            {/* Demo Mode Badge if active */}
            {isDemoMode && (
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-600" /> Demo Mode
              </span>
            )}

            {/* Mobile Store Status Pill */}
            <button
              onClick={handleToggleStore}
              disabled={isTogglingStore}
              className={`md:hidden px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                isStoreOpen
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isStoreOpen ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {isStoreOpen ? 'Open' : 'Closed'}
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex flex-col w-72 bg-slate-900 text-white h-full z-10 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="font-extrabold text-lg text-white">MyMart Owner</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-400 hover:bg-slate-800 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

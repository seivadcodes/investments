'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, TrendingUp, ShieldCheck, AlertCircle, CheckCircle,
  Search, PlusCircle, ArrowRight, DollarSign, Lock, MapPin, Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';
import { createClient } from '@/lib/supabase';

// --- TYPES ---
interface Broker {
  id: string;
  name: string;
  avatar_url?: string;
  buy_rate: number;
  sell_rate: number;
  min_amount: number;
  max_amount: number;
  status: 'ACTIVE' | 'BUSY' | 'OFFLINE';
  rating: number;
  total_trades: number;
  location?: string;
  mpesa_number?: string;
}

interface NotificationState {
  msg: string;
  type: 'success' | 'error';
}

export default function BrokerHubPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  // State
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'BUSY'>('ALL');
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [showBecomeBrokerModal, setShowBecomeBrokerModal] = useState(false);

  // --- NOTIFICATION HELPER ---
  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- FETCH BROKERS ---
  const fetchBrokers = useCallback(async () => {
    if (!user?.id) return;
    try {
      const supabase = createClient();
      
      // ✅ FIX: Filter by 'status' IN ('ACTIVE', 'BUSY') instead of 'is_active'
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .in('status', ['ACTIVE', 'BUSY']) 
        .order('rating', { ascending: false });

      if (error) throw error;

      // 🟡 MOCK DATA FALLBACK (If DB is empty or for testing)
      const mockBrokers: Broker[] = [
        {
          id: 'b-1',
          name: 'Kamau Enterprises',
          buy_rate: 0.95,
          sell_rate: 1.05,
          min_amount: 100,
          max_amount: 5000,
          status: 'ACTIVE',
          rating: 4.8,
          total_trades: 1240,
          location: 'Nairobi',
          mpesa_number: '0712***456'
        },
        {
          id: 'b-2',
          name: 'Sarah Tech Solutions',
          buy_rate: 0.98,
          sell_rate: 1.02,
          min_amount: 500,
          max_amount: 10000,
          status: 'BUSY',
          rating: 4.9,
          total_trades: 3500,
          location: 'Mombasa',
          mpesa_number: '0722***789'
        },
        {
          id: 'b-3',
          name: 'QuickCash Hub',
          buy_rate: 0.90,
          sell_rate: 1.10,
          min_amount: 50,
          max_amount: 2000,
          status: 'ACTIVE',
          rating: 4.5,
          total_trades: 800,
          location: 'Kisumu',
          mpesa_number: '0733***123'
        }
      ];

      setBrokers(data && data.length > 0 ? data : mockBrokers);
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
      showNotification('Could not load broker list', 'error');
      // Fallback to mock data on error so page doesn't break
      setBrokers([
        { id: 'm-1', name: 'Demo Broker 1', buy_rate: 0.95, sell_rate: 1.05, min_amount: 100, max_amount: 5000, status: 'ACTIVE', rating: 4.8, total_trades: 100 },
        { id: 'm-2', name: 'Demo Broker 2', buy_rate: 0.98, sell_rate: 1.02, min_amount: 500, max_amount: 10000, status: 'BUSY', rating: 4.9, total_trades: 300 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers]);

  // --- NAVIGATION TO INDIVIDUAL BROKER ---
  const handleSelectBroker = (brokerId: string) => {
    router.push(`/broker/${brokerId}`);
  };

  // --- BECOME A BROKER SUBMISSION ---
  const handleBecomeBrokerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const mpesa = formData.get('mpesa') as string;
    const capital = formData.get('capital') as string;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('broker_applications').insert({
        user_id: user!.id,
        mpesa_number: mpesa,
        initial_capital: parseInt(capital) || 0,
        status: 'PENDING',
        applied_at: new Date().toISOString()
      });
      if (error) throw error;
      setShowBecomeBrokerModal(false);
      showNotification('Application submitted! Njoroge will review.', 'success');
    } catch (err) {
      showNotification('Failed to submit application', 'error');
    }
  };

  // --- FILTERING ---
  const filteredBrokers = brokers.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={cn(
              "fixed top-4 right-4 left-4 sm:left-auto sm:w-auto z-50 px-4 sm:px-6 py-3 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 max-w-sm",
              notification.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        user={user}
        onSignOut={signOut}
        currentView="BROKER" 
        onViewChange={(v) => {
          if (v === 'DASHBOARD') router.push('/');
          if (v === 'WALLET') router.push('/wallet');
          if (v === 'BROKER') router.push('/broker');
        }}
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 sm:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
              <span className="text-blue-300 font-bold tracking-wider text-xs uppercase">Njoroge's Network</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-4">Broker Exchange Hub</h1>
            <p className="text-slate-300 max-w-2xl mb-6 text-sm sm:text-base">
              Buy and sell TLC coins through verified sub-brokers. Competitive rates, secure transactions, and instant code generation.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowBecomeBrokerModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all flex items-center gap-2 text-sm sm:text-base shadow-lg hover:shadow-blue-500/25"
              >
                <PlusCircle className="w-5 h-5" />
                Become a Broker
              </button>
              <button
                onClick={() => router.push('/wallet')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all flex items-center gap-2 text-sm sm:text-base backdrop-blur-sm"
              >
                <DollarSign className="w-5 h-5" />
                My Wallet
              </button>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search brokers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {['ALL', 'ACTIVE', 'BUSY'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex-1 sm:flex-none",
                  filterStatus === status
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Broker Grid */}
        {filteredBrokers.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800">No Brokers Found</h3>
            <p className="text-slate-500">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredBrokers.map((broker) => (
              <motion.div
                key={broker.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                      {broker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{broker.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {broker.location || 'Remote'}
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold",
                    broker.status === 'ACTIVE' ? "bg-green-100 text-green-700" :
                    broker.status === 'BUSY' ? "bg-yellow-100 text-yellow-700" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {broker.status}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                      <p className="text-xs text-green-600 font-medium mb-1">Buy Rate</p>
                      <p className="text-lg font-bold text-green-700">{broker.buy_rate} TLC</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium mb-1">Sell Rate</p>
                      <p className="text-lg font-bold text-blue-700">{broker.sell_rate} TLC</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Min: {broker.min_amount}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Max: {broker.max_amount}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-bold text-slate-700">{broker.rating}</span>
                    </div>
                    <span className="text-xs text-slate-400">{broker.total_trades} Trades</span>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => handleSelectBroker(broker.id)}
                    disabled={broker.status === 'OFFLINE'}
                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:text-white"
                  >
                    Trade with Broker
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Become Broker Modal */}
      <AnimatePresence>
        {showBecomeBrokerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBecomeBrokerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Become a Broker</h2>
                <p className="text-sm text-slate-500 mt-2">Join Njoroge's network and earn commissions on trades.</p>
              </div>
              <form onSubmit={handleBecomeBrokerSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mpesa Number</label>
                  <input name="mpesa" required type="text" placeholder="07..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Initial Capital (TLC)</label>
                  <input name="capital" required type="number" placeholder="1000" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="pt-2">
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    Submit Application
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBecomeBrokerModal(false)}
                    className="w-full py-3 mt-2 text-slate-500 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
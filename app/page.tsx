'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Wallet, Users, Server, ShieldCheck,
  TrendingUp, Gift, Loader2, CheckCircle, AlertCircle, RefreshCw,
  Coins, Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';

// Import the two consolidated components
import { InvestmentInterface, ServerInstance } from '@/components/investor/InvestmentInterface';
import { NetworkInterface } from '@/components/investor/NetworkInterface';

// ============================================
// TYPES
// ============================================
type MainTab = 'OVERVIEW' | 'INVESTMENT' | 'NETWORK';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
}

interface NotificationState {
  msg: string;
  type: 'success' | 'error' | 'info';
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function InvestorDashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Global State
  const [activeTab, setActiveTab] = useState<MainTab>('OVERVIEW');
  const [balance, setBalance] = useState<number>(0);
  const [dailyEarnings, setDailyEarnings] = useState<number>(0);
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [installingServers, setInstallingServers] = useState<ServerInstance[]>([]);
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0
  });
  const [providers, setProviders] = useState<any[]>([]);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isRenting, setIsRenting] = useState(false);
  
  // Loading states for individual sections (non-blocking)
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingServers, setLoadingServers] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Refs for realtime updates to avoid stale closures
  const balanceRef = useRef(balance);
  const serversRef = useRef(servers);
  const referralStatsRef = useRef(referralStats);

  useEffect(() => {
    balanceRef.current = balance;
    serversRef.current = servers;
    referralStatsRef.current = referralStats;
  }, [balance, servers, referralStats]);

  // 🔑 REDIRECT IF NOT LOGGED IN
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // ============================================
  // REALTIME BALANCE SYNC (Independent, non-blocking)
  // ============================================
  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    
    const channel = supabase
      .channel(`balance-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new?.wallet_balance !== undefined) {
            setBalance(payload.new.wallet_balance);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ============================================
  // FETCH DATA FROM SUPABASE (Non-blocking, like WalletPage)
  // ============================================
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const supabase = createClient();

      // 1. Profile & Balance (CRITICAL - fetch first)
      setLoadingBalance(true);
      const profileRes = await supabase
        .from('profiles')
        .select('wallet_balance, referral_code, is_broker')
        .eq('id', user.id)
        .single();
      
      if (profileRes.data) {
        const newBalance = profileRes.data.wallet_balance || 0;
        setBalance(newBalance);
        balanceRef.current = newBalance;
        setReferralCode(profileRes.data.referral_code || `REF-${user.id.substring(0, 6).toUpperCase()}`);
      }
      setLoadingBalance(false);

      // 2. Active Servers (fetch async, non-blocking)
      setLoadingServers(true);
      const serversRes = await supabase
        .from('server_instances')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['ONLINE', 'INSTALLING'])
        .order('created_at', { ascending: false });
      
      if (serversRes.data) {
        const online = serversRes.data.filter((s: any) => s.status === 'ONLINE');
        const installing = serversRes.data.filter((s: any) => s.status === 'INSTALLING');
        setServers(online);
        serversRef.current = online;
        setInstallingServers(installing);
        const dailyTotal = online.reduce((sum: number, s: any) => sum + (s.daily_earnings || 0), 0);
        setDailyEarnings(dailyTotal);
      }
      setLoadingServers(false);

      // 3. Referral Stats (fetch async, non-blocking)
      setLoadingReferrals(true);
      const [refCountRes, refEarningsRes] = await Promise.allSettled([
        supabase.from('referrals').select('id, status', { count: 'exact' }).eq('referrer_id', user.id),
        supabase.from('referral_earnings').select('amount').eq('user_id', user.id)
      ]);

      let newReferralStats = { ...referralStatsRef.current };
      
      if (refCountRes.status === 'fulfilled' && refCountRes.value.data) {
        newReferralStats.totalReferrals = refCountRes.value.data?.length || 0;
        newReferralStats.activeReferrals = refCountRes.value.data?.filter((r: any) => r.status === 'ACTIVE').length || 0;
      }
      if (refEarningsRes.status === 'fulfilled' && refEarningsRes.value.data) {
        const total = refEarningsRes.value.data.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        newReferralStats.totalEarnings = total;
      }
      setReferralStats(newReferralStats);
      referralStatsRef.current = newReferralStats;
      setLoadingReferrals(false);

      // 4. Providers (fetch async, non-blocking)
      setLoadingProviders(true);
      const providersRes = await supabase
        .from('brokers')
        .select('id, name, status, rating, total_trades, mpesa_number')
        .in('status', ['ACTIVE', 'BUSY'])
        .limit(10);
      
      if (providersRes.data) {
        setProviders(providersRes.data);
      }
      setLoadingProviders(false);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      // ✅ Allow UI to render even if some fetches fail
      setLoadingBalance(false);
      setLoadingServers(false);
      setLoadingReferrals(false);
      setLoadingProviders(false);
    }
  }, [user]);

  // Initial fetch - runs after auth confirms user
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // ============================================
  // ACTIONS (REAL DB WRITES)
  // ============================================
  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 🔑 RENT SERVER - SAVES TO DATABASE
  const handleRentServer = async (investment: number) => {
    if (!user?.id) {
      showNotification('Please log in to rent a server', 'error');
      router.push('/auth');
      return;
    }
    
    // Balance Check (use ref for latest value)
    if (investment > balanceRef.current) {
      showNotification(`Insufficient TLC. You have ${balanceRef.current} TLC, need ${investment} TLC.`, 'error');
      setTimeout(() => router.push('/wallet'), 1500);
      return;
    }
    
    setIsRenting(true);
    try {
      const supabase = createClient();
      const dailyEarnings = Math.floor(investment * 0.05 * 10) / 10; // 5% daily
      
      const { data: serverData, error: insertError } = await supabase
        .from('server_instances')
        .insert({
          user_id: user.id,
          investment,
          daily_earnings: dailyEarnings,
          status: 'INSTALLING',
          total_earned: 0,
          cpu_cores: Math.floor(investment / 100) + 1,
          ram_gb: Math.floor(investment / 50) + 2,
          storage_gb: Math.floor(investment / 10) + 20
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      if (!serverData) throw new Error('No server data returned');

      // Deduct balance in database
      const newBalance = balanceRef.current - investment;
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);

      // Log transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'STAKE',
        amount: -investment,
        balance_after: newBalance,
        description: `Server Rental Investment (${investment} TLC)`
      });

      // Update local state for UI
      setBalance(newBalance);
      balanceRef.current = newBalance;
      setInstallingServers(prev => [...prev, { 
        ...serverData, 
        specs: { 
          cpu: Math.floor(investment / 100) + 1, 
          ram: Math.floor(investment / 50) + 2, 
          storage: Math.floor(investment / 10) + 20 
        } 
      }]);
      showNotification('Server provisioning started...', 'info');

      // Simulate installation (15 seconds) then update database to 'ONLINE'
      setTimeout(async () => {
        try {
          await supabase
            .from('server_instances')
            .update({ status: 'ONLINE' })
            .eq('id', serverData.id);
          
          setInstallingServers(prev => prev.filter(s => s.id !== serverData.id));
          await fetchDashboardData(); // Refresh from DB
          showNotification('Server Online! Earnings started.', 'success');
        } catch (updateErr) {
          console.error('Failed to update server status:', updateErr);
          showNotification('Server rented but status update failed', 'error');
        }
      }, 15000);

    } catch (err: any) {
      console.error('Rent server error:', err);
      showNotification(err.message || 'Failed to rent server', 'error');
    } finally {
      setIsRenting(false);
    }
  };

  // 🔑 WITHDRAW EARNINGS
  const handleWithdraw = async (serverId: string) => {
    if (!user?.id) {
      showNotification('Please log in', 'error');
      return;
    }

    const server = serversRef.current.find(s => s.id === serverId);
    if (!server || server.total_earned <= 0) return;
    
    try {
      const supabase = createClient();
      
      // Reset server earnings
      await supabase.from('server_instances').update({ total_earned: 0 }).eq('id', serverId);
      
      // Add to wallet
      const newBalance = balanceRef.current + server.total_earned;
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', user.id);
      
      // Log transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'EARN',
        amount: server.total_earned,
        balance_after: newBalance,
        description: `Server Earnings Withdrawal (${server.investment} TLC node)`
      });

      setBalance(newBalance);
      balanceRef.current = newBalance;
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, total_earned: 0 } : s));
      serversRef.current = serversRef.current.map(s => s.id === serverId ? { ...s, total_earned: 0 } : s);
      
      showNotification(`Withdrew ${server.total_earned} TLC`, 'success');
      fetchDashboardData();
    } catch (err) {
      showNotification('Withdrawal failed', 'error');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    showNotification('Referral code copied!', 'success');
  };

  const handleRefresh = () => {
    fetchDashboardData();
    showNotification('Refreshing dashboard...', 'info');
  };

  // ============================================
  // AUTH LOADING ONLY (No isInitialized gate)
  // ============================================
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER (Always renders after auth, with available data)
  // ============================================
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
              "fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 max-w-sm",
              notification.type === 'success' ? "bg-green-600 text-white" :
              notification.type === 'error' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        user={user}
        onSignOut={signOut}
        currentView="DASHBOARD"
        onViewChange={(v) => {
          if (v === 'WALLET') router.push('/wallet');
          if (v === 'BROKER') router.push('/broker');
        }}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* Global Stats Header - Shows balance immediately */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Server Investment Dashboard</h1>
              <p className="text-slate-400 text-sm mt-1">Rent servers, earn TLC, grow your network</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-400 text-xs">Balance</p>
                {loadingBalance ? (
                  <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-green-400">{balance.toLocaleString()} TLC</p>
                )}
              </div>
              <button onClick={handleRefresh} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-xs text-slate-400">Daily Income</p>
              {loadingServers ? (
                <div className="h-6 w-16 bg-white/20 rounded animate-pulse mx-auto mt-1" />
              ) : (
                <p className="text-lg font-bold text-green-400">+{dailyEarnings.toFixed(1)} TLC</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Active Servers</p>
              {loadingServers ? (
                <div className="h-6 w-8 bg-white/20 rounded animate-pulse mx-auto mt-1" />
              ) : (
                <p className="text-lg font-bold">{servers.length}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Referral Earnings</p>
              {loadingReferrals ? (
                <div className="h-6 w-20 bg-white/20 rounded animate-pulse mx-auto mt-1" />
              ) : (
                <p className="text-lg font-bold text-purple-400">{referralStats.totalEarnings.toFixed(1)} TLC</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: Activity },
            { id: 'INVESTMENT', label: 'Servers & Rent', icon: Server },
            { id: 'NETWORK', label: 'Referrals & Providers', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
                  <h2 className="text-2xl font-bold mb-2">Start Earning Today</h2>
                  <p className="text-blue-100 mb-6">Rent server capacity with any amount of TLC and earn 5% daily returns.</p>
                  <button 
                    onClick={() => setActiveTab('INVESTMENT')} 
                    className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    Rent Server <TrendingUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button onClick={() => setActiveTab('INVESTMENT')} className="w-full p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100">
                      <span className="font-medium">Rent New Server</span>
                      <Server className="w-5 h-5 text-blue-600" />
                    </button>
                    <button onClick={() => setActiveTab('NETWORK')} className="w-full p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100">
                      <span className="font-medium">Invite Friends</span>
                      <Users className="w-5 h-5 text-green-600" />
                    </button>
                    <button onClick={() => router.push('/wallet')} className="w-full p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100">
                      <span className="font-medium">Manage Wallet</span>
                      <Wallet className="w-5 h-5 text-purple-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'INVESTMENT' && (
              <InvestmentInterface
                balance={balance}
                onRent={handleRentServer}
                servers={servers}
                installingServers={installingServers}
                onWithdraw={handleWithdraw}
                isRenting={isRenting}
                isLoading={loadingServers}
              />
            )}

            {activeTab === 'NETWORK' && (
              <NetworkInterface
                referralCode={referralCode}
                referralStats={referralStats}
                providers={providers}
                onCopyCode={copyReferralCode}
                isLoading={loadingReferrals || loadingProviders}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Loading indicator for background fetches */}
        {(loadingServers || loadingReferrals || loadingProviders) && (
          <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 z-40">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating data...</span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
// InvestorDashboardPage.tsx
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Wallet, Users, Server, ShieldCheck,
  TrendingUp, Gift, Loader2, CheckCircle, AlertCircle, RefreshCw
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
  
  // Debug: Track auth state changes
  useEffect(() => {
    console.log('[Dashboard] Auth state changed:', { authLoading, user: user?.id || null });
  }, [authLoading, user?.id]);

  // Global State
  const [activeTab, setActiveTab] = useState<MainTab>('OVERVIEW');
  const [balance, setBalance] = useState(0);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [installingServers, setInstallingServers] = useState<ServerInstance[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarnings: 0
  });
  const [providers, setProviders] = useState<any[]>([]);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isRenting, setIsRenting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Refs for realtime updates (avoid stale closures)
  const balanceRef = useRef(balance);
  const userRef = useRef(user);
  
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // 🔑 REDIRECT IF NOT LOGGED IN
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[Dashboard] No user, redirecting to /auth');
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  // ============================================
  // HELPER: Calculate and Update Server Earnings
  // ============================================
  const updateServerEarnings = async (supabase: any, server: any) => {
    if (server.status !== 'ONLINE' || !server.daily_earnings || server.daily_earnings <= 0) {
      return server;
    }

    const now = new Date();
    const lastUpdate = new Date(server.last_earned_at || server.created_at);
    const minutesOnline = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    // Only update if at least 1 minute has passed
    if (minutesOnline < 1) {
      return server;
    }

    // Calculate earnings: daily_earnings * (minutes / 1440)
    // 1440 = minutes in a day
    const newEarnings = server.daily_earnings * (minutesOnline / 1440);
    
    if (newEarnings < 0.001) {
      return server; // Too small to matter
    }

    // Update in database
    const { data: updated, error } = await supabase
      .from('server_instances')
      .update({
        total_earned: (server.total_earned || 0) + newEarnings,
        last_earned_at: now.toISOString()
      })
      .eq('id', server.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update server earnings:', error);
      return server;
    }

    return updated;
  };

  // ============================================
  // FETCH DATA FROM SUPABASE (REAL DB)
  // ============================================
  const fetchDashboardData = useCallback(async () => {
    const currentUser = userRef.current;
    console.log('[Dashboard] fetchDashboardData called, userId:', currentUser?.id);
    
    if (!currentUser?.id) {
      console.warn('[Dashboard] No user ID, skipping fetch');
      return;
    }
    
    try {
      setFetchError(null);
      const supabase = createClient();

      // 1. Profile & Balance
      console.log('[Dashboard] Fetching profile...');
      const profileRes = await supabase
        .from('profiles')
        .select('wallet_balance, referral_code, is_broker')
        .eq('id', currentUser.id)
        .single();
      
      if (profileRes.error) {
        console.error('[Dashboard] Profile fetch error:', profileRes.error);
        throw profileRes.error;
      }
      
      if (profileRes.data) {
        const newBalance = profileRes.data.wallet_balance || 0;
        console.log('[Dashboard] Profile loaded, balance:', newBalance);
        setBalance(newBalance);
        setReferralCode(profileRes.data.referral_code || `REF-${currentUser.id.substring(0, 6).toUpperCase()}`);
      }

      // 2. Active Servers WITH EARNINGS CALCULATION
      console.log('[Dashboard] Fetching servers...');
      const serversRes = await supabase
        .from('server_instances')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('status', ['ONLINE', 'INSTALLING'])
        .order('created_at', { ascending: false });
      
      if (serversRes.error) {
        console.error('[Dashboard] Servers fetch error:', serversRes.error);
      } else if (serversRes.data) {
        // Update earnings for each online server
        const updatedServers = [];
        for (const server of serversRes.data) {
          const updated = await updateServerEarnings(supabase, server);
          updatedServers.push(updated);
        }

        const online = updatedServers.filter((s: any) => s.status === 'ONLINE');
        const installing = updatedServers.filter((s: any) => s.status === 'INSTALLING');
        
        console.log('[Dashboard] Servers loaded:', { online: online.length, installing: installing.length });
        setServers(online);
        setInstallingServers(installing);
        
        const dailyTotal = online.reduce((sum: number, s: any) => sum + (s.daily_earnings || 0), 0);
        setDailyEarnings(dailyTotal);
      }

      // 3. Referral Stats
      console.log('[Dashboard] Fetching referrals...');
      const refCountRes = await supabase
        .from('referrals')
        .select('id, status', { count: 'exact' })
        .eq('referrer_id', currentUser.id);
      
      const refEarningsRes = await supabase
        .from('referral_earnings')
        .select('amount')
        .eq('user_id', currentUser.id);

      if (refCountRes.data) {
        setReferralStats(prev => ({
          ...prev,
          totalReferrals: refCountRes.data?.length || 0,
          activeReferrals: refCountRes.data?.filter((r: any) => r.status === 'ACTIVE').length || 0
        }));
      }
      if (refEarningsRes.data) {
        const total = refEarningsRes.data.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
        setReferralStats(prev => ({ ...prev, totalEarnings: total }));
      }

      // 4. Providers
      console.log('[Dashboard] Fetching providers...');
      const providersRes = await supabase
        .from('brokers')
        .select('id, name, status, rating, total_trades, mpesa_number')
        .in('status', ['ACTIVE', 'BUSY'])
        .limit(10);
      
      if (providersRes.data) {
        setProviders(providersRes.data);
      }

      setIsInitialized(true);
      console.log('[Dashboard] Initialization complete');
    } catch (err: any) {
      console.error('[Dashboard] Fetch error:', err);
      setFetchError(err.message || 'Failed to load dashboard data');
    }
  }, []);

  // Initial fetch - only when auth is done AND user exists
  useEffect(() => {
    if (!authLoading && user?.id) {
      console.log('[Dashboard] Starting initial data fetch');
      fetchDashboardData();
    }
  }, [authLoading, user?.id, fetchDashboardData]);

  // Auto-refresh earnings every 30 seconds while dashboard is open
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('[Dashboard] Setting up auto-refresh interval');
    const interval = setInterval(() => {
      console.log('[Dashboard] Auto-refreshing server earnings...');
      fetchDashboardData();
    }, 30000); // Every 30 seconds
    
    return () => {
      console.log('[Dashboard] Cleaning up auto-refresh interval');
      clearInterval(interval);
    };
  }, [user?.id, fetchDashboardData]);

  // 🔑 REALTIME BALANCE SYNC
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('[Dashboard] Setting up realtime balance subscription');
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
          console.log('[Dashboard] Realtime balance update:', payload.new?.wallet_balance);
          if (payload.new?.wallet_balance !== undefined) {
            setBalance(payload.new.wallet_balance);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Dashboard] Realtime subscription status:', status);
      });
    
    return () => {
      console.log('[Dashboard] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ============================================
  // ACTIONS (REAL DB WRITES)
  // ============================================
  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 🔑 RENT SERVER - SAVES TO DATABASE
  const handleRentServer = async (investment: number) => {
    const currentUser = userRef.current;
    
    if (!currentUser?.id) {
      showNotification('Please log in to rent a server', 'error');
      router.push('/auth');
      return;
    }
    
    // Balance Check
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
          user_id: currentUser.id,
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

      // Deduct Balance
      const newBalance = balanceRef.current - investment;
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', currentUser.id);

      // Log Transaction
      await supabase.from('wallet_transactions').insert({
        user_id: currentUser.id,
        type: 'STAKE',
        amount: -investment,
        balance_after: newBalance,
        description: `Server Rental Investment (${investment} TLC)`
      });

      // Update Local State
      setBalance(newBalance);
      setInstallingServers(prev => [...prev, { 
        ...serverData, 
        specs: { 
          cpu: Math.floor(investment / 100) + 1, 
          ram: Math.floor(investment / 50) + 2, 
          storage: Math.floor(investment / 10) + 20 
        } 
      }]);
      showNotification('Server provisioning started...', 'info');

      // Simulate Installation (15 seconds)
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
    const currentUser = userRef.current;
    
    if (!currentUser?.id) {
      showNotification('Please log in', 'error');
      return;
    }

    const server = servers.find(s => s.id === serverId);
    if (!server || server.total_earned <= 0) return;
    
    try {
      const supabase = createClient();
      
      // Recalculate earnings one final time before withdrawal
      const now = new Date();
      const lastUpdate = new Date(server.last_earned_at || server.created_at);
      const minutesOnline = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
      const pendingEarnings = server.daily_earnings * (minutesOnline / 1440);
      const finalTotal = (server.total_earned || 0) + pendingEarnings;
      
      // Reset server earnings
      await supabase.from('server_instances').update({ 
        total_earned: 0,
        last_earned_at: now.toISOString()
      }).eq('id', serverId);
      
      // Add to wallet
      const newBalance = balanceRef.current + finalTotal;
      await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', currentUser.id);
      
      // Log transaction
      await supabase.from('wallet_transactions').insert({
        user_id: currentUser.id,
        type: 'EARN',
        amount: finalTotal,
        balance_after: newBalance,
        description: `Server Earnings Withdrawal (${server.investment} TLC node)`
      });
      
      setBalance(newBalance);
      setServers(prev => prev.map(s => s.id === serverId ? { ...s, total_earned: 0 } : s));
      showNotification(`Withdrew ${finalTotal.toFixed(1)} TLC`, 'success');
      fetchDashboardData();
    } catch (err) {
      console.error('Withdraw error:', err);
      showNotification('Withdrawal failed', 'error');
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    showNotification('Referral code copied!', 'success');
  };

  const handleRefresh = () => {
    console.log('[Dashboard] Manual refresh triggered');
    fetchDashboardData();
    showNotification('Refreshing...', 'info');
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect handled by useEffect
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading dashboard data...</p>
          {fetchError && <p className="text-red-500 text-sm mt-2">Error: {fetchError}</p>}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col no-scrollbar-mobile">
      {/* Global CSS for hiding scrollbars on mobile while keeping functionality */}
      <style jsx global>{`
        .no-scrollbar-mobile {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar-mobile::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 768px) {
          .overflow-x-auto, .overflow-y-auto {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .overflow-x-auto::-webkit-scrollbar,
          .overflow-y-auto::-webkit-scrollbar {
            display: none;
          }
        }
      `}</style>

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

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full">
        {/* Global Stats Header - Responsive */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 sm:p-6 text-white mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Server Investment Dashboard</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">Rent servers, earn TLC, grow your network</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-400 text-xs">Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">{balance.toLocaleString()} TLC</p>
              </div>
              <button onClick={handleRefresh} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Refresh data">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-slate-400">Daily Income</p>
              <p className="text-base sm:text-lg font-bold text-green-400">+{dailyEarnings.toFixed(1)} TLC</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-slate-400">Active Servers</p>
              <p className="text-base sm:text-lg font-bold">{servers.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-slate-400">Referral Earnings</p>
              <p className="text-base sm:text-lg font-bold text-purple-400">{referralStats.totalEarnings.toFixed(1)} TLC</p>
            </div>
          </div>
        </div>

        {/* Main Tabs - Scrollable on mobile, hidden scrollbar */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto no-scrollbar-mobile pb-2">
          {[
            { id: 'OVERVIEW', label: 'Overview', icon: Activity },
            { id: 'INVESTMENT', label: 'Servers & Rent', icon: Server },
            { id: 'NETWORK', label: 'Referrals & Providers', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainTab)}
              className={cn(
                "px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap text-sm sm:text-base",
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
            className="space-y-4 sm:space-y-6"
          >
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">Start Earning Today</h2>
                  <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-base">Rent server capacity with any amount of TLC and earn 5% daily returns.</p>
                  <button 
                    onClick={() => setActiveTab('INVESTMENT')} 
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    Rent Server <TrendingUp className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6">
                  <h3 className="font-bold text-slate-800 mb-4 text-base sm:text-lg">Quick Actions</h3>
                  <div className="space-y-2 sm:space-y-3">
                    <button onClick={() => setActiveTab('INVESTMENT')} className="w-full p-3 sm:p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100">
                      <span className="font-medium text-sm sm:text-base">Rent New Server</span>
                      <Server className="w-5 h-5 text-blue-600" />
                    </button>
                    <button onClick={() => setActiveTab('NETWORK')} className="w-full p-3 sm:p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100">
                      <span className="font-medium text-sm sm:text-base">Invite Friends</span>
                      <Users className="w-5 h-5 text-green-600" />
                    </button>
                    <button onClick={() => router.push('/wallet')} className="w-full p-3 sm:p-4 bg-slate-50 rounded-xl flex items-center justify-between hover:bg-slate-100">
                      <span className="font-medium text-sm sm:text-base">Manage Wallet</span>
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
              />
            )}

            {activeTab === 'NETWORK' && (
              <NetworkInterface
                referralCode={referralCode}
                referralStats={referralStats}
                providers={providers}
                onCopyCode={copyReferralCode}
                onProviderClick={(id) => router.push(`/broker/${id}`)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ArrowRightLeft, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  ShieldCheck,
  History,
  Download,
  RefreshCw,
  Coins,
  Lock,
  Crown,
  Server,
  PiggyBank
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';
import { createClient } from '@/lib/supabase';

type TransactionType = 'EARN' | 'STAKE' | 'GIFT_SENT' | 'GIFT_RECEIVED' | 'BONUS' | 'WITHDRAWAL';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface TransferCode {
  code: string;
  amount: number;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
}

export default function WalletPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  const [balance, setBalance] = useState(0);
  const [baseBalance, setBaseBalance] = useState(0); // The amount locked from initial redeem/deposit
  const [isBroker, setIsBroker] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferCodes, setTransferCodes] = useState<TransferCode[]>([]);
  const [transferAmount, setTransferAmount] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const balanceRef = useRef(balance);
  const baseBalanceRef = useRef(baseBalance);
  const isBrokerRef = useRef(isBroker);

  useEffect(() => {
    balanceRef.current = balance;
    baseBalanceRef.current = baseBalance;
    isBrokerRef.current = isBroker;
  }, [balance, baseBalance, isBroker]);

  // 🔑 LOGIC UPDATE: 
  // Regular users can ONLY transfer what they have EARNED (Total - Base).
  // Brokers can transfer everything.
  const getTransferableBalance = useCallback(() => {
    if (isBrokerRef.current) return balanceRef.current; 
    return Math.max(0, balanceRef.current - baseBalanceRef.current); 
  }, []);

  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setRefreshing(true);
      const supabase = createClient();
      
      const response = await supabase
        .from('profiles')
        .select('wallet_balance, base_balance, is_broker')
        .eq('id', user.id)
        .single();
      
      if (response.error) {
        console.error('Profile fetch error:', response.error);
        
        if (response.error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              wallet_balance: 0,
              base_balance: 0,
              is_broker: false,
              created_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            });
          
          if (!insertError) {
            setBalance(0);
            setBaseBalance(0);
            setIsBroker(false);
            balanceRef.current = 0;
            baseBalanceRef.current = 0;
            isBrokerRef.current = false;
          }
        } else {
          showNotification("Could not load wallet data", "error");
        }
      } else {
        const profile = response.data;
        const newBalance = profile?.wallet_balance ?? 0;
        const newBase = profile?.base_balance ?? 0;
        const newIsBroker = profile?.is_broker ?? false;
        
        setBalance(newBalance);
        setBaseBalance(newBase);
        setIsBroker(newIsBroker);
        balanceRef.current = newBalance;
        baseBalanceRef.current = newBase;
        isBrokerRef.current = newIsBroker;
      }
      
      const txnsResponse = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!txnsResponse.error && txnsResponse.data) {
        setTransactions(txnsResponse.data);
      }
      
      const codesResponse = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });
      
      if (!codesResponse.error && codesResponse.data) {
        setTransferCodes(codesResponse.data);
      }
    } catch (err) {
      console.warn('Could not fetch wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateTransferCode = async () => {
    const amount = parseInt(transferAmount);
    if (!amount || amount <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }
    
    const transferable = getTransferableBalance();
    
    // 🔑 Brokers bypass transferable balance check
    if (!isBrokerRef.current && amount > transferable) {
      showNotification(`You can only transfer profits earned from servers. Available: ${transferable} TLC`, "error");
      return;
    }
    
    // Regular users still have minimum
    if (!isBrokerRef.current && amount < 10) {
      showNotification("Minimum transfer is 10 TLC", "error");
      return;
    }
    
    try {
      const supabase = createClient();
      const code = 'TLC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const newBalance = balanceRef.current - amount;
      
      const { error: codeError } = await supabase
        .from('transfer_codes')
        .insert({
          code,
          sender_id: user!.id,
          amount,
          status: 'ACTIVE',
          expires_at: expiresAt
        });
      
      if (codeError) throw codeError;
      
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          type: 'GIFT_SENT',
          amount: -amount,
          balance_after: newBalance,
          description: isBrokerRef.current 
            ? `Gift code ${code} (Broker distribution)` 
            : `Gift code ${code} (Server profits)`
        });
      
      if (txnError) throw txnError;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user!.id);
      
      if (updateError) throw updateError;
      
      setBalance(newBalance);
      balanceRef.current = newBalance;
      setGeneratedCode(code);
      setTransferAmount('');
      showNotification(isBrokerRef.current ? "Broker code generated!" : "Gift code generated!", "success");
      
      const codesResponse = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('sender_id', user!.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });
      
      if (!codesResponse.error && codesResponse.data) {
        setTransferCodes(codesResponse.data);
      }
      
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Failed to generate code", "error");
    }
  };

  const redeemTransferCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rawInput = redeemCode;
    const cleanCode = rawInput.trim().toUpperCase().replace(/\s+/g, '');
    
    if (!cleanCode) {
      showNotification("Please enter a code", "error");
      return;
    }
    
    if (!cleanCode.startsWith('TLC-')) {
      showNotification("Invalid format. Code must start with 'TLC-'", "error");
      return;
    }
    
    try {
      const supabase = createClient();
      
      const codeResponse = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('code', cleanCode)
        .single();
      
      if (codeResponse.error) {
        if (codeResponse.error.code === 'PGRST116') {
          showNotification(`Code "${cleanCode}" not found. Check for typos.`, "error");
        } else {
          showNotification("Database error: " + codeResponse.error.message, "error");
        }
        return;
      }
      
      const codeData = codeResponse.data;
      
      if (!codeData) {
        showNotification("Code does not exist.", "error");
        return;
      }
      
      if (codeData.status === 'REDEEMED') {
        showNotification("❌ This code was already redeemed.", "error");
        return;
      }
      
      if (codeData.status === 'EXPIRED' || new Date(codeData.expires_at) < new Date()) {
        showNotification("❌ This code has expired.", "error");
        return;
      }
      
      if (codeData.sender_id === user!.id) {
        showNotification("❌ You cannot redeem your own code.", "error");
        return;
      }
      
      const newBalance = balanceRef.current + codeData.amount;
      const newBaseBalance = baseBalanceRef.current + codeData.amount;
      
      const { error: updateCodeError } = await supabase
        .from('transfer_codes')
        .update({
          status: 'REDEEMED',
          redeemed_by_id: user!.id,
          redeemed_at: new Date().toISOString()
        })
        .eq('code', cleanCode)
        .eq('status', 'ACTIVE');
      
      if (updateCodeError) throw updateCodeError;
      
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          type: 'GIFT_RECEIVED',
          amount: codeData.amount,
          balance_after: newBalance,
          description: `Redeemed code ${cleanCode} (Capital locked)`
        });
      
      if (txnError) throw txnError;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: newBalance,
          base_balance: newBaseBalance
        })
        .eq('id', user!.id);
      
      if (updateError) throw updateError;
      
      setBalance(newBalance);
      setBaseBalance(newBaseBalance);
      balanceRef.current = newBalance;
      baseBalanceRef.current = newBaseBalance;
      
      setRedeemCode('');
      showNotification(`✅ Received ${codeData.amount.toLocaleString()} TLC!`, "success");
      
      const txnsResponse = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!txnsResponse.error && txnsResponse.data) {
        setTransactions(txnsResponse.data);
      }
      
    } catch (err: any) {
      console.error('💥 Unexpected error:', err);
      showNotification("❌ " + (err.message || "Failed to redeem code"), "error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification("Code copied to clipboard!", "success");
  };

  const handleRefresh = () => {
    fetchWalletData();
    showNotification("Refreshing...", "success");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm sm:text-base">Loading wallet...</p>
        </div>
      </div>
    );
  }

  const transferableBalance = getTransferableBalance();
  // Calculate invested capital (Total - Earned Profits). 
  // Since Base Balance is the "locked" capital, we display that as the investment anchor.
  const investedCapital = baseBalance; 

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
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
        currentView="WALLET" 
        onViewChange={(view) => view === 'DASHBOARD' ? router.push('/') : router.push('/wallet')} 
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white mb-6 sm:mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Balance</p>
                <p className="text-3xl sm:text-4xl font-bold">{balance.toLocaleString()} <span className="text-lg sm:text-xl text-blue-400">TLC</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh balance"
              >
                <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin")} />
              </button>
              <div className="text-right">
                <p className="text-slate-400 text-xs">Last Updated</p>
                <p className="text-sm">{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
          
          {/* 🔑 Broker Badge */}
          {isBroker && (
            <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center gap-3">
              <Crown className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="font-bold text-yellow-400">Broker Account</p>
                <p className="text-xs text-yellow-300">You can distribute coins without restrictions</p>
              </div>
            </div>
          )}
          
          {/* Investment Breakdown Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <PiggyBank className="w-3 h-3 text-slate-400" />
                <p className="text-xs text-slate-300">Locked Capital</p>
              </div>
              <p className="text-lg font-bold text-slate-200">{baseBalance.toLocaleString()} TLC</p>
            </div>
            <div className={cn("rounded-lg p-3 text-center border", isBroker ? "bg-yellow-500/20 border-yellow-500/30" : "bg-green-500/20 border-green-500/30")}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Server className="w-3 h-3 text-slate-400" />
                <p className="text-xs text-slate-300">{isBroker ? 'Available (Broker)' : 'Earned Profits'}</p>
              </div>
              <p className="text-lg font-bold text-yellow-400">{transferableBalance.toLocaleString()} TLC</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-slate-400" />
                <p className="text-xs text-slate-300">Total Value</p>
              </div>
              <p className="text-lg font-bold text-blue-400">{balance.toLocaleString()} TLC</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mt-3 text-center sm:text-left">
            {isBroker 
              ? '💼 As broker, you can distribute any amount from your balance.'
              : '💡 You can only transfer profits earned from server investments. Your initial capital is locked to keep servers running.'}
          </p>
          
          <div className="flex gap-3 sm:gap-4 mt-6">
            <button 
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Server className="w-5 h-5" />
              Invest in Servers
            </button>
            <button className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm sm:text-base">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {/* Transfer Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Generate Code */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {isBroker ? 'Distribute Coins' : 'Send Profits'}
              </h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {isBroker 
                ? 'Create a code to distribute TLC to users. No restrictions.'
                : 'Create a code to gift your server earnings to another user.'}
            </p>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                Available to Send: <span className="font-bold">{transferableBalance.toLocaleString()} TLC</span>
              </p>
              {!isBroker && transferableBalance <= 0 && (
                <p className="text-xs text-blue-600 mt-1 flex items-start gap-1">
                  <Lock className="w-3 h-3 inline mt-0.5 flex-shrink-0" />
                  <span>You have no earned profits yet. Invest in servers on the dashboard to start earning transferable TLC.</span>
                </p>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount"
                    min={isBroker ? 1 : 10}
                    max={transferableBalance}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">TLC</span>
                </div>
                {transferAmount && parseInt(transferAmount) > transferableBalance && (
                  <p className="text-xs text-red-600 mt-1">
                    Cannot exceed {transferableBalance.toLocaleString()} TLC (Earned Profits Only)
                  </p>
                )}
              </div>
              
              {generatedCode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 border border-green-200 rounded-xl"
                >
                  <p className="text-sm text-green-700 font-medium mb-2">
                    {isBroker ? 'Distribution Code:' : 'Your Gift Code:'}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-bold text-green-800">{generatedCode}</code>
                    <button 
                      onClick={() => copyToClipboard(generatedCode)}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-green-600" />
                    </button>
                  </div>
                </motion.div>
              )}
              
              <button 
                onClick={generateTransferCode}
                disabled={!transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > transferableBalance}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isBroker ? 'Generate Distribution Code' : 'Generate Code'}
              </button>
            </div>
          </div>

          {/* Redeem Code */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Redeem Gift</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Enter a code to claim TLC. Redeemed coins are added to your locked capital base.
            </p>
            
            <form onSubmit={redeemTransferCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gift Code
                </label>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="TLC-XXXXXXXX"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-mono uppercase"
                />
              </div>
              
              <button 
                type="submit"
                disabled={!redeemCode.trim()}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                Redeem TLC
              </button>
            </form>
          </div>
        </div>

        {/* Active Codes */}
        {transferCodes.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800">
                {isBroker ? 'Active Distribution Codes' : 'Active Gift Codes'}
              </h2>
            </div>
            <div className="space-y-3">
              {transferCodes.map((code) => (
                <div key={code.code} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-mono font-bold text-slate-800">{code.code}</p>
                    <p className="text-sm text-slate-500">Expires: {new Date(code.expires_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{code.amount.toLocaleString()} TLC</p>
                    <button onClick={() => copyToClipboard(code.code)} className="text-xs text-blue-600 hover:underline mt-1">Copy</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", txn.amount > 0 ? "bg-green-100" : "bg-red-100")}>
                      {txn.amount > 0 ? <CheckCircle className="w-4 h-4 text-green-600" /> : <ArrowRightLeft className="w-4 h-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{txn.description}</p>
                      <p className="text-xs text-slate-400">{new Date(txn.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold", txn.amount > 0 ? "text-green-600" : "text-red-600")}>
                      {txn.amount > 0 ? '+' : ''}{txn.amount.toLocaleString()} TLC
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
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
  Coins
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';
import { createClient } from '@/lib/supabase';

type TransactionType = 'EARN' | 'STAKE' | 'GIFT_SENT' | 'GIFT_RECEIVED' | 'BONUS';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transferCodes, setTransferCodes] = useState<TransferCode[]>([]);
  const [transferAmount, setTransferAmount] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch wallet data
  const fetchWalletData = async () => {
    if (!user?.id) return;
    
    try {
      setRefreshing(true);
      const supabase = createClient();
      
      // Get balance from profiles - USE wallet_balance COLUMN
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        
        // If profile doesn't exist (PGRST116), create it
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating one...');
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              wallet_balance: 0,
              created_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            });
          
          if (insertError) {
            console.error('Failed to create profile:', insertError);
          } else {
            setBalance(0);
          }
        } else {
          showNotification("Could not load wallet data", "error");
        }
      } else {
        setBalance(profile?.wallet_balance ?? 0);
      }
      
      // Get transactions
      const { data: txns, error: txnsError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!txnsError && txns) {
        setTransactions(txns);
      }
      
      // Get active transfer codes
      const { data: codes, error: codesError } = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('sender_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });
      
      if (!codesError && codes) {
        setTransferCodes(codes);
      }
    } catch (err) {
      console.warn('Could not fetch wallet data:', err);
      setBalance(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [user]);

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
    
    if (amount > balance) {
      showNotification("Insufficient balance", "error");
      return;
    }
    
    if (amount < 10) {
      showNotification("Minimum transfer is 10 TLT", "error");
      return;
    }
    
    try {
      const supabase = createClient();
      const code = 'TL-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const newBalance = balance - amount;
      
      // Create transfer code
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
      
      // Create transaction record
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          type: 'GIFT_SENT',
          amount: -amount,
          balance_after: newBalance,
          description: `Gift code ${code} created`
        });
      
      if (txnError) throw txnError;
      
      // Update profile balance - USE wallet_balance COLUMN
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user!.id);
      
      if (updateError) throw updateError;
      
      setBalance(newBalance);
      setGeneratedCode(code);
      setTransferAmount('');
      showNotification("Gift code generated!", "success");
      
      // Refresh codes list
      const { data: codes } = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('sender_id', user!.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });
      
      if (codes) setTransferCodes(codes);
      
    } catch (err: any) {
      console.error(err);
      showNotification(err.message || "Failed to generate code", "error");
    }
  };

  const redeemTransferCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Clean input aggressively
    const rawInput = redeemCode;
    const cleanCode = rawInput.trim().toUpperCase().replace(/\s+/g, '');
    
    if (!cleanCode) {
      showNotification("Please enter a code", "error");
      return;
    }
    
    if (!cleanCode.startsWith('TL-')) {
      showNotification("Invalid format. Code must start with 'TL-'", "error");
      return;
    }
    
    try {
      const supabase = createClient();
      
      console.log('🔍 Searching for code:', cleanCode);
      
      // 2. Search for the specific code - CORRECT SUPABASE SYNTAX
      const { data: codeData, error: codeError } = await supabase
        .from('transfer_codes')
        .select('*')
        .eq('code', cleanCode)
        .single();
      
      // 3. Handle NOT FOUND error
      if (codeError) {
        console.error('❌ Supabase error:', codeError);
        
        if (codeError.code === 'PGRST116') {
          showNotification(
            `Code "${cleanCode}" not found. Check for typos, or ask sender to regenerate.`, 
            "error"
          );
        } else {
          showNotification("Database error: " + codeError.message, "error");
        }
        return;
      }
      
      if (!codeData) {
        showNotification("Code does not exist in system.", "error");
        return;
      }
      
      console.log('✅ Found code:', codeData);
      
      // 4. Validate status
      if (codeData.status === 'REDEEMED') {
        showNotification("❌ This code was already redeemed by someone else.", "error");
        return;
      }
      
      if (codeData.status === 'EXPIRED') {
        showNotification("❌ This code has expired.", "error");
        return;
      }
      
      if (new Date(codeData.expires_at) < new Date()) {
        showNotification("❌ This code expired on " + new Date(codeData.expires_at).toLocaleString(), "error");
        return;
      }
      
      if (codeData.sender_id === user!.id) {
        showNotification("❌ You cannot redeem your own gift code.", "error");
        return;
      }
      
      // 5. Process the redemption
      const newBalance = balance + codeData.amount;
      
      console.log('💰 Updating balance:', balance, '->', newBalance);
      
      // Update code status FIRST (atomic operation)
      const { error: updateCodeError } = await supabase
        .from('transfer_codes')
        .update({
          status: 'REDEEMED',
          redeemed_by_id: user!.id,
          redeemed_at: new Date().toISOString()
        })
        .eq('code', cleanCode)
        .eq('status', 'ACTIVE');
      
      if (updateCodeError) {
        console.error('❌ Failed to update code status:', updateCodeError);
        if (updateCodeError.code === 'PGRST116') {
          showNotification("❌ This code was just redeemed by someone else!", "error");
        } else {
          showNotification("❌ System error: " + updateCodeError.message, "error");
        }
        return;
      }
      
      // Create transaction record
      const { error: txnError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          type: 'GIFT_RECEIVED',
          amount: codeData.amount,
          balance_after: newBalance,
          description: `Redeemed code ${cleanCode}`
        });
      
      if (txnError) {
        console.error('❌ Failed to create transaction:', txnError);
        // Rollback: mark code as ACTIVE again
        await supabase
          .from('transfer_codes')
          .update({ status: 'ACTIVE', redeemed_by_id: null, redeemed_at: null })
          .eq('code', cleanCode);
        showNotification("❌ Transaction failed. Code restored.", "error");
        return;
      }
      
      // Update user's profile balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user!.id);
      
      if (updateError) {
        console.error('❌ Failed to update profile:', updateError);
        showNotification("❌ Balance update failed. Contact support.", "error");
        return;
      }
      
      // Success!
      setBalance(newBalance);
      setRedeemCode('');
      showNotification(`✅ Received ${codeData.amount.toLocaleString()} TLT!`, "success");
      
      // Refresh transactions
      const { data: txns } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (txns) setTransactions(txns);
      
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={cn(
              "fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2",
              notification.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Header 
        user={user} 
        onSignOut={signOut} 
        currentView="WALLET" 
        onViewChange={(view) => view === 'DASHBOARD' ? router.push('/') : router.push('/wallet')} 
      />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Available Balance</p>
                <p className="text-4xl font-bold">{balance.toLocaleString()} <span className="text-xl text-blue-400">TLT</span></p>
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
          
          {/* Broker Info */}
          {user?.email === 'broker@truelabel.com' && (
            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded-xl">
              <div className="flex items-center gap-2 text-blue-300">
                <Coins className="w-5 h-5" />
                <span className="font-bold">Broker Account</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                You have 10,000,000 TLT to distribute. Generate gift codes to start the economy.
              </p>
            </div>
          )}
          
          <div className="flex gap-4 mt-6">
            <button 
              onClick={() => router.push('/')}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Earn More
            </button>
            <button className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {/* Transfer Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Generate Code */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Send Gift</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Create a code to gift TLT to another user. Code expires in 24 hours.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount to Gift
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="10"
                    max={balance}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">TLT</span>
                </div>
              </div>
              
              {generatedCode && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 border border-green-200 rounded-xl"
                >
                  <p className="text-sm text-green-700 font-medium mb-2">Your Gift Code:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-lg font-mono font-bold text-green-800">{generatedCode}</code>
                    <button 
                      onClick={() => copyToClipboard(generatedCode)}
                      className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                    >
                      <Copy className="w-5 h-5 text-green-600" />
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">Share this code with the recipient</p>
                </motion.div>
              )}
              
              <button 
                onClick={generateTransferCode}
                disabled={!transferAmount || parseInt(transferAmount) <= 0}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Code
              </button>
            </div>
          </div>

          {/* Redeem Code */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Redeem Gift</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Enter a code you received to claim TLT.
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
                  placeholder="TL-XXXXXXXX"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-mono uppercase"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Tip: Codes are case-insensitive. No spaces allowed.
                </p>
              </div>
              
              <button 
                type="submit"
                disabled={!redeemCode.trim()}
                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Redeem TLT
              </button>
            </form>
          </div>
        </div>

        {/* Active Codes */}
        {transferCodes.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800">Active Gift Codes</h2>
            </div>
            <div className="space-y-3">
              {transferCodes.map((code) => (
                <div key={code.code} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-mono font-bold text-slate-800">{code.code}</p>
                    <p className="text-sm text-slate-500">
                      Expires: {new Date(code.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{code.amount} TLT</p>
                    <button 
                      onClick={() => copyToClipboard(code.code)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-800">Transaction History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm mt-1">Receive TLT as a gift to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      txn.amount > 0 ? "bg-green-100" : "bg-red-100"
                    )}>
                      {txn.amount > 0 ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowRightLeft className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{txn.description}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(txn.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      txn.amount > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {txn.amount > 0 ? '+' : ''}{txn.amount.toLocaleString()} TLT
                    </p>
                    <p className="text-xs text-slate-400">
                      Balance: {txn.balance_after.toLocaleString()} TLT
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
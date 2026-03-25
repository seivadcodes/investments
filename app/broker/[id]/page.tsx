'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, AlertCircle, Copy, Clock, ShieldCheck,
  DollarSign, Phone, Star, Loader2, MessageSquare,
  TrendingUp, XCircle, ChevronRight, Inbox, Coins,
  History, FileText, Settings, Edit2, Save
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';
import { createClient } from '@/lib/supabase';

// --- CONSTANTS ---
const BASE_TLC_RATE = 100; // 1 TLC = 100 KES base rate

// --- TYPES ---
type TransactionType = 'BUY' | 'SELL';
type TxStatus = 'PENDING_PAYMENT' | 'PENDING_VERIFICATION' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'DECLINED';

interface BrokerDetails {
  id: string;
  user_id: string;
  name: string;
  buy_rate: number;
  sell_rate: number;
  min_amount: number;
  max_amount: number;
  status: 'ACTIVE' | 'BUSY' | 'OFFLINE';
  rating: number;
  mpesa_number?: string;
  instructions?: string;
}

interface Transaction {
  id: string;
  user_id: string;
  broker_id: string;
  type: TransactionType;
  amount: number;
  user_mpesa_number?: string;
  user_provided_code: string | null;
  broker_generated_code: string | null;
  status: TxStatus;
  created_at: string;
  completed_at: string | null;
  user_email?: string;
}

interface NotificationState {
  msg: string;
  type: 'success' | 'error';
}

export default function BrokerTradePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const brokerId = params.id as string;

  // State
  const [broker, setBroker] = useState<BrokerDetails | null>(null);
  const [isBrokerOwner, setIsBrokerOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txType, setTxType] = useState<TransactionType>('BUY');
  const [amount, setAmount] = useState<string>('');
  const [userMpesaNumber, setUserMpesaNumber] = useState('');
  const [userCode, setUserCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [status, setStatus] = useState<TxStatus>('PENDING_PAYMENT');
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track current active transaction ID for users
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  
  // User transaction history
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Broker Dashboard State
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [completedTransactions, setCompletedTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [brokerCodeInput, setBrokerCodeInput] = useState('');
  
  // Broker Edit Mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    mpesa_number: '',
    buy_rate: 0,
    sell_rate: 0,
    min_amount: 0,
    max_amount: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'BUSY' | 'OFFLINE',
    instructions: ''
  });

  // --- NOTIFICATION HELPER ---
  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- CALCULATE KES AMOUNT ---
  const calculateKES = useCallback((tlcAmount: number, type: TransactionType) => {
    if (!broker) return 0;
    const rate = type === 'BUY' ? broker.sell_rate : broker.buy_rate;
    return Math.floor(tlcAmount * BASE_TLC_RATE * rate);
  }, [broker]);

  const getRateDisplay = useCallback((type: TransactionType) => {
    if (!broker) return 0;
    const rate = type === 'BUY' ? broker.sell_rate : broker.buy_rate;
    return (BASE_TLC_RATE * rate).toFixed(0);
  }, [broker]);

  // --- COPY TO CLIPBOARD ---
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showNotification('Code copied!', 'success');
  };

  // --- FETCH BROKER DETAILS ---
  const fetchBroker = useCallback(async () => {
    if (!brokerId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('brokers')
        .select('*')
        .eq('id', brokerId)
        .single();

      if (error) throw error;

      setBroker(data);
      
      // Check if current user is the broker owner
      if (user?.id && data?.user_id === user.id) {
        setIsBrokerOwner(true);
        setEditForm({
          name: data.name,
          mpesa_number: data.mpesa_number || '',
          buy_rate: data.buy_rate,
          sell_rate: data.sell_rate,
          min_amount: data.min_amount,
          max_amount: data.max_amount,
          status: data.status,
          instructions: data.instructions || ''
        });
        fetchBrokerTransactions(data.id);
      } else {
        // Regular users fetch their transaction history with this broker
        fetchUserTransactions(brokerId);
      }
    } catch (err) {
      console.error('Failed to load broker:', err);
      showNotification('Broker not found', 'error');
      router.push('/broker');
    } finally {
      setLoading(false);
    }
  }, [brokerId, user, router]);

  // Fetch user's transactions with this broker
  const fetchUserTransactions = async (brokerId: string) => {
    if (!user?.id) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('broker_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('broker_id', brokerId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setUserTransactions(data || []);

      // Find any pending transaction to restore state
      const pending = data?.find(tx => 
        tx.status === 'PENDING_PAYMENT' || 
        tx.status === 'PENDING_VERIFICATION'
      );

      if (pending) {
        setActiveTransactionId(pending.id);
        setStatus(pending.status as TxStatus);
        if (pending.status === 'COMPLETED' && pending.broker_generated_code) {
          setGeneratedCode(pending.broker_generated_code);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user transactions:', err);
    }
  };

  // --- FETCH BROKER TRANSACTIONS (For Broker Owner) ---
  // Find and replace the fetchBrokerTransactions function with this:

const fetchBrokerTransactions = async (brokerId: string) => {
  try {
    const supabase = createClient();
    
    // ✅ FIX: Destructure with 'data:' prefix for array responses
    // Query 1: PENDING_PAYMENT
    // ✅ CORRECT (actual fix)
const { data: pendingPayment, error: error1 } = await supabase
  .from('broker_transactions')
  .select('*')
  .eq('broker_id', brokerId)
  .eq('status', 'PENDING_PAYMENT')
  .order('created_at', { ascending: false });

const { data: pendingVerification, error: error2 } = await supabase
  .from('broker_transactions')
  .select('*')
  .eq('broker_id', brokerId)
  .eq('status', 'PENDING_VERIFICATION')
  .order('created_at', { ascending: false });

const { data: completed, error: error3 } = await supabase
  .from('broker_transactions')
  .select('*')
  .eq('broker_id', brokerId)
  .eq('status', 'COMPLETED')
  .order('completed_at', { ascending: false })
  .limit(50);

    // Combine pending transactions
    const allPending = [
      ...(pendingPayment || []),
      ...(pendingVerification || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setPendingTransactions(allPending);
    setCompletedTransactions(completed || []);

  } catch (err) {
    console.error('Failed to fetch transactions:', err);
    showNotification('Failed to load transactions', 'error');
  }
};

  useEffect(() => {
    fetchBroker();
  }, [fetchBroker]);

  // Poll for transaction updates (For Users)
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (!isBrokerOwner && activeTransactionId && user?.id &&
        (status === 'PENDING_VERIFICATION' || status === 'PENDING_PAYMENT')) {
      pollInterval = setInterval(async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('broker_transactions')
            .select('status, broker_generated_code, completed_at')
            .eq('id', activeTransactionId)
            .single();

          if (error) throw error;

          if (data && data.status !== status) {
            setStatus(data.status as TxStatus);
            if (data.broker_generated_code) {
              setGeneratedCode(data.broker_generated_code);
            }
            if (data.status === 'COMPLETED') {
              showNotification('Transaction completed!', 'success');
            } else if (data.status === 'DECLINED') {
              showNotification('Transaction was declined by broker', 'error');
            }
            await fetchUserTransactions(brokerId);
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 5000);
    }

    return () => clearInterval(pollInterval);
  }, [isBrokerOwner, status, activeTransactionId, brokerId, user]);

  // --- USER: SUBMIT TRANSACTION ---
  const handleSubmitTransaction = async () => {
    const numAmount = parseInt(amount);
    
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    // ✅ BUY: User needs broker's number (already shown), just needs Mpesa code
    // ✅ SELL: User needs to enter THEIR number to receive payment
    if (txType === 'SELL' && !userMpesaNumber.trim()) {
      showNotification('Please enter your Mpesa number to receive payment', 'error');
      return;
    }
    
    if (!userCode.trim()) {
      showNotification('Please paste the code', 'error');
      return;
    }
    
    if (broker && (numAmount < broker.min_amount || numAmount > broker.max_amount)) {
      showNotification(`Amount must be between ${broker?.min_amount} and ${broker?.max_amount} TLC`, 'error');
      return;
    }

    // Validate Mpesa number format for SELL
    if (txType === 'SELL' && !/^07\d{8}$/.test(userMpesaNumber.replace(/\s/g, ''))) {
      showNotification('Please enter a valid Mpesa number (e.g., 0712345678)', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.from('broker_transactions').insert({
        broker_id: brokerId,
        user_id: user!.id,
        type: txType,
        amount: numAmount,
        user_mpesa_number: txType === 'SELL' ? userMpesaNumber.replace(/\s/g, '') : null,
        user_provided_code: userCode,
        status: 'PENDING_VERIFICATION',
        created_at: new Date().toISOString()
      }).select().single();

      if (error) throw error;
      
      setActiveTransactionId(data.id);
      setStatus('PENDING_VERIFICATION');
      setUserCode('');
      setUserMpesaNumber('');
      setAmount('');
      
      await fetchUserTransactions(brokerId);
      
      showNotification(
        txType === 'BUY' 
          ? 'Mpesa code submitted! Waiting for broker to verify and send TLC...' 
          : 'TLC code submitted! Waiting for broker to verify and send Mpesa...',
        'success'
      );
    } catch (err: any) {
      console.error('Submit error:', err);
      showNotification(err.message || 'Failed to submit transaction', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BROKER: UPDATE PROFILE ---
  const handleUpdateProfile = async () => {
    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('brokers')
        .update({
          name: editForm.name,
          mpesa_number: editForm.mpesa_number,
          buy_rate: editForm.buy_rate,
          sell_rate: editForm.sell_rate,
          min_amount: editForm.min_amount,
          max_amount: editForm.max_amount,
          status: editForm.status,
          instructions: editForm.instructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', brokerId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setBroker(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditingProfile(false);
      showNotification('Profile updated successfully!', 'success');
      fetchBrokerTransactions(brokerId);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BROKER: ACCEPT TRANSACTION ---
  const handleAcceptTransaction = async (tx: Transaction) => {
    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('broker_transactions')
        .update({ status: 'PENDING_VERIFICATION' })
        .eq('id', tx.id)
        .eq('broker_id', brokerId);

      if (error) throw error;

      showNotification('Transaction accepted', 'success');
      fetchBrokerTransactions(brokerId);
      setSelectedTx(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to accept', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BROKER: DECLINE TRANSACTION ---
  const handleDeclineTransaction = async (tx: Transaction) => {
    if (!confirm('Decline this transaction?')) return;
    setIsProcessing(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('broker_transactions')
        .update({ status: 'DECLINED' })
        .eq('id', tx.id)
        .eq('broker_id', brokerId);

      if (error) throw error;

      showNotification('Transaction declined', 'success');
      fetchBrokerTransactions(brokerId);
      setSelectedTx(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to decline', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- BROKER: COMPLETE TRANSACTION ---
  const handleCompleteTransaction = async (tx: Transaction) => {
    if (!brokerCodeInput.trim()) {
      showNotification('Please enter the confirmation code', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const supabase = createClient();
      
      const finalCode = tx.type === 'BUY' 
        ? 'TLC-' + Math.random().toString(36).substr(2, 9).toUpperCase()
        : brokerCodeInput;

      const { error } = await supabase
        .from('broker_transactions')
        .update({
          status: 'COMPLETED',
          broker_generated_code: finalCode,
          completed_at: new Date().toISOString()
        })
        .eq('id', tx.id)
        .eq('broker_id', brokerId);

      if (error) throw error;

      await supabase.rpc('increment_broker_trades', { broker_id: brokerId });

      showNotification('Transaction completed!', 'success');
      fetchBrokerTransactions(brokerId);
      setSelectedTx(null);
      setBrokerCodeInput('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to complete', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!broker) return null;

  // =====================================================
  // BROKER OWNER VIEW
  // =====================================================
  if (isBrokerOwner) {
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
          currentView="BROKER"
          onViewChange={(v) => v === 'DASHBOARD' ? router.push('/') : router.push('/broker')}
        />

        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
          <button
            onClick={() => router.push('/broker')}
            className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Brokers
          </button>

          {/* Broker Profile Header */}
          <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-300 text-xs font-bold uppercase">Broker Dashboard</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">{broker.name}</h1>
                <p className="text-slate-300 mt-2 text-sm">Manage your transaction requests</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-2">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold", broker.status === 'ACTIVE' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400")}>
                    {broker.status}
                  </span>
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit Profile"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-slate-400 text-sm">Buy: KES {(BASE_TLC_RATE * broker.buy_rate).toFixed(0)} | Sell: KES {(BASE_TLC_RATE * broker.sell_rate).toFixed(0)}</p>
                <p className="text-slate-500 text-xs mt-1">(Base Rate: 1 TLC = 100 KES)</p>
              </div>
            </div>
          </div>

          {/* Broker Edit Profile Panel */}
          <AnimatePresence>
            {isEditingProfile && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-blue-600" />
                      Edit Broker Profile
                    </h3>
                    <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-slate-600">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Broker Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mpesa Number (To Receive Payments)</label>
                      <input
                        type="text"
                        value={editForm.mpesa_number}
                        onChange={(e) => setEditForm({ ...editForm, mpesa_number: e.target.value })}
                        placeholder="0712345678"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Buy Rate (Multiplier)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.buy_rate}
                        onChange={(e) => setEditForm({ ...editForm, buy_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">1 TLC = KES {(BASE_TLC_RATE * editForm.buy_rate).toFixed(0)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Sell Rate (Multiplier)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.sell_rate}
                        onChange={(e) => setEditForm({ ...editForm, sell_rate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">1 TLC = KES {(BASE_TLC_RATE * editForm.sell_rate).toFixed(0)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount (TLC)</label>
                      <input
                        type="number"
                        value={editForm.min_amount}
                        onChange={(e) => setEditForm({ ...editForm, min_amount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount (TLC)</label>
                      <input
                        type="number"
                        value={editForm.max_amount}
                        onChange={(e) => setEditForm({ ...editForm, max_amount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="BUSY">Busy</option>
                        <option value="OFFLINE">Offline</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
                      <input
                        type="text"
                        value={editForm.instructions}
                        onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                        placeholder="Optional instructions for users"
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={isProcessing}
                      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-6 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('PENDING')}
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2",
                activeTab === 'PENDING' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
              )}
            >
              <Inbox className="w-4 h-4" />
              Pending ({pendingTransactions.length})
            </button>
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2",
                activeTab === 'COMPLETED' ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Completed ({completedTransactions.length})
            </button>
          </div>

          {/* Transaction List */}
          {activeTab === 'PENDING' && pendingTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Inbox className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">No Pending Requests</h3>
              <p className="text-slate-500 mt-2">New transaction requests will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(activeTab === 'PENDING' ? pendingTransactions : completedTransactions).map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        tx.type === 'BUY' ? "bg-green-100" : "bg-blue-100"
                      )}>
                        {tx.type === 'BUY' ? (
                          <DollarSign className="w-6 h-6 text-green-600" />
                        ) : (
                          <TrendingUp className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {tx.type === 'BUY' ? 'User Buying TLC' : 'User Selling TLC'}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold",
                            tx.status === 'PENDING_PAYMENT' ? "bg-yellow-100 text-yellow-700" :
                            tx.status === 'PENDING_VERIFICATION' ? "bg-blue-100 text-blue-700" :
                            tx.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                            tx.status === 'DECLINED' ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {tx.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          Amount: <span className="font-bold text-slate-700">{tx.amount} TLC</span>
                          <span className="mx-2">•</span>
                          <span className="font-bold text-green-700">KES {calculateKES(tx.amount, tx.type).toLocaleString()}</span>
                        </p>
                        {/* ✅ BUY: Show user's Mpesa code they sent */}
                        {/* ✅ SELL: Show user's Mpesa number to send payment to */}
                        {tx.type === 'SELL' && tx.user_mpesa_number && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Send Payment To: {tx.user_mpesa_number}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {activeTab === 'PENDING' && tx.status === 'PENDING_PAYMENT' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeclineTransaction(tx)}
                          disabled={isProcessing}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptTransaction(tx)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                        >
                          Accept
                        </button>
                      </div>
                    )}

                    {activeTab === 'PENDING' && tx.status === 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm flex items-center gap-2"
                      >
                        Complete
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}

                    {activeTab === 'COMPLETED' && (
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Details
                      </button>
                    )}
                  </div>

                  {tx.user_provided_code && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">User Provided Code:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono font-bold text-slate-800">{tx.user_provided_code}</code>
                        <button onClick={() => copyToClipboard(tx.user_provided_code!)} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {tx.broker_generated_code && (
                    <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 mb-1">Generated Code:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono font-bold text-green-800">{tx.broker_generated_code}</code>
                        <button onClick={() => copyToClipboard(tx.broker_generated_code!)} className="text-green-600 hover:bg-green-100 p-1.5 rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </main>

        {/* Transaction Details Modal */}
        <AnimatePresence>
          {selectedTx && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedTx(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
              >
                <div className="text-center mb-6">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                    selectedTx.status === 'COMPLETED' ? "bg-green-100" : "bg-blue-100"
                  )}>
                    {selectedTx.status === 'COMPLETED' ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <FileText className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedTx.status === 'COMPLETED' ? 'Transaction Details' : 'Complete Transaction'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedTx.type === 'BUY' 
                      ? 'User bought TLC with Mpesa' 
                      : 'User sold TLC for Mpesa'}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500">Transaction Details</p>
                    <p className="font-bold text-slate-800">{selectedTx.amount} TLC</p>
                    <p className="text-sm font-bold text-green-700">KES {calculateKES(selectedTx.amount, selectedTx.type).toLocaleString()}</p>
                    {/* ✅ SELL: Show user's Mpesa number to send payment */}
                    {selectedTx.type === 'SELL' && selectedTx.user_mpesa_number && (
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Send To: {selectedTx.user_mpesa_number}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Created: {new Date(selectedTx.created_at).toLocaleString()}
                    </p>
                    {selectedTx.completed_at && (
                      <p className="text-xs text-slate-400">
                        Completed: {new Date(selectedTx.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {selectedTx.user_provided_code && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium mb-1">User's Code:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono font-bold text-blue-800">{selectedTx.user_provided_code}</code>
                        <button onClick={() => copyToClipboard(selectedTx.user_provided_code!)} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedTx.broker_generated_code && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium mb-1">Generated Code:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono font-bold text-green-800">{selectedTx.broker_generated_code}</code>
                        <button onClick={() => copyToClipboard(selectedTx.broker_generated_code!)} className="text-green-600 hover:bg-green-100 p-1.5 rounded">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show code input only for PENDING_VERIFICATION */}
                  {selectedTx.status === 'PENDING_VERIFICATION' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {selectedTx.type === 'BUY' ? 'TLC Code to Send' : 'Mpesa Confirmation'}
                      </label>
                      <input
                        type="text"
                        value={brokerCodeInput}
                        onChange={(e) => setBrokerCodeInput(e.target.value)}
                        placeholder={selectedTx.type === 'BUY' ? 'TLC-XXXXXXXX' : 'QFH...'}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedTx(null); setBrokerCodeInput(''); }}
                    className="flex-1 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                  >
                    Close
                  </button>
                  {selectedTx.status === 'PENDING_VERIFICATION' && (
                    <button
                      onClick={() => handleCompleteTransaction(selectedTx)}
                      disabled={!brokerCodeInput || isProcessing}
                      className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Complete'}
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Footer />
      </div>
    );
  }

  // =====================================================
  // REGULAR USER VIEW
  // =====================================================
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
        currentView="BROKER"
        onViewChange={(v) => v === 'DASHBOARD' ? router.push('/') : router.push('/broker')}
      />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <button
          onClick={() => router.push('/broker')}
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Brokers
        </button>

        {/* Broker Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-blue-700 font-bold text-2xl">
                {broker.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{broker.name}</h1>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {broker.rating}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", broker.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                    {broker.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Rates (1 TLC = 100 KES)</p>
              <p className="text-sm font-medium text-green-700">Buy: KES {getRateDisplay('SELL')}</p>
              <p className="text-sm font-medium text-blue-700">Sell: KES {getRateDisplay('BUY')}</p>
            </div>
          </div>
          
          {/* Toggle Buy/Sell */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl mb-4">
            <button
              onClick={() => { setTxType('BUY'); setStatus('PENDING_PAYMENT'); setAmount(''); setUserCode(''); setUserMpesaNumber(''); setGeneratedCode(null); }}
              className={cn("py-2.5 rounded-lg text-sm font-bold transition-all", txType === 'BUY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Buy TLC (Send Mpesa)
            </button>
            <button
              onClick={() => { setTxType('SELL'); setStatus('PENDING_PAYMENT'); setAmount(''); setUserCode(''); setUserMpesaNumber(''); setGeneratedCode(null); }}
              className={cn("py-2.5 rounded-lg text-sm font-bold transition-all", txType === 'SELL' ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              Sell TLC (Get Mpesa)
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            <p>{broker.instructions || "Complete the form below and wait for the broker to verify. Transactions are irreversible once confirmed."}</p>
          </div>
        </div>

        {/* Show active/pending transaction if exists */}
        {activeTransactionId && status !== 'PENDING_PAYMENT' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Active Transaction
              </h3>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold",
                status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                status === 'DECLINED' ? "bg-red-100 text-red-700" :
                status === 'CANCELLED' ? "bg-slate-100 text-slate-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {status.replace('_', ' ')}
              </span>
            </div>
            
            {status === 'COMPLETED' && generatedCode ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-700 font-medium mb-2">Your Code:</p>
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono font-bold text-green-800">{generatedCode}</code>
                  <button onClick={() => copyToClipboard(generatedCode)} className="text-green-600 hover:bg-green-100 p-2 rounded">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : status === 'PENDING_VERIFICATION' ? (
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-slate-600 font-medium">Waiting for broker verification...</p>
                <p className="text-xs text-slate-400 mt-1">This usually takes 1-5 minutes</p>
              </div>
            ) : status === 'DECLINED' ? (
              <div className="text-center py-4">
                <XCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                <p className="text-slate-600 font-medium">Transaction was declined by broker</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Transaction History Button */}
        {userTransactions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full mb-6 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-slate-700">Transaction History</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{userTransactions.length}</span>
            </div>
            <ChevronRight className={cn("w-5 h-5 text-slate-400 transition-transform", showHistory && "rotate-90")} />
          </button>
        )}

        {/* Transaction History Panel */}
        <AnimatePresence>
          {showHistory && userTransactions.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                {userTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        tx.type === 'BUY' ? "bg-green-100" : "bg-blue-100"
                      )}>
                        {tx.type === 'BUY' ? (
                          <DollarSign className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">
                          {tx.type === 'BUY' ? 'Bought TLC' : 'Sold TLC'} - {tx.amount} TLC
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        tx.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                        tx.status === 'DECLINED' ? "bg-red-100 text-red-700" :
                        tx.status === 'PENDING_VERIFICATION' ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {tx.status.replace('_', ' ')}
                      </span>
                      {tx.broker_generated_code && (
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs font-mono text-slate-600">{tx.broker_generated_code.substring(0, 12)}...</code>
                          <button onClick={() => copyToClipboard(tx.broker_generated_code!)} className="text-blue-600 hover:bg-blue-100 p-1 rounded">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Flow Form */}
        {!activeTransactionId || status === 'COMPLETED' || status === 'DECLINED' || status === 'CANCELLED' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            {status === 'COMPLETED' || status === 'DECLINED' || status === 'CANCELLED' ? (
              <div className="p-6 sm:p-8 text-center">
                <button
                  onClick={() => {setStatus('PENDING_PAYMENT'); setAmount(''); setUserCode(''); setUserMpesaNumber(''); setGeneratedCode(null);}}
                  className="text-blue-600 font-bold hover:underline mb-4"
                >
                  Start New Transaction
                </button>
              </div>
            ) : null}

            <div className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                {txType === 'BUY' ? 'How much TLC do you want?' : 'How much TLC are you selling?'}
              </h2>
              <p className="text-slate-500 text-sm mb-6">
                {txType === 'BUY' 
                  ? `Rate: 1 TLC = KES ${getRateDisplay('SELL')}. Min: ${broker.min_amount} TLC, Max: ${broker.max_amount} TLC`
                  : `Rate: 1 TLC = KES ${getRateDisplay('BUY')}. Min: ${broker.min_amount} TLC, Max: ${broker.max_amount} TLC`
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (TLC)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* KES Preview */}
                {amount && parseInt(amount) > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">You will {txType === 'BUY' ? 'pay' : 'receive'}:</span>
                      <span className="text-xl font-bold text-green-700">KES {calculateKES(parseInt(amount), txType).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {txType === 'BUY' ? 'Send this exact amount via Mpesa' : 'Sent to your Mpesa after verification'}
                    </p>
                  </div>
                )}

                {/* ✅ BUY: Show BROKER's Mpesa number (user sends money TO broker) */}
                {txType === 'BUY' && amount && parseInt(amount) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm text-blue-700 font-medium mb-2">Send Mpesa Payment To:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-800">{broker.mpesa_number || 'Not set'}</span>
                      <button onClick={() => copyToClipboard(broker.mpesa_number || '')} className="text-blue-600 hover:bg-blue-100 p-2 rounded">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      Amount: KES {calculateKES(parseInt(amount), txType).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* ✅ SELL: User enters THEIR Mpesa number (broker sends money TO user) */}
                {txType === 'SELL' && amount && parseInt(amount) > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Your Mpesa Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={userMpesaNumber}
                      onChange={(e) => setUserMpesaNumber(e.target.value)}
                      placeholder="0712345678"
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Broker will send KES {calculateKES(parseInt(amount), txType).toLocaleString()} to this number
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {txType === 'BUY' ? 'Mpesa Confirmation Code' : 'Your TLC Code'}
                  </label>
                  <input
                    type="text"
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                    placeholder={txType === 'BUY' ? 'QFH123...' : 'TLC-XXXXXXXX'}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {txType === 'BUY' 
                      ? 'Paste the code from your Mpesa SMS after sending payment' 
                      : 'Paste your TLC coin code here'}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Important:</strong> After submitting, wait for the broker to verify your code. 
                    {txType === 'BUY' ? ' They will send you TLC coins.' : ' They will send Mpesa payment.'}
                  </p>
                </div>

                <button
                  onClick={handleSubmitTransaction}
                  disabled={isProcessing || !amount || !userCode || (txType === 'SELL' && !userMpesaNumber)}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit & Wait for Verification'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
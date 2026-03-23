'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';
import {
  ViewState,
  Batch,
  UserState,
  BatchResult,
  AVAILABLE_BATCHES,
  DashboardView,
  WorkView,
  ProcessingView,
  ResultsView,
  WalletView
} from '@/components/dashboard/DashboardViews';

export default function TrueLabelDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [userStats, setUserStats] = useState<UserState>({
    credits: 0,
    staked: 0,
    accuracy: 95.0,
    totalBatches: 0,
    rank: 'Silver'
  });
  
  const [baseBalance, setBaseBalance] = useState(0);
  const [dailyBaseRate, setDailyBaseRate] = useState(0);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [batchGuesses, setBatchGuesses] = useState<('AI' | 'REAL')[]>([]);
  const [processingTimeLeft, setProcessingTimeLeft] = useState(60);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [transferCode, setTransferCode] = useState<string>('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Fetch user profile data from Supabase on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        const response = await supabase
          .from('profiles')
          .select('wallet_balance, accuracy, total_batches, rank, base_balance, daily_earning_rate')
          .eq('id', user.id)
          .single();
        
        if (response.error) throw response.error;
        
        const profile = response.data;
        
        if (profile) {
          const balance = profile.wallet_balance || 0;
          const calculatedRank = calculateRank(balance);
          const calculatedDailyRate = calculateDailyRate(balance);
          
          setUserStats({
            credits: balance,
            staked: 0,
            accuracy: profile.accuracy || 95.0,
            totalBatches: profile.total_batches || 0,
            rank: profile.rank || calculatedRank
          });
          setBaseBalance(profile.base_balance || 0);
          setDailyBaseRate(profile.daily_earning_rate || calculatedDailyRate);
        }
      } catch (err) {
        console.warn('Could not fetch profile, using defaults:', err);
      } finally {
        setLoaded(true);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  const calculateRank = (balance: number): 'Silver' | 'Gold' | 'Platinum' => {
    if (balance >= 10000) return 'Platinum';
    if (balance >= 1000) return 'Gold';
    return 'Silver';
  };

  const calculateDailyRate = (balance: number): number => {
    if (balance <= 0) return 0;
    return Math.floor(balance / 20);
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const getTransferableBalance = () => {
    return Math.max(0, userStats.credits - baseBalance);
  };

  // Calculate base reward per batch (daily_rate / 10 batches)
  const getBaseRewardPerBatch = () => {
    if (dailyBaseRate <= 0) return 5;
    return Math.max(1, Math.floor(dailyBaseRate / 10));
  };

  const acceptBatch = (batch: Batch) => {
    setActiveBatch(batch);
    setCurrentImageIndex(0);
    setBatchGuesses([]);
    setView('WORK');
  };

  const submitImageGuess = (guess: 'AI' | 'REAL') => {
    const newGuesses = [...batchGuesses, guess];
    setBatchGuesses(newGuesses);

    if (currentImageIndex < (activeBatch!.imageCount - 1)) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      handleSubmitBatch(newGuesses);
    }
  };

  const handleSubmitBatch = (guesses: ('AI' | 'REAL')[]) => {
    setView('PROCESSING');
    setProcessingTimeLeft(60);

    setTimeout(() => {
      const correctCount = Math.floor(Math.random() * 6);
      const accuracy = (correctCount / activeBatch!.imageCount) * 100;
      
      // NEW ECONOMICS: Proportional bonuses based on base reward
      const baseReward = getBaseRewardPerBatch();
      let finalReward = baseReward;
      
      // Proportional accuracy modifier (20% of base reward)
      const bonusAmount = Math.floor(baseReward * 0.2);
      
      if (accuracy >= 80) {
        finalReward = baseReward + bonusAmount;  // +20%
      } else if (accuracy >= 60) {
        finalReward = baseReward + Math.floor(bonusAmount / 2);  // +10%
      } else if (accuracy >= 40) {
        finalReward = baseReward;  // Base rate
      } else {
        finalReward = Math.max(0, baseReward - bonusAmount);  // -20% (min 0)
      }

      setBatchResult({ 
        correctCount, 
        totalCount: activeBatch!.imageCount, 
        reward: finalReward, 
        accuracy
      });

      setUserStats(prev => {
        const newCredits = prev.credits + finalReward;
        const newRank = calculateRank(newCredits);
        
        return {
          ...prev,
          credits: newCredits,
          accuracy: ((prev.accuracy * prev.totalBatches) + accuracy) / (prev.totalBatches + 1),
          totalBatches: prev.totalBatches + 1,
          rank: newRank
        };
      });

      setView('RESULTS');
    }, 60000);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'PROCESSING' && processingTimeLeft > 0) {
      timer = setInterval(() => {
        setProcessingTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, processingTimeLeft]);

  const generateTransferCode = (amount: number): string | null => {
    const transferable = getTransferableBalance();
    if (amount > transferable) {
      showNotification(`You can only transfer TLC you've earned. Transferable: ${transferable} TLC`, "error");
      return null;
    }
    const code = 'TLC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setTransferCode(code);
    showNotification("Code generated. Valid for 24h.", "success");
    return code;
  };

  const redeemCode = (e: React.FormEvent, amount: number) => {
    e.preventDefault();
    
    setUserStats(prev => {
      const newCredits = prev.credits + amount;
      const newDailyRate = calculateDailyRate(newCredits);
      return {
        ...prev,
        credits: newCredits,
        rank: calculateRank(newCredits)
      };
    });
    setBaseBalance(prev => prev + amount);
    setDailyBaseRate(calculateDailyRate(baseBalance + amount));
    setTransferCode('');
    showNotification(`${amount} TLC Received. Daily earning rate: ${calculateDailyRate(baseBalance + amount)} TLC/day`, "success");
  };

  if (authLoading || !loaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading your workspace...</p>
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
        currentView={view} 
        onViewChange={(v) => {
          if (v === 'WALLET') {
            router.push('/wallet');
          } else {
            setView(v as ViewState);
          }
        }} 
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'DASHBOARD' && (
              <DashboardView 
                userStats={userStats} 
                onAcceptBatch={acceptBatch}
                currency="TLC"
                dailyRate={dailyBaseRate}
              />
            )}
            {view === 'WORK' && (
              <WorkView 
                activeBatch={activeBatch} 
                currentImageIndex={currentImageIndex} 
                onGuess={submitImageGuess}
                currency="TLC"
                baseReward={getBaseRewardPerBatch()}
              />
            )}
            {view === 'PROCESSING' && (
              <ProcessingView timeLeft={processingTimeLeft} currency="TLC" />
            )}
            {view === 'RESULTS' && (
              <ResultsView 
                batchResult={batchResult} 
                activeBatch={activeBatch} 
                onReturn={() => setView('DASHBOARD')}
                currency="TLC"
              />
            )}
            {view === 'WALLET' && (
              <WalletView 
                transferCode={transferCode} 
                onGenerateCode={generateTransferCode} 
                onRedeemCode={redeemCode}
                totalBalance={userStats.credits}
                baseBalance={baseBalance}
                transferableBalance={getTransferableBalance()}
                currency="TLC"
                dailyRate={dailyBaseRate}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
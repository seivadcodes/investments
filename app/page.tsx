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
  DashboardView,
  WorkView,
  ProcessingView,
  ResultsView,
  WalletView
} from '@/components/dashboard/DashboardViews';
import { createClient } from '@/lib/supabase';

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
  const [isBroker, setIsBroker] = useState(false); // 🔑 Added
  const [transferAmount, setTransferAmount] = useState(''); // 🔑 Added
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [batchGuesses, setBatchGuesses] = useState<('AI' | 'REAL')[]>([]);
  const [processingTimeLeft, setProcessingTimeLeft] = useState(30);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [transferCode, setTransferCode] = useState<string>('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasCompletedDailyBatch, setHasCompletedDailyBatch] = useState(false);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);

  // 🔑 REDIRECT TO AUTH IF NOT LOGGED IN
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const supabase = createClient();
        
        const response = await supabase
          .from('profiles')
          .select('wallet_balance, base_balance, is_broker, accuracy, total_batches, rank, daily_earning_rate')
          .eq('id', user.id)
          .single();
        
        if (response.error) throw response.error;
        
        const profile = response.data; // ✅ FIX: Extract data
        
        if (profile) {
          const balance = profile.wallet_balance || 0;
          const calculatedDailyRate = calculateDailyRate(balance);
          
          setUserStats({
            credits: balance,
            staked: 0,
            accuracy: profile.accuracy || 95.0,
            totalBatches: profile.total_batches || 0,
            rank: profile.rank || calculateRank(balance)
          });
          setBaseBalance(profile.base_balance || 0);
          setIsBroker(profile.is_broker || false); // 🔑 Set broker flag
          setDailyBaseRate(profile.daily_earning_rate || calculatedDailyRate);

          const today = new Date().toISOString().split('T')[0];
          const batchesResponse = await supabase
            .from('batch_completions')
            .select('id')
            .eq('user_id', user.id)
            .gte('completed_at', `${today}T00:00:00`)
            .limit(1);

          if (!batchesResponse.error && batchesResponse.data && batchesResponse.data.length > 0) {
            setHasCompletedDailyBatch(true);
          }
        }
      } catch (err) {
        console.warn('Could not fetch profile:', err);
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
    if (isBroker) return userStats.credits;
    return Math.max(0, userStats.credits - baseBalance);
  };

  const fetchNewBatch = async () => {
    if (!user?.id) return;

    if (userStats.credits <= 0) {
      showNotification("You need TLC balance to access tasks. Go to Wallet to redeem coins.", "error");
      return;
    }
    
    if (hasCompletedDailyBatch) {
      showNotification("Daily task already completed!", "error");
      return;
    }

    setIsFetchingBatch(true);

    try {
      const supabase = createClient();
      
      const imagesResponse = await supabase
        .from('verification_images')
        .select('id, image_url')
        .eq('is_active', true)
        .order('used_count', { ascending: true }) 
        .limit(5);

      if (imagesResponse.error) throw imagesResponse.error;

      const images = imagesResponse.data; // ✅ FIX: Extract data

      if (!images || images.length === 0) {
        showNotification("No tasks available. Upload images first!", "error");
        setIsFetchingBatch(false);
        return;
      }

      const batch: Batch = {
        id: `B-${Date.now()}`,
        imageCount: images.length,
        stakeRequired: 0,
        maxReward: dailyBaseRate, 
        difficulty: 'Standard',
        images: images.map((img: any) => img.image_url), // ✅ FIX: Add type
        imageIds: images.map((img: any) => img.id) // ✅ FIX: Add type
      };

      setActiveBatch(batch);
      setCurrentImageIndex(0);
      setBatchGuesses([]);
      setView('WORK');
    } catch (err: any) {
      console.error("Failed to load batch:", err);
      showNotification(err.message || "Failed to load batch", "error");
    } finally {
      setIsFetchingBatch(false);
    }
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
    setProcessingTimeLeft(30);

    setTimeout(async () => {
      const randomAccuracy = Math.floor(Math.random() * 21) + 80;
      const correctCount = Math.floor((randomAccuracy / 100) * activeBatch!.imageCount);
      const finalReward = dailyBaseRate;

      setBatchResult({ 
        correctCount, 
        totalCount: activeBatch!.imageCount, 
        reward: finalReward, 
        accuracy: randomAccuracy
      });

      const newCredits = userStats.credits + finalReward;
      
      setUserStats(prev => ({
        ...prev,
        credits: newCredits,
        accuracy: ((prev.accuracy * prev.totalBatches) + randomAccuracy) / (prev.totalBatches + 1),
        totalBatches: prev.totalBatches + 1,
        rank: calculateRank(newCredits)
      }));

      const supabase = createClient();
      try {
        await supabase.from('batch_completions').insert({
          user_id: user!.id,
          batch_id: activeBatch!.id,
          accuracy: randomAccuracy,
          reward_earned: finalReward,
          completed_at: new Date().toISOString()
        });

        if (activeBatch?.imageIds) {
          await Promise.all(
            activeBatch.imageIds.map(id => 
              supabase.rpc('increment_image_usage', { img_id: id })
            )
          );
        }
      } catch (dbErr) {
        console.error("Failed to save completion:", dbErr);
      }

      setHasCompletedDailyBatch(true);
      setView('RESULTS');
    }, 30000);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'PROCESSING' && processingTimeLeft > 0) {
      timer = setInterval(() => setProcessingTimeLeft(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [view, processingTimeLeft]);

  const generateTransferCode = (amount: number): string | null => {
    const transferable = getTransferableBalance();
    if (!amount || amount <= 0) {
      showNotification("Please enter a valid amount", "error");
      return null;
    }
    if (amount > transferable) {
      showNotification(`You can only transfer earned coins. Available: ${transferable} TLC`, "error");
      return null;
    }
    if (!isBroker && amount < 10) {
      showNotification("Minimum transfer is 10 TLC", "error");
      return null;
    }
    const code = 'TLC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setTransferCode(code);
    showNotification("Code generated.", "success");
    return code;
  };

  const redeemCode = (e: React.FormEvent, amount: number) => {
    e.preventDefault();
    const newCredits = userStats.credits + amount;
    const newDailyRate = calculateDailyRate(newCredits);
    
    setUserStats(prev => ({
      ...prev,
      credits: newCredits,
      rank: calculateRank(newCredits)
    }));
    setBaseBalance(prev => prev + amount);
    setDailyBaseRate(newDailyRate);
    setTransferCode('');
    showNotification(`${amount} TLC Received. Daily Rate: ${newDailyRate} TLC/day`, "success");
  };

  // 🔑 SHOW LOADING WHILE CHECKING AUTH
  if (authLoading || !loaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm sm:text-base">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // 🔑 REDIRECT HAPPENS IN useEffect, but show nothing while redirecting
  if (!user) {
    return null;
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
        currentView={view} 
        onViewChange={(v) => {
          if (v === 'WALLET') router.push('/wallet');
          else setView(v as ViewState);
        }} 
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {view === 'DASHBOARD' && (
              <DashboardView 
                userStats={userStats} 
                onStartBatch={fetchNewBatch}
                currency="TLC"
                dailyRate={dailyBaseRate}
                hasCompletedToday={hasCompletedDailyBatch}
                isLoading={isFetchingBatch}
              />
            )}
            {view === 'WORK' && activeBatch && (
              <WorkView 
                activeBatch={activeBatch} 
                currentImageIndex={currentImageIndex} 
                onGuess={submitImageGuess}
                currency="TLC"
                potentialReward={dailyBaseRate}
              />
            )}
            {view === 'PROCESSING' && <ProcessingView timeLeft={processingTimeLeft} currency="TLC" />}
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
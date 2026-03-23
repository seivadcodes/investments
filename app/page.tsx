'use client';

import { useState, useEffect } from 'react';
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
  // --- AUTH INTEGRATION ---
  const { user, loading: authLoading, signOut } = useAuth();
  
  // --- STATE ---
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [userStats, setUserStats] = useState<UserState>({
    credits: 500,
    staked: 0,
    accuracy: 95.0,
    totalBatches: 0,
    rank: 'Contributor'
  });
  
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [batchGuesses, setBatchGuesses] = useState<('AI' | 'REAL')[]>([]);
  const [processingTimeLeft, setProcessingTimeLeft] = useState(60);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [transferCode, setTransferCode] = useState<string>('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  // Fetch user profile data from Supabase on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('credits, staked, accuracy, total_batches, rank')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (profile) {
          setUserStats({
            credits: profile.credits || 500,
            staked: profile.staked || 0,
            accuracy: profile.accuracy || 95.0,
            totalBatches: profile.total_batches || 0,
            rank: profile.rank || 'Contributor'
          });
        }
      } catch (err) {
        console.warn('Could not fetch profile, using defaults:', err);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // --- ACTIONS ---

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const acceptBatch = (batch: Batch) => {
    if (userStats.credits < batch.stakeRequired) {
      showNotification("Insufficient credits for this batch.", "error");
      return;
    }
    setUserStats(prev => ({ 
      ...prev, 
      credits: prev.credits - batch.stakeRequired, 
      staked: prev.staked + batch.stakeRequired 
    }));
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
    setProcessingTimeLeft(60); // 60 seconds for testing

    setTimeout(() => {
      const correctCount = Math.floor(Math.random() * 6);
      const accuracy = (correctCount / activeBatch!.imageCount) * 100;
      
      let reward = 0;
      if (accuracy >= 80) {
        reward = Math.floor(activeBatch!.maxReward * (accuracy / 100));
      }

      setBatchResult({ correctCount, totalCount: activeBatch!.imageCount, reward, accuracy });

      setUserStats(prev => {
        const newCredits = prev.credits + reward;
        const newStaked = prev.staked - activeBatch!.stakeRequired;
        let newRank = prev.rank;
        if (prev.totalBatches > 50) newRank = 'Master';
        else if (prev.totalBatches > 20) newRank = 'Expert';
        else if (prev.totalBatches > 5) newRank = 'Contributor';

        return {
          ...prev,
          credits: newCredits,
          staked: newStaked,
          accuracy: ((prev.accuracy * prev.totalBatches) + accuracy) / (prev.totalBatches + 1),
          totalBatches: prev.totalBatches + 1,
          rank: newRank
        };
      });

      setView('RESULTS');
    }, 60000);
  };

  // Processing Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'PROCESSING' && processingTimeLeft > 0) {
      timer = setInterval(() => {
        setProcessingTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, processingTimeLeft]);

  const generateTransferCode = () => {
    const code = 'TL-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    setTransferCode(code);
    showNotification("Code generated. Valid for 24h.", "success");
  };

  const redeemCode = (e: React.FormEvent) => {
    e.preventDefault();
    setUserStats(prev => ({ ...prev, credits: prev.credits + 100 }));
    setTransferCode('');
    showNotification("Credits Received.", "success");
  };

  // Loading state while auth is being checked
  if (authLoading) {
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
      {/* Notification Toast */}
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

      {/* Header */}
      <Header 
        user={user} 
        onSignOut={signOut} 
        currentView={view} 
        onViewChange={setView} 
      />

      {/* Main Content */}
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
              />
            )}
            {view === 'WORK' && (
              <WorkView 
                activeBatch={activeBatch} 
                currentImageIndex={currentImageIndex} 
                onGuess={submitImageGuess} 
              />
            )}
            {view === 'PROCESSING' && (
              <ProcessingView timeLeft={processingTimeLeft} />
            )}
            {view === 'RESULTS' && (
              <ResultsView 
                batchResult={batchResult} 
                activeBatch={activeBatch} 
                onReturn={() => setView('DASHBOARD')} 
              />
            )}
            {view === 'WALLET' && (
              <WalletView 
                transferCode={transferCode} 
                onGenerateCode={generateTransferCode} 
                onRedeemCode={redeemCode} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
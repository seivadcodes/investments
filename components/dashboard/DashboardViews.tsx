'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Activity, ShieldCheck, Layers, Lock, Clock, 
  ChevronRight, CheckCircle, AlertCircle, Copy, TrendingUp, Gift, Medal, DollarSign, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
export type ViewState = 'DASHBOARD' | 'WORK' | 'PROCESSING' | 'RESULTS' | 'WALLET';
export type Rank = 'Silver' | 'Gold' | 'Platinum';

export interface Batch {
  id: string;
  imageCount: number;
  stakeRequired: number;
  maxReward: number;
  difficulty: 'Standard' | 'Premium';
  images: string[];
}

export interface UserState {
  credits: number;
  staked: number;
  accuracy: number;
  totalBatches: number;
  rank: Rank;
}

export interface BatchResult {
  correctCount: number;
  totalCount: number;
  reward: number;
  accuracy: number;
}

// --- MOCK DATA ---
export const AVAILABLE_BATCHES: Batch[] = [
  { 
    id: 'B-2024-001', 
    imageCount: 5, 
    stakeRequired: 0,
    maxReward: 60,
    difficulty: 'Standard',
    images: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    ]
  },
  { 
    id: 'B-2024-002', 
    imageCount: 5, 
    stakeRequired: 0,
    maxReward: 60,
    difficulty: 'Premium',
    images: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    ]
  },
];

// --- STAT CARD COMPONENT ---
export const StatCard = ({ icon: Icon, label, value, color, currency, isCurrency = false }: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: string;
  currency?: string;
  isCurrency?: boolean;
}) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-slate-500 text-sm font-medium">{label}</span>
    </div>
    <p className="text-2xl font-bold text-slate-900">
      {typeof value === 'number' ? value.toLocaleString() : value}
      {isCurrency && currency && ` ${currency}`}
    </p>
  </div>
);

// --- DASHBOARD VIEW ---
export const DashboardView = ({ 
  userStats, 
  onAcceptBatch,
  currency = 'TLC',
  dailyRate = 0
}: { 
  userStats: UserState; 
  onAcceptBatch: (batch: Batch) => void;
  currency?: string;
  dailyRate?: number;
}) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard 
        icon={Wallet} 
        label="Balance" 
        value={userStats.credits} 
        color="bg-blue-500"
        currency={currency}
        isCurrency={true}
      />
      <StatCard 
        icon={DollarSign} 
        label="Daily Earning Rate" 
        value={dailyRate} 
        color="bg-green-500"
        currency={currency}
        isCurrency={true}
      />
      <StatCard 
        icon={Medal} 
        label="Rank" 
        value={userStats.rank} 
        color={
          userStats.rank === 'Platinum' ? 'bg-gray-300' :
          userStats.rank === 'Gold' ? 'bg-yellow-400' :
          'bg-gray-400'
        }
        isCurrency={false}
      />
      <StatCard 
        icon={Activity} 
        label="Accuracy" 
        value={`${userStats.accuracy.toFixed(1)}%`} 
        color="bg-purple-500"
        isCurrency={false}
      />
    </div>

    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Available Verification Batches</h2>
          <p className="text-sm text-slate-500 mt-1">
            Earn {dailyRate} {currency}/day. Complete batches to earn. Accuracy affects your rewards.
          </p>
        </div>
        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Live Queue</span>
      </div>
      <div className="divide-y divide-slate-100">
        {AVAILABLE_BATCHES.map(batch => (
          <div key={batch.id} className="p-6 hover:bg-slate-50 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Layers className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{batch.id}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-medium",
                      batch.difficulty === 'Premium' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                    )}>{batch.difficulty}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{batch.imageCount} images per batch</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Est. Reward</p>
                  <p className="text-lg font-bold text-green-600">~{Math.floor(batch.maxReward * 0.9)} {currency}</p>
                </div>
                <button 
                  onClick={() => onAcceptBatch(batch)}
                  className="px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg"
                >
                  Start Verifying
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- WORK VIEW ---
export const WorkView = ({ 
  activeBatch, 
  currentImageIndex, 
  onGuess,
  currency = 'TLC',
  baseReward = 50
}: { 
  activeBatch: Batch | null; 
  currentImageIndex: number; 
  onGuess: (guess: 'AI' | 'REAL') => void;
  currency?: string;
  baseReward?: number;
}) => {
  if (!activeBatch) return null;
  const progress = ((currentImageIndex) / activeBatch.imageCount) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>Batch {activeBatch.id}</span>
          <span>Image {currentImageIndex + 1} of {activeBatch.imageCount}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Secure Verification Environment</span>
          </div>
          <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">
            Earn {currency} based on accuracy
          </span>
        </div>
        
        <div className="p-8">
          <div className="aspect-video bg-slate-100 rounded-lg mb-8 overflow-hidden relative">
            <img 
              src={activeBatch.images[currentImageIndex]} 
              alt="Verify" 
              className="w-full h-full object-contain" 
            />
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded font-mono">
              IMG-{currentImageIndex + 1} • {activeBatch.id}
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Is this image AI-generated or human-created?</h3>
            <p className="text-sm text-slate-500 mt-2">
              Your accuracy determines your earnings. Aim for 80%+ accuracy for maximum rewards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onGuess('REAL')}
              className="py-5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-2"
            >
              <ShieldCheck className="w-8 h-8" />
              <span>Human Created</span>
            </button>
            <button 
              onClick={() => onGuess('AI')}
              className="py-5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all flex flex-col items-center gap-2"
            >
              <ShieldAlert className="w-8 h-8" />
              <span>AI Generated</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PROCESSING VIEW ---
export const ProcessingView = ({ timeLeft, currency = 'TLC' }: { timeLeft: number; currency?: string }) => (
  <div className="max-w-2xl mx-auto">
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-12 text-center">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full mx-auto mb-6"
      />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifying Your Submission</h2>
      <p className="text-slate-500 mb-8">
        Your batch is being cross-referenced with other contributors for consensus.
      </p>
      
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <div className="flex items-center justify-center gap-2 text-slate-600 mb-2">
          <Clock className="w-5 h-5" />
          <span className="font-medium">Estimated Time Remaining</span>
        </div>
        <p className="text-4xl font-mono font-bold text-slate-900">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </p>
        <p className="text-xs text-slate-400 mt-4">
          Do not close this window. Results will be displayed automatically.
        </p>
      </div>
    </div>
  </div>
);

// --- RESULTS VIEW ---
export const ResultsView = ({ 
  batchResult, 
  activeBatch, 
  onReturn,
  currency = 'TLC'
}: { 
  batchResult: BatchResult | null; 
  activeBatch: Batch | null; 
  onReturn: () => void;
  currency?: string;
}) => {
  if (!batchResult || !activeBatch) return null;
  const accuracyColor = batchResult.accuracy >= 80 
    ? 'text-green-600' 
    : batchResult.accuracy >= 60 
      ? 'text-yellow-600' 
      : 'text-red-600';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className={cn(
          "p-8 text-center",
          batchResult.accuracy >= 80 ? "bg-green-50" : "bg-slate-50"
        )}>
          {batchResult.accuracy >= 80 ? (
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          ) : (
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {batchResult.accuracy >= 80 ? 'Batch Verified Successfully' : 'Verification Complete'}
          </h2>
          <p className="text-slate-500">{activeBatch.id}</p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
              <p className="text-sm text-slate-500 mb-1">Accuracy</p>
              <p className={cn("text-3xl font-bold", accuracyColor)}>{batchResult.accuracy.toFixed(0)}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
              <p className="text-sm text-slate-500 mb-1">Correct Images</p>
              <p className="text-3xl font-bold text-slate-800">{batchResult.correctCount}/{batchResult.totalCount}</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 text-white mb-8">
            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="font-bold">Total Earned</span>
              <span className="font-mono text-xl font-bold text-green-400">+{batchResult.reward} {currency}</span>
            </div>
          </div>

          <button 
            onClick={onReturn}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// --- WALLET VIEW ---
export const WalletView = ({ 
  transferCode, 
  onGenerateCode, 
  onRedeemCode,
  totalBalance = 0,
  baseBalance = 0,
  transferableBalance = 0,
  currency = 'TLC',
  dailyRate = 0
}: { 
  transferCode: string; 
  onGenerateCode: (amount: number) => string | null; 
  onRedeemCode: (e: React.FormEvent, amount: number) => void;
  totalBalance?: number;
  baseBalance?: number;
  transferableBalance?: number;
  currency?: string;
  dailyRate?: number;
}) => {
  const [transferAmount, setTransferAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('100');

  const handleGenerate = () => {
    const amount = parseInt(transferAmount);
    if (amount && onGenerateCode(amount)) {
      setTransferAmount('');
    }
  };

  const handleRedeem = (e: React.FormEvent) => {
    const amount = parseInt(redeemAmount) || 100;
    onRedeemCode(e, amount);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Balance Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500">Total Balance</p>
            <p className="text-xl font-bold text-slate-800">{totalBalance.toLocaleString()} {currency}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
            <p className="text-xs text-blue-600">Transferable</p>
            <p className="text-xl font-bold text-blue-700">{transferableBalance.toLocaleString()} {currency}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-xs text-slate-500">Locked (Base)</p>
            <p className="text-xl font-bold text-slate-400">{baseBalance.toLocaleString()} {currency}</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <DollarSign className="w-5 h-5" />
            <span className="font-bold">Daily Earning Rate: {dailyRate.toLocaleString()} {currency}/day</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Based on your initial redemption. Complete ~10 batches/day to reach this target.
          </p>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          💡 You can only transfer {currency} you've earned. Base balance is locked until you earn more.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Transfer {currency} (P2P)</h2>
        <p className="text-sm text-slate-500 mb-6">
          Gift {currency} to other verified contributors. 
          <span className="block mt-1 text-xs text-slate-400">A 5% network fee applies to all transfers.</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Generate Gift Code</h3>
            <p className="text-xs text-slate-500 mb-4">Create a code to gift {currency} to another user.</p>
            
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Amount to Gift (Max: {transferableBalance} {currency})
              </label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount"
                min="10"
                max={transferableBalance}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <button 
              onClick={handleGenerate}
              disabled={!transferAmount || parseInt(transferAmount) <= 0 || parseInt(transferAmount) > transferableBalance}
              className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Code
            </button>
            
            {transferCode && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-700 font-medium mb-1">Your Gift Code:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono font-bold text-green-800">{transferCode}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(transferCode)}
                    className="p-1 hover:bg-green-100 rounded"
                  >
                    <Copy className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Redeem Gift Code</h3>
            <p className="text-xs text-slate-500 mb-4">Enter a code received from another contributor.</p>
            
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Expected Amount (for verification)
              </label>
              <input
                type="number"
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder="100"
                min="10"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            
            <form onSubmit={handleRedeem} className="flex gap-2">
              <input 
                type="text" 
                placeholder="TLC-XXXXXXXX" 
                className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm font-mono uppercase"
              />
              <button className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-500">
                Redeem
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MISSING ICON COMPONENT ---
export function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
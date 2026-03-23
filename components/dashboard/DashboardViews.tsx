'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Activity, ShieldCheck, Layers, Lock, Clock, 
  ChevronRight, CheckCircle, AlertCircle, Copy, DollarSign, Medal, Image as ImageIcon, Loader2
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
  imageIds?: string[];
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

// --- STAT CARD ---
export const StatCard = ({ icon: Icon, label, value, color, currency, isCurrency = false }: any) => (
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
export const DashboardView = ({ userStats, onStartBatch, currency = 'TLC', dailyRate = 0, hasCompletedToday = false, isLoading = false }: any) => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard icon={Wallet} label="Balance" value={userStats.credits} color="bg-blue-500" currency={currency} isCurrency={true} />
      <StatCard icon={DollarSign} label="Daily Rate" value={dailyRate} color="bg-green-500" currency={currency} isCurrency={true} />
      <StatCard icon={Medal} label="Rank" value={userStats.rank} color={userStats.rank === 'Platinum' ? 'bg-gray-300' : userStats.rank === 'Gold' ? 'bg-yellow-400' : 'bg-gray-400'} />
      <StatCard icon={Activity} label="Accuracy" value={`${userStats.accuracy.toFixed(1)}%`} color="bg-purple-500" />
    </div>

    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Daily Verification Task</h2>
          <p className="text-sm text-slate-500 mt-1">
            Complete <strong>one batch</strong> today to earn up to <strong>{dailyRate} {currency}</strong>.
          </p>
        </div>
        {hasCompletedToday && <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">Completed Today ✅</span>}
      </div>
      
      <div className="p-8 text-center">
        {hasCompletedToday ? (
          <div className="py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">Daily Task Completed!</h3>
            <p className="text-slate-500 mt-2">You've earned your daily rewards. Come back tomorrow for more.</p>
          </div>
        ) : (
          <div className="py-8">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ready to Verify?</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              You will receive a batch of 5 random images. Your accuracy determines your payout.
              <br/><span className="text-xs text-slate-400">Ensure you have a stable connection.</span>
            </p>
            <button 
              onClick={onStartBatch}
              disabled={isLoading}
              className="px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 mx-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading Tasks...
                </>
              ) : (
                'Complete Today\'s Task'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);

// --- WORK VIEW ---
export const WorkView = ({ activeBatch, currentImageIndex, onGuess, currency = 'TLC', potentialReward = 0 }: any) => {
  if (!activeBatch) return null;
  const progress = ((currentImageIndex) / activeBatch.imageCount) * 100;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>Daily Batch</span>
          <span>Image {currentImageIndex + 1} of {activeBatch.imageCount}</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div className="h-full bg-blue-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Secure Verification</span>
          </div>
          <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">
            Potential: {potentialReward} {currency}
          </span>
        </div>
        
        <div className="p-8">
          <div className="aspect-video bg-slate-100 rounded-lg mb-8 overflow-hidden relative">
            <img src={activeBatch.images[currentImageIndex]} alt="Verify" className="w-full h-full object-contain" />
            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded font-mono">
              IMG-{currentImageIndex + 1}
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">AI or Human?</h3>
            <p className="text-sm text-slate-500 mt-2">High accuracy ensures maximum payout.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onGuess('REAL')} className="py-5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center gap-2">
              <ShieldCheck className="w-8 h-8" /><span>Human Created</span>
            </button>
            <button onClick={() => onGuess('AI')} className="py-5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all flex flex-col items-center gap-2">
              <ShieldAlert className="w-8 h-8" /><span>AI Generated</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- PROCESSING VIEW ---
export const ProcessingView = ({ timeLeft, currency = 'TLC' }: any) => (
  <div className="max-w-2xl mx-auto">
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-12 text-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full mx-auto mb-6" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Calculating Rewards</h2>
      <p className="text-slate-500 mb-8">Cross-referencing your results with consensus...</p>
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-4xl font-mono font-bold text-slate-900">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</p>
      </div>
    </div>
  </div>
);

// --- RESULTS VIEW ---
export const ResultsView = ({ batchResult, onReturn, currency = 'TLC' }: any) => {
  if (!batchResult) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-8 text-center bg-green-50">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Daily Task Complete!</h2>
          <p className="text-slate-500">Great job verifying images.</p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
              <p className="text-sm text-slate-500 mb-1">Accuracy</p>
              <p className="text-3xl font-bold text-green-600">{batchResult.accuracy}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
              <p className="text-sm text-slate-500 mb-1">Correct</p>
              <p className="text-3xl font-bold text-slate-800">{batchResult.correctCount}/{batchResult.totalCount}</p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 text-white mb-8">
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total Earnings</span>
              <span className="font-mono text-2xl font-bold text-green-400">+{batchResult.reward} {currency}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Rewards added to your balance instantly.</p>
          </div>

          <button onClick={onReturn} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

// --- WALLET VIEW ---
export const WalletView = ({ transferCode, onGenerateCode, onRedeemCode, totalBalance = 0, baseBalance = 0, transferableBalance = 0, currency = 'TLC', dailyRate = 0 }: any) => {
  const [transferAmount, setTransferAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('100');

  const handleGenerate = () => {
    const amount = parseInt(transferAmount);
    if (amount && onGenerateCode(amount)) setTransferAmount('');
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
          <div className="p-4 bg-slate-50 rounded-lg text-center"><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold text-slate-800">{totalBalance.toLocaleString()} {currency}</p></div>
          <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200"><p className="text-xs text-blue-600">Transferable</p><p className="text-xl font-bold text-blue-700">{transferableBalance.toLocaleString()} {currency}</p></div>
          <div className="p-4 bg-slate-50 rounded-lg text-center"><p className="text-xs text-slate-500">Locked</p><p className="text-xl font-bold text-slate-400">{baseBalance.toLocaleString()} {currency}</p></div>
        </div>
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700"><DollarSign className="w-5 h-5" /><span className="font-bold">Daily Rate: {dailyRate.toLocaleString()} {currency}/day</span></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Transfer {currency}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Generate Code</h3>
            <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Amount" min="10" max={transferableBalance} className="w-full px-3 py-2 border border-slate-300 rounded text-sm mb-2" />
            <button onClick={handleGenerate} disabled={!transferAmount} className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800 disabled:opacity-50">Generate</button>
            {transferCode && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded flex justify-between items-center">
                <code className="text-sm font-mono font-bold text-green-800">{transferCode}</code>
                <Copy className="w-4 h-4 text-green-600 cursor-pointer" onClick={() => navigator.clipboard.writeText(transferCode)} />
              </div>
            )}
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2">Redeem Code</h3>
            <form onSubmit={handleRedeem} className="flex gap-2">
              <input type="text" placeholder="TLC-XXXX" className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm font-mono uppercase" />
              <button className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-500">Redeem</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export function ShieldAlert({ className }: any) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
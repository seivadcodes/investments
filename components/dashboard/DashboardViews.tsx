'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Activity, ShieldCheck, Layers, Lock, Clock, 
  ChevronRight, CheckCircle, AlertCircle, Copy 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPES ---
export type ViewState = 'DASHBOARD' | 'WORK' | 'PROCESSING' | 'RESULTS' | 'WALLET';

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
  rank: 'Trainee' | 'Contributor' | 'Expert' | 'Master';
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
    stakeRequired: 100, 
    maxReward: 160, 
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
    stakeRequired: 250, 
    maxReward: 420, 
    difficulty: 'Premium',
    images: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    ]
  },
  { 
    id: 'B-2024-003', 
    imageCount: 5, 
    stakeRequired: 100, 
    maxReward: 160, 
    difficulty: 'Standard',
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    ]
  },
];

// --- STAT CARD COMPONENT ---
export const StatCard = ({ icon: Icon, label, value, color }: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: string;
}) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-2">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-slate-500 text-sm font-medium">{label}</span>
    </div>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

// --- DASHBOARD VIEW ---
export const DashboardView = ({ 
  userStats, 
  onAcceptBatch 
}: { 
  userStats: UserState; 
  onAcceptBatch: (batch: Batch) => void;
}) => (
  <div className="space-y-8">
    {/* Stats Row */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard 
        icon={Wallet} 
        label="Available Credits" 
        value={userStats.credits.toLocaleString()} 
        color="bg-blue-500"
      />
      <StatCard 
        icon={Activity} 
        label="Accuracy Score" 
        value={`${userStats.accuracy.toFixed(1)}%`} 
        color="bg-purple-500"
      />
      <StatCard 
        icon={ShieldCheck} 
        label="Rank" 
        value={userStats.rank} 
        color="bg-green-500"
      />
      <StatCard 
        icon={Layers} 
        label="Batches Done" 
        value={userStats.totalBatches} 
        color="bg-orange-500"
      />
    </div>

    {/* Batch Queue */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Available Verification Batches</h2>
          <p className="text-sm text-slate-500 mt-1">Stake credits to unlock. Rewards paid after consensus verification.</p>
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
                  <p className="text-sm text-slate-500 mt-1">{batch.imageCount} images • Stake: {batch.stakeRequired} CR</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Max Reward</p>
                  <p className="text-lg font-bold text-green-600">+{batch.maxReward} CR</p>
                </div>
                <button 
                  onClick={() => onAcceptBatch(batch)}
                  disabled={userStats.credits < batch.stakeRequired}
                  className={cn(
                    "px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all",
                    userStats.credits < batch.stakeRequired 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                      : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg"
                  )}
                >
                  Accept Batch
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
  onGuess 
}: { 
  activeBatch: Batch | null; 
  currentImageIndex: number; 
  onGuess: (guess: 'AI' | 'REAL') => void;
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
          <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">STAKED: {activeBatch.stakeRequired} CR</span>
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
            <p className="text-sm text-slate-500 mt-2">Your accuracy affects your rank and future batch availability.</p>
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
export const ProcessingView = ({ timeLeft }: { timeLeft: number }) => (
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
  onReturn 
}: { 
  batchResult: BatchResult | null; 
  activeBatch: Batch | null; 
  onReturn: () => void;
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
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Stake Returned</span>
              <span className="font-mono">+{activeBatch.stakeRequired} CR</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Performance Reward</span>
              <span className="font-mono text-green-400">+{batchResult.reward} CR</span>
            </div>
            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="font-bold">Net Change</span>
              <span className="font-mono text-xl font-bold text-green-400">+{batchResult.reward} CR</span>
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
  onRedeemCode 
}: { 
  transferCode: string; 
  onGenerateCode: () => void; 
  onRedeemCode: (e: React.FormEvent) => void;
}) => (
  <div className="max-w-2xl mx-auto space-y-6">
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Credit Transfer (P2P)</h2>
      <p className="text-sm text-slate-500 mb-6">
        Transfer credits to other verified contributors. Useful for team collaborations or resource sharing. 
        <span className="block mt-1 text-xs text-slate-400">A 5% network fee applies to all transfers.</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-2">Generate Deposit Code</h3>
          <p className="text-xs text-slate-500 mb-4">Create a code to gift credits to another user.</p>
          <button 
            onClick={onGenerateCode}
            className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded hover:bg-slate-800"
          >
            Generate Code
          </button>
          {transferCode && (
            <div className="mt-4 p-3 bg-white border border-slate-200 rounded flex justify-between items-center">
              <code className="text-sm font-mono text-slate-800">{transferCode}</code>
              <Copy className="w-4 h-4 text-slate-400 cursor-pointer" />
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-2">Redeem Code</h3>
          <p className="text-xs text-slate-500 mb-4">Enter a code received from another contributor.</p>
          <form onSubmit={onRedeemCode} className="flex gap-2">
            <input 
              type="text" 
              placeholder="TL-XXXXXXXX" 
              className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm"
            />
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700">
              Redeem
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
);

// --- MISSING ICON COMPONENT ---
export function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Cpu, HardDrive, Activity, DollarSign, Clock,
  CheckCircle, Loader2, Settings, TrendingUp, Users,
  ShieldCheck, Zap, Download, Play, Pause, RefreshCw,
  ChevronRight, AlertCircle, Info, Layers, Network,
  Terminal, Power, Wifi, Calculator, Coins, ArrowLeft,
  Copy, Gift, UserPlus, Award, Link2, Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const DAILY_RETURN_RATE = 0.05; // 5% daily return
const TLC_TO_KES = 100; // 1 TLC = 100 KES
const REFERRAL_BONUS_RATE = 0.10; // 10% of referred users' earnings

// Earning caps per investment bracket
const EARNING_BRACKETS = [
  { min: 1, max: 100, cap: 5, label: 'Starter' },
  { min: 101, max: 1000, cap: 50, label: 'Pro' },
  { min: 1001, max: Infinity, cap: 300, label: 'Enterprise' }
];

// ============================================
// TYPES
// ============================================
type ServerStatus = 'OFFLINE' | 'INSTALLING' | 'CONFIGURING' | 'SYNCING' | 'ONLINE' | 'PROCESSING';
type ProviderLevel = 'MAIN' | 'SUB' | 'HOST';

interface ServerInstance {
  id: string;
  investment: number;
  dailyEarnings: number;
  specs: { cpu: number; ram: number; storage: number };
  status: ServerStatus;
  installProgress: number;
  installStep: string;
  totalEarned: number;
  purchasedAt: string;
  providerId: string;
  providerName: string;
  providerLevel: ProviderLevel;
}

interface NodeProvider {
  id: string;
  name: string;
  level: ProviderLevel;
  serversRented: number;
  rating: number;
  contactMpesa?: string;
}

interface ReferredUser {
  id: string;
  name: string;
  joinedAt: string;
  totalInvested: number;
  totalEarned: number;
  referralEarnings: number;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalReferralEarnings: number;
  pendingReferralEarnings: number;
}

// ============================================
// MOCK DATA
// ============================================
const MOCK_PROVIDERS: NodeProvider[] = [
  { id: 'main-1', name: 'Njoroge (Main Host)', level: 'MAIN', serversRented: 847, rating: 5.0, contactMpesa: '0712***456' },
  { id: 'sub-1', name: 'Kamau Enterprises', level: 'SUB', serversRented: 234, rating: 4.8, contactMpesa: '0722***789' },
  { id: 'sub-2', name: 'Sarah Tech Solutions', level: 'SUB', serversRented: 156, rating: 4.9, contactMpesa: '0733***123' }
];

const MOCK_REFERRED_USERS: ReferredUser[] = [
  { id: 'ref-1', name: 'John K.', joinedAt: '2025-01-10', totalInvested: 500, totalEarned: 125, referralEarnings: 12.5, status: 'ACTIVE' },
  { id: 'ref-2', name: 'Mary W.', joinedAt: '2025-01-08', totalInvested: 1000, totalEarned: 300, referralEarnings: 30, status: 'ACTIVE' },
  { id: 'ref-3', name: 'Peter M.', joinedAt: '2025-01-05', totalInvested: 200, totalEarned: 40, referralEarnings: 4, status: 'INACTIVE' },
];

const INSTALLATION_STEPS = [
  'Allocating server resources...',
  'Installing verification software...',
  'Configuring CPU allocation...',
  'Setting up RAM limits...',
  'Initializing storage volumes...',
  'Deploying verification workers...',
  'Syncing with platform network...',
  'Running diagnostics...',
  'Finalizing configuration...',
  'Server ready!'
];

// ============================================
// HELPER FUNCTIONS
// ============================================
const calculateDailyEarnings = (investment: number): number => {
  const bracket = EARNING_BRACKETS.find(b => investment >= b.min && investment <= b.max) || EARNING_BRACKETS[2];
  const rawEarnings = investment * DAILY_RETURN_RATE;
  return Math.min(Math.floor(rawEarnings * 10) / 10, bracket.cap);
};

const calculateServerSpecs = (investment: number) => {
  return {
    cpu: Math.min(8, Math.max(1, Math.floor(investment / 100) + 1)),
    ram: Math.min(16, Math.max(2, Math.floor(investment / 50) + 2)),
    storage: Math.min(250, Math.max(20, Math.floor(investment / 10) + 20))
  };
};

const getBracketLabel = (investment: number): string => {
  return EARNING_BRACKETS.find(b => investment >= b.min && investment <= b.max)?.label || 'Enterprise';
};

const generateReferralCode = (): string => {
  return 'REF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

// ============================================
// NOTIFICATION COMPONENT
// ============================================
const Notification = ({ msg, type, onClose }: { msg: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => (
  <motion.div
    initial={{ y: -50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: -50, opacity: 0 }}
    className={cn(
      "fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2 max-w-sm",
      type === 'success' ? "bg-green-600 text-white" :
      type === 'error' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
    )}
  >
    {type === 'success' ? <CheckCircle className="w-5 h-5" /> :
     type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
    <span>{msg}</span>
  </motion.div>
);

// ============================================
// INVESTMENT CALCULATOR CARD
// ============================================
const InvestmentCalculator = ({ onRent, isRenting }: { onRent: (amount: number) => void; isRenting: boolean }) => {
  const [investment, setInvestment] = useState<string>('');
  const amount = parseInt(investment) || 0;
  const dailyEarnings = calculateDailyEarnings(amount);
  const specs = calculateServerSpecs(amount);
  const bracket = getBracketLabel(amount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Custom Server Investment</h3>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Enter any amount to rent server capacity. Earnings scale with your investment.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Investment Amount (TLC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={investment}
              onChange={(e) => setInvestment(e.target.value)}
              placeholder="e.g., 50"
              min="1"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">TLC</span>
          </div>
          {amount > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              ≈ KES {(amount * TLC_TO_KES).toLocaleString()}
            </p>
          )}
        </div>

        {/* Live Preview */}
        {amount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Bracket</span>
              <span className="font-bold text-blue-600">{bracket}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Daily Earnings</span>
              <span className="font-bold text-green-600">
                {dailyEarnings.toFixed(1)} TLC <span className="text-xs text-slate-400">({(dailyEarnings * TLC_TO_KES).toFixed(0)} KES)</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Return Rate</span>
              <span className="font-bold text-slate-700">{(DAILY_RETURN_RATE * 100).toFixed(0)}%/day</span>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-500 mb-2">Allocated Server Specs:</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <Cpu className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                  <p className="text-sm font-bold text-slate-700">{specs.cpu} vCPU</p>
                </div>
                <div>
                  <Activity className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                  <p className="text-sm font-bold text-slate-700">{specs.ram} GB RAM</p>
                </div>
                <div>
                  <HardDrive className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                  <p className="text-sm font-bold text-slate-700">{specs.storage} GB</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Earning Brackets Info */}
        <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 font-bold mb-2">Earning Brackets:</p>
          <div className="space-y-1 text-xs text-blue-600">
            <p>• Starter (1-100 TLC): Up to 5 TLC/day</p>
            <p>• Pro (101-1,000 TLC): Up to 50 TLC/day</p>
            <p>• Enterprise (1,001+ TLC): Up to 300 TLC/day</p>
          </div>
        </div>

        <button
          onClick={() => amount > 0 && onRent(amount)}
          disabled={isRenting || amount <= 0}
          className={cn(
            "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white",
            isRenting || amount <= 0 ? "bg-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"
          )}
        >
          {isRenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Server className="w-5 h-5" />}
          {isRenting ? 'Renting...' : amount > 0 ? `Rent Server for ${amount} TLC` : 'Enter Amount to Start'}
        </button>
      </div>
    </motion.div>
  );
};

// ============================================
// ACTIVE SERVER INSTANCE COMPONENT
// ============================================
const ActiveServer = ({ server, onWithdraw, showInstallPreview = false }: { 
  server: ServerInstance; 
  onWithdraw: (id: string) => void;
  showInstallPreview?: boolean;
}) => {
  const [cpuUsage, setCpuUsage] = useState(0);
  const [ramUsage, setRamUsage] = useState(0);

  useEffect(() => {
    if (server.status !== 'ONLINE' && server.status !== 'PROCESSING') return;
    const interval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 40) + 30);
      setRamUsage(Math.floor(Math.random() * 30) + 40);
    }, 2000);
    return () => clearInterval(interval);
  }, [server.status]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            server.status === 'ONLINE' || server.status === 'PROCESSING' ? "bg-green-100" : "bg-blue-100"
          )}>
            <Server className={cn("w-5 h-5",
              server.status === 'ONLINE' || server.status === 'PROCESSING' ? "text-green-600" : "text-blue-600"
            )} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">{getBracketLabel(server.investment)} Node</h4>
            <p className="text-xs text-slate-500">Provider: {server.providerName}</p>
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-bold",
          server.status === 'ONLINE' || server.status === 'PROCESSING' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        )}>
          {server.status}
        </div>
      </div>

      {/* Installation Progress */}
      {(server.status === 'INSTALLING' || server.status === 'CONFIGURING' || server.status === 'SYNCING') && (
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-700">Setting up your server...</span>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>{server.installStep}</span>
              <span>{server.installProgress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${server.installProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {INSTALLATION_STEPS.map((_, idx) => {
              const stepProgress = (idx + 1) * 10;
              const isComplete = server.installProgress >= stepProgress;
              return (
                <div key={idx} className={cn("h-1.5 flex-1 rounded-full", isComplete ? "bg-green-500" : "bg-slate-200")} />
              );
            })}
          </div>
          <div className="mt-3 p-3 bg-slate-900 rounded-lg font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-400 mb-1">
              <Terminal className="w-3 h-3" />
              <span>console output</span>
            </div>
            <p className="text-green-400"><span className="text-slate-500">$</span> {server.installStep}</p>
            {server.installProgress > 30 && <p className="text-blue-400 text-[10px] mt-1">✓ Resources allocated</p>}
            {server.installProgress > 60 && <p className="text-purple-400 text-[10px]">✓ Workers deployed</p>}
            {server.installProgress > 90 && <p className="text-amber-400 text-[10px]">⚡ Finalizing...</p>}
          </div>
        </div>
      )}

      {/* Live Metrics */}
      {(server.status === 'ONLINE' || server.status === 'PROCESSING') && (
        <div className="p-4 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2"><Cpu className="w-4 h-4 text-blue-600" /></div>
              <p className="text-2xl font-bold text-slate-800">{cpuUsage}%</p>
              <p className="text-xs text-slate-500">CPU Usage</p>
              <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div className="h-full bg-blue-600" animate={{ width: `${cpuUsage}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2"><Activity className="w-4 h-4 text-purple-600" /></div>
              <p className="text-2xl font-bold text-slate-800">{ramUsage}%</p>
              <p className="text-xs text-slate-500">RAM Usage</p>
              <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div className="h-full bg-purple-600" animate={{ width: `${ramUsage}%` }} transition={{ duration: 0.5 }} />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex items-center gap-2 text-xs"><Wifi className="w-3 h-3 text-green-600" /><span className="text-slate-600">Connected</span></div>
            <div className="flex items-center gap-2 text-xs"><Power className="w-3 h-3 text-green-600" /><span className="text-slate-600">Active</span></div>
            <div className="flex items-center gap-2 text-xs"><ShieldCheck className="w-3 h-3 text-green-600" /><span className="text-slate-600">Secure</span></div>
          </div>
        </div>
      )}

      {/* Earnings */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm text-slate-600">Total Earned</span>
          </div>
          <span className="text-xl font-bold text-green-600">{server.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 1 })} TLC</span>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
          <span>Daily: {server.dailyEarnings.toFixed(1)} TLC ≈ {(server.dailyEarnings * TLC_TO_KES).toFixed(0)} KES</span>
          <span>Since: {new Date(server.purchasedAt).toLocaleDateString()}</span>
        </div>
        {!showInstallPreview && (
          <button onClick={() => onWithdraw(server.id)} className="w-full py-2 border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm">
            Withdraw Earnings
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ============================================
// REFERRAL CARD COMPONENT
// ============================================
const ReferralCard = ({ referralCode, onCopy, stats }: { 
  referralCode: string; 
  onCopy: () => void;
  stats: ReferralStats;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
  >
    <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-bold text-slate-800">Referral Program</h3>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Earn <span className="font-bold text-green-600">{REFERRAL_BONUS_RATE * 100}%</span> of your referrals' daily earnings!
      </p>

      {/* Referral Code */}
      <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
        <p className="text-sm text-green-700 font-medium mb-2">Your Referral Code:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xl font-mono font-bold text-green-800">{referralCode}</code>
          <button
            onClick={onCopy}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
          >
            <Copy className="w-5 h-5 text-green-600" />
          </button>
        </div>
        <p className="text-xs text-green-600 mt-2">
          Share this code with friends. They get bonus TLC on signup, you earn from their investments!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-800">{stats.totalReferrals}</p>
          <p className="text-xs text-slate-500">Total Referrals</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <Activity className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-slate-800">{stats.activeReferrals}</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-xs">Referral Earnings</p>
            <p className="text-2xl font-bold">{stats.totalReferralEarnings.toFixed(1)} TLC</p>
          </div>
          <Award className="w-8 h-8 text-green-200" />
        </div>
        {stats.pendingReferralEarnings > 0 && (
          <p className="text-xs text-green-100 mt-2">
            +{stats.pendingReferralEarnings.toFixed(1)} TLC pending
          </p>
        )}
      </div>

      {/* How It Works */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700 font-bold mb-2">How Referrals Work:</p>
        <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
          <li>Share your referral code</li>
          <li>Friend signs up & invests in servers</li>
          <li>You earn {REFERRAL_BONUS_RATE * 100}% of their daily earnings</li>
          <li>Earnings accumulate automatically</li>
          <li>Withdraw anytime with your server earnings</li>
        </ol>
      </div>
    </div>
  </motion.div>
);

// ============================================
// REFERRED USERS LIST COMPONENT
// ============================================
const ReferredUsersList = ({ users }: { users: ReferredUser[] }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-blue-600" />
        Your Referrals
      </h3>
      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
        {users.length} Users
      </span>
    </div>

    {users.length === 0 ? (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No referrals yet. Share your code!</p>
      </div>
    ) : (
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white",
                  user.status === 'ACTIVE' ? "bg-green-600" : "bg-slate-400"
                )}>
                  {user.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                  <p className="text-xs text-slate-500">Joined: {new Date(user.joinedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">+{user.referralEarnings.toFixed(1)} TLC</p>
                <p className="text-xs text-slate-400">Your earnings</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className={cn(
                "px-2 py-1 rounded font-bold",
                user.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
              )}>
                {user.status}
              </span>
              <span className="text-slate-500">
                Invested: {user.totalInvested} TLC
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ============================================
// PROVIDER HIERARCHY COMPONENT
// ============================================
const ProviderHierarchy = ({ providers }: { providers: NodeProvider[] }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
      <Network className="w-5 h-5 text-blue-600" />
      Node Provider Network
    </h3>
    <div className="space-y-4">
      {providers.map((provider, idx) => (
        <div key={provider.id} className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-bold text-white",
            provider.level === 'MAIN' ? "bg-slate-900" : "bg-blue-600")}>
            {provider.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800">{provider.name}</p>
            <p className="text-xs text-slate-500">{provider.level === 'MAIN' ? 'Platform Infrastructure' : 'Sub-Provider'} • Mpesa: {provider.contactMpesa}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-700">{provider.serversRented} Servers</p>
            <p className="text-xs text-yellow-500">★ {provider.rating}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function InvestorSimulationPage() {
  const [activeTab, setActiveTab] = useState<'RENT' | 'SERVERS' | 'REFERRALS' | 'NETWORK'>('RENT');
  const [servers, setServers] = useState<ServerInstance[]>([]);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isRenting, setIsRenting] = useState(false);
  const [totalBalance, setTotalBalance] = useState(10000);
  const [totalDailyEarnings, setTotalDailyEarnings] = useState(0);
  const [installingServers, setInstallingServers] = useState<ServerInstance[]>([]);
  
  // 🔥 REFERRAL SYSTEM STATE
  const [referralCode, setReferralCode] = useState<string>('');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>(MOCK_REFERRED_USERS);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 3,
    activeReferrals: 2,
    totalReferralEarnings: 46.5,
    pendingReferralEarnings: 2.5
  });
  const [referralEarnings, setReferralEarnings] = useState(0);

  // Generate referral code on mount
  useEffect(() => {
    setReferralCode(generateReferralCode());
  }, []);

  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRentServer = async (investment: number) => {
    setIsRenting(true);
    const randomProvider = MOCK_PROVIDERS[Math.floor(Math.random() * MOCK_PROVIDERS.length)];
    const dailyEarnings = calculateDailyEarnings(investment);
    const specs = calculateServerSpecs(investment);

    const newServer: ServerInstance = {
      id: `srv-${Date.now()}`,
      investment,
      dailyEarnings,
      specs,
      status: 'INSTALLING',
      installProgress: 0,
      installStep: INSTALLATION_STEPS[0],
      totalEarned: 0,
      purchasedAt: new Date().toISOString(),
      providerId: randomProvider.id,
      providerName: randomProvider.name,
      providerLevel: randomProvider.level
    };

    setInstallingServers(prev => [...prev, newServer]);
    setTotalDailyEarnings(prev => prev + dailyEarnings);
    showNotification(`Renting server with ${investment} TLC investment...`, "info");

    let progress = 0;
    let stepIndex = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 12) + 8;
      stepIndex = Math.floor(progress / 10);
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setInstallingServers(prev => prev.map(s => 
          s.id === newServer.id ? { ...s, installProgress: 100, installStep: INSTALLATION_STEPS[9] } : s
        ));

        setTimeout(() => {
          setInstallingServers(prev => prev.map(s => 
            s.id === newServer.id ? { ...s, status: 'CONFIGURING', installStep: INSTALLATION_STEPS[4] } : s
          ));
          
          setTimeout(() => {
            setInstallingServers(prev => prev.map(s => 
              s.id === newServer.id ? { ...s, status: 'SYNCING', installStep: INSTALLATION_STEPS[7] } : s
            ));
            
            setTimeout(() => {
              setInstallingServers(prev => prev.filter(s => s.id !== newServer.id));
              setServers(prev => [...prev, { 
                ...newServer, 
                status: 'ONLINE', 
                installProgress: 100, 
                installStep: INSTALLATION_STEPS[9] 
              }]);
              showNotification(`Server online! Earning ${dailyEarnings.toFixed(1)} TLC/day`, "success");
            }, 2000);
          }, 2000);
        }, 2000);
      } else {
        setInstallingServers(prev => prev.map(s => 
          s.id === newServer.id ? { 
            ...s, 
            installProgress: progress,
            installStep: INSTALLATION_STEPS[Math.min(stepIndex, INSTALLATION_STEPS.length - 1)]
          } : s
        ));
      }
    }, 600);

    setIsRenting(false);
  };

  const handleWithdraw = (serverId: string) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;
    const totalWithdraw = server.totalEarned + referralEarnings;
    setTotalBalance(prev => prev + Math.floor(totalWithdraw * 10) / 10);
    setServers(prev => prev.map(s => 
      s.id === serverId ? { ...s, totalEarned: 0 } : s
    ));
    setReferralEarnings(0);
    showNotification(`Withdrew ${totalWithdraw.toFixed(1)} TLC!`, "success");
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    showNotification("Referral code copied!", "success");
  };

  // Simulate earnings accumulation with proper rounding
  useEffect(() => {
    const interval = setInterval(() => {
      setServers(prev => prev.map(s => {
        if (s.status === 'ONLINE' || s.status === 'PROCESSING') {
          const increment = s.dailyEarnings / 60;
          return { 
            ...s, 
            totalEarned: Math.floor((s.totalEarned + increment) * 100) / 100
          };
        }
        return s;
      }));
      
      // Simulate referral earnings (10% of server earnings)
      setReferralEarnings(prev => Math.floor((prev + (totalDailyEarnings * REFERRAL_BONUS_RATE) / 60) * 100) / 100);
    }, 60000);

    return () => clearInterval(interval);
  }, [totalDailyEarnings]);

  const totalEarnings = servers.reduce((sum, s) => sum + s.totalEarned, 0) + referralEarnings;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <AnimatePresence>
        {notification && (
          <Notification msg={notification.msg} type={notification.type} onClose={() => setNotification(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-6 h-6 text-blue-400" />
                <span className="text-blue-300 text-xs font-bold uppercase tracking-wider">Investor Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Flexible Server Rental</h1>
              <p className="text-slate-400 text-sm mt-1">Invest any amount → Earn proportional TLC daily + Referral bonuses</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Total Balance</p>
              <p className="text-2xl font-bold text-green-400">{totalBalance.toLocaleString()} TLC</p>
              <p className="text-xs text-blue-400 mt-1">+{totalDailyEarnings.toFixed(1)} TLC/day</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'RENT', label: 'Rent Server', icon: Server },
            { id: 'SERVERS', label: 'My Servers', icon: Layers },
            { id: 'REFERRALS', label: 'Referrals', icon: Gift },
            { id: 'NETWORK', label: 'Provider Network', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                activeTab === tab.id ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* RENT TAB */}
        {activeTab === 'RENT' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <Coins className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-green-800 mb-2">How It Works</h4>
                  <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
                    <li>Enter any investment amount in TLC</li>
                    <li>Platform auto-assigns a Node Provider</li>
                    <li>Server is provisioned with verification software (watch below!)</li>
                    <li>Earn {DAILY_RETURN_RATE * 100}% daily on your investment (capped by bracket)</li>
                    <li>Share your referral code to earn {REFERRAL_BONUS_RATE * 100}% of friends' earnings!</li>
                    <li>1 TLC = {TLC_TO_KES} KES for real-world reference</li>
                  </ol>
                </div>
              </div>
            </div>

            <InvestmentCalculator onRent={handleRentServer} isRenting={isRenting} />

            {/* LIVE INSTALLATION PREVIEW */}
            {installingServers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  Setting Up Your Server{installingServers.length > 1 ? 's' : ''}...
                </h3>
                {installingServers.map(server => (
                  <ActiveServer key={server.id} server={server} onWithdraw={() => {}} showInstallPreview={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SERVERS TAB */}
        {activeTab === 'SERVERS' && (
          <div className="space-y-6">
            {servers.length === 0 && installingServers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <Server className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No Active Servers</h3>
                <p className="text-slate-500 mt-2">Invest any amount to rent your first server</p>
                <button onClick={() => setActiveTab('RENT')} className="mt-4 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                  Rent a Server
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {servers.map(server => (
                  <ActiveServer key={server.id} server={server} onWithdraw={handleWithdraw} />
                ))}
              </div>
            )}
            
            {/* Referral Earnings Summary */}
            {referralEarnings > 0 && (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Referral Bonus Earnings</p>
                    <p className="text-3xl font-bold">{referralEarnings.toFixed(1)} TLC</p>
                  </div>
                  <Gift className="w-12 h-12 text-green-200" />
                </div>
                <p className="text-xs text-green-100 mt-2">
                  Earned from {referralStats.activeReferrals} active referrals ({REFERRAL_BONUS_RATE * 100}% of their earnings)
                </p>
              </div>
            )}

            {servers.length > 0 && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">Total Daily Earnings</p>
                    <p className="text-3xl font-bold">{totalDailyEarnings.toFixed(1)} TLC/day ≈ {(totalDailyEarnings * TLC_TO_KES).toFixed(0)} KES</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-200 text-sm">Active Servers</p>
                    <p className="text-3xl font-bold">{servers.filter(s => s.status === 'ONLINE').length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REFERRALS TAB */}
        {activeTab === 'REFERRALS' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ReferralCard 
                referralCode={referralCode} 
                onCopy={copyReferralCode}
                stats={referralStats}
              />
              
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Share Your Code
                </h3>
                <p className="text-sm text-purple-100 mb-4">
                  Share your referral code on social media, with friends, or in groups. The more people invest, the more you earn!
                </p>
                <div className="space-y-3">
                  <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share on WhatsApp
                  </button>
                  <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Copy Referral Link
                  </button>
                  <button className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download QR Code
                  </button>
                </div>
                <div className="mt-6 p-4 bg-white/10 rounded-xl">
                  <p className="text-xs text-purple-200 text-center">
                    🎉 Bonus: Get 50 TLC when your first referral invests 100+ TLC!
                  </p>
                </div>
              </div>
            </div>

            <ReferredUsersList users={referredUsers} />

            {/* Earnings Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Earnings Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Server Earnings</p>
                  <p className="text-2xl font-bold text-blue-700">{servers.reduce((sum, s) => sum + s.totalEarned, 0).toFixed(1)} TLC</p>
                  <p className="text-xs text-blue-500 mt-1">From your investments</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Referral Earnings</p>
                  <p className="text-2xl font-bold text-green-700">{referralEarnings.toFixed(1)} TLC</p>
                  <p className="text-xs text-green-500 mt-1">{REFERRAL_BONUS_RATE * 100}% of referrals' earnings</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-sm text-purple-600 mb-1">Total Available</p>
                  <p className="text-2xl font-bold text-purple-700">{totalEarnings.toFixed(1)} TLC</p>
                  <p className="text-xs text-purple-500 mt-1">Ready to withdraw</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NETWORK TAB */}
        {activeTab === 'NETWORK' && (
          <div className="space-y-6">
            <ProviderHierarchy providers={MOCK_PROVIDERS} />
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3">Money Flow (Real World)</h4>
              <div className="flex flex-wrap items-center justify-center gap-4 text-center">
                <div><div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">You</div><p className="text-xs">Investor</p></div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <div><div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">MP</div><p className="text-xs">Mpesa Payment</p></div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <div><div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold">NH</div><p className="text-xs">Main Host</p></div>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center">
                <strong>Note:</strong> All real-money transactions happen off-platform via Mpesa with your assigned Node Provider. The platform only tracks TLC earnings.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm"><Server className="w-4 h-4 inline mr-2" />Server Investment Simulation Demo</p>
          <p className="text-xs mt-2">1 TLC = {TLC_TO_KES} KES • {DAILY_RETURN_RATE * 100}% daily return • {REFERRAL_BONUS_RATE * 100}% referral bonus</p>
        </div>
      </footer>
    </div>
  );
}
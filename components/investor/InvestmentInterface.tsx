// InvestmentInterface.tsx
'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Server, Cpu, Activity, HardDrive, DollarSign,
  Loader2, CheckCircle, Terminal, Power, Wifi, ShieldCheck,
  Layers, Calculator, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================
export interface ServerInstance {
  id: string;
  investment: number;
  daily_earnings: number;
  status: 'INSTALLING' | 'ONLINE' | 'OFFLINE';
  total_earned: number;
  created_at: string;
  specs?: { cpu: number; ram: number; storage: number };
  installProgress?: number;
  installStep?: string;
}

export interface InvestmentInterfaceProps {
  balance: number;
  onRent: (amount: number) => void;
  servers: ServerInstance[];
  installingServers: ServerInstance[];
  onWithdraw: (id: string) => void;
  isRenting: boolean;
}

// ============================================
// INTERNAL: InvestmentCalculator
// ============================================
const InvestmentCalculator = ({ balance, onRent, isRenting }: { 
  balance: number; 
  onRent: (amount: number) => void; 
  isRenting: boolean; 
}) => {
  const [amount, setAmount] = useState('');
  const investment = parseInt(amount) || 0;
  const dailyEarnings = Math.floor(investment * 0.05 * 10) / 10;
  const isValid = investment > 0 && investment <= balance;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-600" />
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-base sm:text-lg font-bold text-slate-800">Rent Server Capacity</h3>
        </div>
        
        <div className="mb-4 sm:mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Investment Amount (TLC)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 100"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">TLC</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Available: {balance.toLocaleString()} TLC</p>
          {!isValid && investment > balance && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Insufficient balance. <button onClick={() => window.location.href='/wallet'} className="underline">Get more TLC</button>
            </p>
          )}
        </div>

        {investment > 0 && isValid && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Daily Return (5%)</span><span className="font-bold text-green-600">{dailyEarnings} TLC</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Estimated Specs</span><span className="font-bold text-slate-700">{Math.floor(investment/100)+1} vCPU, {Math.floor(investment/50)+2} GB RAM</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-600">Est. KES Value</span><span className="font-bold text-slate-700">{(investment * 100).toLocaleString()} KES</span></div>
          </div>
        )}

        <button
          onClick={() => isValid && onRent(investment)}
          disabled={!isValid || isRenting}
          className={cn(
            "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-white text-sm sm:text-base",
            isValid ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90" : "bg-slate-400 cursor-not-allowed"
          )}
        >
          {isRenting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Server className="w-5 h-5" />}
          {isRenting ? 'Provisioning...' : isValid ? `Rent Server for ${investment} TLC` : 'Enter Amount to Start'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// INTERNAL: ServerCard
// ============================================
const ServerCard = ({ server, onWithdraw, isInstalling = false }: { 
  server: ServerInstance; 
  onWithdraw: (id: string) => void; 
  isInstalling?: boolean; 
}) => {
  const [progress, setProgress] = useState(server.installProgress || 0);
  
  useEffect(() => {
    if (isInstalling) {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 100));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInstalling]);

  const INSTALLATION_STEPS = [
    'Allocating resources...', 'Installing software...', 'Configuring CPU...',
    'Setting RAM limits...', 'Initializing storage...', 'Deploying workers...',
    'Syncing network...', 'Running diagnostics...', 'Finalizing...', 'Ready!'
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", isInstalling ? "bg-blue-100" : "bg-green-100")}>
            <Server className={cn("w-5 h-5", isInstalling ? "text-blue-600" : "text-green-600")} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-800 text-sm sm:text-base truncate">{isInstalling ? 'Provisioning...' : `${server.investment} TLC Node`}</h4>
            <p className="text-[10px] sm:text-xs text-slate-500">{isInstalling ? 'Setting up environment' : 'Online & Earning'}</p>
          </div>
        </div>
        <span className={cn("px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0", isInstalling ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
          {isInstalling ? 'INSTALLING' : 'ONLINE'}
        </span>
      </div>

      {isInstalling ? (
        <div className="p-4 sm:p-6">
          <div className="mb-2 flex justify-between text-[10px] sm:text-xs text-slate-500"><span>Installing Verification Workers...</span><span>{Math.floor(progress)}%</span></div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 p-3 bg-slate-900 rounded-lg font-mono text-[10px] sm:text-xs text-green-400 overflow-x-auto no-scrollbar-mobile">
            <p>$ allocating_resources...</p>
            {progress > 30 && <p>$ installing_dependencies...</p>}
            {progress > 70 && <p>$ syncing_network...</p>}
            {progress > 90 && <p>$ ready.</p>}
          </div>
        </div>
      ) : (
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded-lg"><Cpu className="w-4 h-4 mx-auto text-blue-600 mb-1"/><p className="text-[10px] sm:text-xs font-bold">{server.specs?.cpu || 1} vCPU</p></div>
            <div className="p-2 bg-slate-50 rounded-lg"><Activity className="w-4 h-4 mx-auto text-purple-600 mb-1"/><p className="text-[10px] sm:text-xs font-bold">{server.specs?.ram || 2} GB</p></div>
            <div className="p-2 bg-slate-50 rounded-lg"><HardDrive className="w-4 h-4 mx-auto text-amber-600 mb-1"/><p className="text-[10px] sm:text-xs font-bold">{server.specs?.storage || 20} GB</p></div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <p className="text-[10px] sm:text-xs text-slate-500">Total Earned</p>
              <p className="text-base sm:text-lg font-bold text-green-600">{server.total_earned.toFixed(1)} TLC</p>
            </div>
            <button 
              onClick={() => onWithdraw(server.id)} 
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 text-white text-[10px] sm:text-sm font-bold rounded-lg hover:bg-slate-800 whitespace-nowrap"
            >
              Withdraw
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN EXPORTED COMPONENT
// ============================================
export function InvestmentInterface({ 
  balance, 
  onRent, 
  servers, 
  installingServers, 
  onWithdraw, 
  isRenting 
}: InvestmentInterfaceProps) {
  const [tab, setTab] = useState<'RENT' | 'SERVERS'>('RENT');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sub-tabs for Rent/Servers - Scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar-mobile pb-2">
        <button 
          onClick={() => setTab('RENT')} 
          className={cn(
            "px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap",
            tab === 'RENT' ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          Rent Server
        </button>
        <button 
          onClick={() => setTab('SERVERS')} 
          className={cn(
            "px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap",
            tab === 'SERVERS' ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          My Servers ({servers.length})
        </button>
      </div>

      {tab === 'RENT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            <InvestmentCalculator balance={balance} onRent={onRent} isRenting={isRenting} />
          </div>
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            <h3 className="font-bold text-slate-700 text-base sm:text-lg">Active Provisioning</h3>
            {installingServers.length === 0 ? (
              <div className="p-6 sm:p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-sm">
                No servers currently installing
              </div>
            ) : (
              installingServers.map(s => (
                <ServerCard key={s.id} server={s} onWithdraw={() => {}} isInstalling={true} />
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'SERVERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {servers.length === 0 ? (
            <div className="col-span-full p-8 sm:p-12 bg-white rounded-2xl border border-slate-200 text-center">
              <Server className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-bold text-slate-800">No Active Servers</h3>
              <p className="text-slate-500 mb-4 text-sm">Rent a server to start earning daily returns</p>
              <button 
                onClick={() => setTab('RENT')} 
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 text-sm"
              >
                Rent Now
              </button>
            </div>
          ) : (
            servers.map(s => (
              <ServerCard key={s.id} server={s} onWithdraw={onWithdraw} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default InvestmentInterface;
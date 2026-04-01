// NetworkInterface.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'; // ✅ Fixed: Added AnimatePresence to import
import {
  Users, Gift, Share2, Copy, CheckCircle,
  Network, ShieldCheck, Star, MapPin, TrendingUp, Award,
  Phone, DollarSign, Link2, Download, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================
interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
}

interface NetworkInterfaceProps {
  referralCode: string;
  referralStats: ReferralStats;
  providers: any[];
  onCopyCode: () => void;
  onProviderClick: (id: string) => void;
}

// ============================================
// INTERNAL: ReferralPanel - Fully Separated Section
// ============================================
const ReferralPanel = ({ code, stats, onCopy }: { code: string, stats: ReferralStats, onCopy: () => void }) => (
  <div className="space-y-4 sm:space-y-6">
    {/* Referral Header Card */}
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 sm:p-6 text-white">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2"><Gift className="w-5 h-5 sm:w-6 sm:h-6" /><h3 className="text-lg sm:text-xl font-bold">Referral Program</h3></div>
        <Award className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
      </div>
      <p className="text-green-100 mb-4 sm:mb-6 text-sm">Earn 10% of your referrals' daily server earnings automatically.</p>
      
      <div className="bg-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-sm">
        <p className="text-[10px] sm:text-xs text-green-100 mb-2">Your Referral Code</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-base sm:text-xl font-mono font-bold break-all">{code}</code>
          <button onClick={onCopy} className="p-2 hover:bg-white/20 rounded-lg flex-shrink-0"><Copy className="w-4 h-4 sm:w-5 sm:h-5" /></button>
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 text-center">
        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-1 sm:mb-2" />
        <p className="text-lg sm:text-2xl font-bold">{stats.totalReferrals}</p>
        <p className="text-[10px] sm:text-xs text-slate-500">Total</p>
      </div>
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 text-center">
        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mx-auto mb-1 sm:mb-2" />
        <p className="text-lg sm:text-2xl font-bold">{stats.activeReferrals}</p>
        <p className="text-[10px] sm:text-xs text-slate-500">Active</p>
      </div>
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 text-center">
        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mx-auto mb-1 sm:mb-2" />
        <p className="text-lg sm:text-2xl font-bold">{stats.totalEarnings.toFixed(1)}</p>
        <p className="text-[10px] sm:text-xs text-slate-500">Earned TLC</p>
      </div>
    </div>

    {/* Share Section */}
    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
      <h4 className="font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 text-base"><Share2 className="w-4 h-4 sm:w-5 sm:h-5" />Share Your Code</h4>
      <div className="space-y-2 sm:space-y-3">
        <button className="w-full p-2.5 sm:p-3 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 flex items-center justify-center gap-2 text-sm">
          <Share2 className="w-4 h-4" /> Share on WhatsApp
        </button>
        <button className="w-full p-2.5 sm:p-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 text-sm">
          <Link2 className="w-4 h-4" /> Copy Referral Link
        </button>
        <button className="w-full p-2.5 sm:p-3 bg-purple-50 text-purple-700 font-bold rounded-xl hover:bg-purple-100 flex items-center justify-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Download QR Code
        </button>
      </div>
    </div>
  </div>
);

// ============================================
// INTERNAL: ProviderList - Fully Separated Section with Navigation
// ============================================
const ProviderList = ({ providers, onProviderClick }: { providers: any[], onProviderClick: (id: string) => void }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-4 sm:p-6 border-b border-slate-100">
      <div className="flex items-center gap-2"><Network className="w-5 h-5 text-blue-600" /><h3 className="text-base sm:text-lg font-bold text-slate-800">Node Provider Network</h3></div>
      <p className="text-sm text-slate-500 mt-1">Verified infrastructure partners hosting your servers</p>
    </div>
    <div className="divide-y divide-slate-100">
      {providers.length === 0 ? (
        <div className="p-6 sm:p-8 text-center text-slate-500 text-sm">Loading providers...</div>
      ) : (
        providers.map((provider) => (
          <div key={provider.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {provider.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm sm:text-base truncate">{provider.name}</p>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                  <span className={cn("px-2 py-0.5 rounded-full whitespace-nowrap", provider.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>{provider.status}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {provider.rating || '5.0'}</span>
                  {provider.mpesa_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {provider.mpesa_number}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700">{provider.total_trades || 0} Nodes</p>
                <p className="text-[10px] sm:text-xs text-slate-400">Infrastructure</p>
              </div>
              {/* Navigation Button to Provider Page */}
              <button
                onClick={() => onProviderClick(provider.id)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 text-white text-[10px] sm:text-sm font-bold rounded-lg hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
              >
                View Profile <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
    <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500">
      <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
      All providers are verified. Real-money transactions happen off-platform via Mpesa.
    </div>
  </div>
);

// ============================================
// MAIN EXPORTED COMPONENT - Separated Tabs with Clear Visual Distinction
// ============================================
export function NetworkInterface({ referralCode, referralStats, providers, onCopyCode, onProviderClick }: NetworkInterfaceProps) {
  const [tab, setTab] = useState<'REFERRALS' | 'PROVIDERS'>('REFERRALS');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Navigation - Scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar-mobile pb-2">
        <button 
          onClick={() => setTab('REFERRALS')} 
          className={cn(
            "px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap",
            tab === 'REFERRALS' ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          <Users className="w-4 h-4 inline mr-1" /> Referrals
        </button>
        <button 
          onClick={() => setTab('PROVIDERS')} 
          className={cn(
            "px-4 py-2 rounded-lg font-bold text-sm transition-colors whitespace-nowrap",
            tab === 'PROVIDERS' ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          <Network className="w-4 h-4 inline mr-1" /> Providers
        </button>
      </div>

      {/* Tab Content - Full Width Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {tab === 'REFERRALS' && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 border border-green-100">
              <ReferralPanel code={referralCode} stats={referralStats} onCopy={onCopyCode} />
            </div>
          )}
          {tab === 'PROVIDERS' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-100">
              <ProviderList providers={providers} onProviderClick={onProviderClick} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default NetworkInterface;
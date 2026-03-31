'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Gift, Share2, Copy, CheckCircle,
  Network, ShieldCheck, Star, MapPin, TrendingUp, Award,
  Phone, DollarSign, Link2, Download, Loader2
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
  isLoading?: boolean; // ← NEW: Loading state for non-blocking fetches
}

// ============================================
// INTERNAL: ReferralPanel
// ============================================
const ReferralPanel = ({ code, stats, onCopy }: { code: string, stats: ReferralStats, onCopy: () => void }) => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Gift className="w-6 h-6" /><h3 className="text-xl font-bold">Referral Program</h3></div>
        <Award className="w-8 h-8 text-green-200" />
      </div>
      <p className="text-green-100 mb-6">Earn 10% of your referrals' daily server earnings automatically.</p>
      
      <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs text-green-100 mb-2">Your Referral Code</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xl font-mono font-bold">{code}</code>
          <button onClick={onCopy} className="p-2 hover:bg-white/20 rounded-lg"><Copy className="w-5 h-5" /></button>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
        <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
        <p className="text-2xl font-bold">{stats.totalReferrals}</p>
        <p className="text-xs text-slate-500">Total</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
        <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
        <p className="text-2xl font-bold">{stats.activeReferrals}</p>
        <p className="text-xs text-slate-500">Active</p>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
        <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
        <p className="text-2xl font-bold">{stats.totalEarnings.toFixed(1)}</p>
        <p className="text-xs text-slate-500">Earned TLC</p>
      </div>
    </div>

    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Share2 className="w-5 h-5" />Share Links</h4>
      <div className="space-y-3">
        <button className="w-full p-3 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 flex items-center justify-center gap-2">
          <Share2 className="w-4 h-4" /> Share on WhatsApp
        </button>
        <button className="w-full p-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2">
          <Link2 className="w-4 h-4" /> Copy Referral Link
        </button>
        <button className="w-full p-3 bg-purple-50 text-purple-700 font-bold rounded-xl hover:bg-purple-100 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> Download QR Code
        </button>
      </div>
    </div>
  </div>
);

// ============================================
// INTERNAL: ReferralSkeleton
// ============================================
const ReferralSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/20 rounded" />
          <div className="h-5 w-40 bg-white/20 rounded" />
        </div>
        <div className="w-8 h-8 bg-white/20 rounded" />
      </div>
      <div className="h-4 w-full bg-white/20 rounded mb-2" />
      <div className="h-4 w-2/3 bg-white/20 rounded mb-6" />
      <div className="bg-white/10 rounded-xl p-4">
        <div className="h-3 w-32 bg-white/20 rounded mb-2" />
        <div className="flex items-center gap-2">
          <div className="flex-1 h-8 bg-white/20 rounded" />
          <div className="w-10 h-10 bg-white/20 rounded" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 text-center">
          <div className="w-6 h-6 bg-slate-200 rounded mx-auto mb-2" />
          <div className="h-6 w-12 bg-slate-200 rounded mx-auto mb-1" />
          <div className="h-3 w-10 bg-slate-200 rounded mx-auto" />
        </div>
      ))}
    </div>
    <div className="bg-white p-6 rounded-2xl border border-slate-200">
      <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// INTERNAL: ProviderList
// ============================================
const ProviderList = ({ providers, isLoading }: { providers: any[], isLoading?: boolean }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-6 border-b border-slate-100">
      <div className="flex items-center gap-2"><Network className="w-5 h-5 text-blue-600" /><h3 className="text-lg font-bold text-slate-800">Node Provider Network</h3></div>
      <p className="text-sm text-slate-500 mt-1">Verified infrastructure partners hosting your servers</p>
    </div>
    
    {isLoading ? (
      <div className="divide-y divide-slate-100 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-full" />
              <div>
                <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-slate-200 rounded" />
                  <div className="h-4 w-12 bg-slate-200 rounded" />
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="h-4 w-16 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-20 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    ) : providers.length === 0 ? (
      <div className="p-8 text-center text-slate-500">No providers available</div>
    ) : (
      <div className="divide-y divide-slate-100">
        {providers.map((provider) => (
          <div key={provider.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold">
                {provider.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{provider.name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={cn("px-2 py-0.5 rounded-full", provider.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>{provider.status}</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {provider.rating || '5.0'}</span>
                  {provider.mpesa_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {provider.mpesa_number}</span>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">{provider.total_trades || 0} Nodes</p>
              <p className="text-xs text-slate-400">Infrastructure</p>
            </div>
          </div>
        ))}
      </div>
    )}
    
    <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
      <ShieldCheck className="w-4 h-4 inline mr-1" />
      All providers are verified. Real-money transactions happen off-platform via Mpesa.
    </div>
  </div>
);

// ============================================
// MAIN EXPORTED COMPONENT
// ============================================
export function NetworkInterface({ 
  referralCode, 
  referralStats, 
  providers, 
  onCopyCode,
  isLoading = false // ← NEW: Default to false
}: NetworkInterfaceProps) {
  const [tab, setTab] = useState<'REFERRALS' | 'PROVIDERS'>('REFERRALS');

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setTab('REFERRALS')} className={cn("px-4 py-2 rounded-lg font-bold text-sm", tab === 'REFERRALS' ? "bg-slate-900 text-white" : "bg-white border")}>Referrals</button>
        <button onClick={() => setTab('PROVIDERS')} className={cn("px-4 py-2 rounded-lg font-bold text-sm", tab === 'PROVIDERS' ? "bg-slate-900 text-white" : "bg-white border")}>Providers</button>
      </div>

      {tab === 'REFERRALS' && (
        isLoading ? <ReferralSkeleton /> : <ReferralPanel code={referralCode} stats={referralStats} onCopy={onCopyCode} />
      )}
      {tab === 'PROVIDERS' && <ProviderList providers={providers} isLoading={isLoading} />}
    </div>
  );
}

export default NetworkInterface;
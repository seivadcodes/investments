// NetworkInterface.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Gift, Share2, Copy, CheckCircle,
  Network, ShieldCheck, Star, MapPin, TrendingUp, Award,
  Phone, DollarSign, Link2, Download, ArrowRight, Loader2,
  Wallet, Clock, Server
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

interface ReferralDetail {
  referee_id: string;
  referee_email?: string;
  status: string;
  joined_at: string;
  total_earned: number;
  servers_count: number;
}

interface NetworkInterfaceProps {
  referralCode: string;
  referralStats: ReferralStats;
  referralDetails?: ReferralDetail[]; // 👈 NEW: Detailed referral list
  providers: any[];
  onCopyCode: () => void;
  onProviderClick: (id: string) => void;
  onClaimEarnings?: () => void; // 👈 NEW: Claim handler
}

// Helper: Generate referral link
const getReferralLink = (code: string) => {
  if (typeof window === 'undefined') return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}/auth?ref=${code}`;
};

// Helper: Share to WhatsApp
const shareToWhatsApp = (code: string) => {
  const link = getReferralLink(code);
  const message = `Join me on Plago and earn daily rewards! Use my referral code: ${code}\n\nSign up here: ${link}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

// Helper: Copy full referral link
const copyReferralLink = (code: string, onSuccess: () => void) => {
  const link = getReferralLink(code);
  navigator.clipboard.writeText(link).then(() => {
    onSuccess();
  }).catch((err) => {
    console.error('Failed to copy link:', err);
    // Fallback: copy just the code
    navigator.clipboard.writeText(code).then(onSuccess);
  });
};

// Helper: Generate & download QR code (using public API to avoid dependencies)
const downloadQRCode = async (code: string, onLoading: (loading: boolean) => void) => {
  try {
    onLoading(true);
    const link = getReferralLink(code);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
    
    const response = await fetch(qrApiUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `plago-referral-${code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onLoading(false);
  } catch (err) {
    console.error('QR download failed:', err);
    onLoading(false);
    alert('Could not generate QR code. Please try again.');
  }
};

// ============================================
// INTERNAL: ReferralPanel - WITH DETAILS & CLAIM
// ============================================
const ReferralPanel = ({ 
  code, 
  stats, 
  referralDetails,
  onCopy,
  onClaimEarnings
}: { 
  code: string; 
  stats: ReferralStats; 
  referralDetails?: ReferralDetail[];
  onCopy: () => void;
  onClaimEarnings?: () => void;
}) => {
  const [qrLoading, setQrLoading] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  const handleCopyLink = () => {
    copyReferralLink(code, () => {
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    });
  };

  const handleDownloadQR = () => {
    downloadQRCode(code, setQrLoading);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Referral Header Card */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-lg sm:text-xl font-bold">Referral Program</h3>
          </div>
          <Award className="w-6 h-6 sm:w-8 sm:h-8 text-green-200" />
        </div>
        <p className="text-green-100 mb-4 sm:mb-6 text-sm">
          Earn 10% of your referrals' daily server earnings automatically.
        </p>
        
        <div className="bg-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-sm">
          <p className="text-[10px] sm:text-xs text-green-100 mb-2">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-base sm:text-xl font-mono font-bold break-all">{code}</code>
            <button 
              onClick={onCopy} 
              className="p-2 hover:bg-white/20 rounded-lg flex-shrink-0"
              title="Copy code"
            >
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
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

      {/* 👈 NEW: Referral Details List */}
      {referralDetails && referralDetails.length > 0 && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Your Referrals ({referralDetails.length})
          </h4>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {referralDetails.map((ref, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600 flex-shrink-0">
                    {ref.referee_id.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      User {ref.referee_id.substring(0, 8)}...
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(ref.joined_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Server className="w-3 h-3" /> {ref.servers_count} servers
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-600">+{ref.total_earned.toFixed(3)} TLC</p>
                  <p className="text-[10px] text-slate-400">Your bonus (10%)</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Claim Button */}
          {stats.totalEarnings > 0 && onClaimEarnings && (
            <button
              onClick={onClaimEarnings}
              className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200"
            >
              <Wallet className="w-5 h-5" />
              Claim {stats.totalEarnings.toFixed(2)} TLC
            </button>
          )}
        </div>
      )}

      {/* Share Section */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2 text-base">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" /> Share Your Referral Link
        </h4>
        <div className="space-y-2 sm:space-y-3">
          
          {/* WhatsApp Share */}
          <button 
            onClick={() => shareToWhatsApp(code)}
            className="w-full p-2.5 sm:p-3 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share on WhatsApp
          </button>
          
          {/* Copy Full Link */}
          <button 
            onClick={handleCopyLink}
            className="w-full p-2.5 sm:p-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 text-sm transition-colors relative"
          >
            {copyLinkSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" /> Link Copied!
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" /> Copy Referral Link
              </>
            )}
          </button>
          
          {/* Download QR Code */}
          <button 
            onClick={handleDownloadQR}
            disabled={qrLoading}
            className="w-full p-2.5 sm:p-3 bg-purple-50 text-purple-700 font-bold rounded-xl hover:bg-purple-100 flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
          >
            {qrLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download QR Code
              </>
            )}
          </button>
          
        </div>
        
        {/* Preview of what the link looks like */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-[10px] text-slate-500 mb-1">Your referral link:</p>
          <code className="text-xs text-slate-700 break-all font-mono">
            {getReferralLink(code)}
          </code>
        </div>
      </div>
    </div>
  );
};

// ============================================
// INTERNAL: ProviderList - Fully Separated Section with Navigation
// ============================================
const ProviderList = ({ providers, onProviderClick }: { 
  providers: any[]; 
  onProviderClick: (id: string) => void;
}) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-4 sm:p-6 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <Network className="w-5 h-5 text-blue-600" />
        <h3 className="text-base sm:text-lg font-bold text-slate-800">Node Provider Network</h3>
      </div>
      <p className="text-sm text-slate-500 mt-1">Verified infrastructure partners hosting your servers</p>
    </div>
    <div className="divide-y divide-slate-100">
      {providers.length === 0 ? (
        <div className="p-6 sm:p-8 text-center text-slate-500 text-sm">Loading providers...</div>
      ) : (
        providers.map((provider) => (
          <div 
            key={provider.id} 
            className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {provider.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm sm:text-base truncate">{provider.name}</p>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full whitespace-nowrap", 
                    provider.status === 'ACTIVE' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {provider.status}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {provider.rating || '5.0'}
                  </span>
                  {provider.mpesa_number && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {provider.mpesa_number}
                    </span>
                  )}
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
// MAIN EXPORTED COMPONENT
// ============================================
export function NetworkInterface({ 
  referralCode, 
  referralStats, 
  referralDetails,
  providers, 
  onCopyCode, 
  onProviderClick,
  onClaimEarnings
}: NetworkInterfaceProps) {
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
              <ReferralPanel 
                code={referralCode} 
                stats={referralStats} 
                referralDetails={referralDetails}
                onCopy={onCopyCode} 
                onClaimEarnings={onClaimEarnings}
              />
            </div>
          )}
          {tab === 'PROVIDERS' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-100">
              <ProviderList 
                providers={providers} 
                onProviderClick={onProviderClick} 
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default NetworkInterface;
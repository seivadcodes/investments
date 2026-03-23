'use client';

import { ShieldCheck } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import { ViewState } from './DashboardViews';

type HeaderProps = {
  user: any;
  onSignOut: () => Promise<void>;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
};

export default function Header({ user, onSignOut, currentView, onViewChange }: HeaderProps) {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => onViewChange('DASHBOARD')}
        >
          <div className="bg-blue-600 p-1.5 rounded">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800 tracking-tight">TrueLabel</span>
        </div>

        {/* Navigation + Profile */}
        <div className="flex items-center gap-4">
          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6 mr-4">
            <button 
              onClick={() => onViewChange('DASHBOARD')} 
              className={`text-sm font-medium ${
                ['DASHBOARD', 'WORK', 'PROCESSING', 'RESULTS'].includes(currentView)
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => window.location.href = '/wallet'} 
              className={`text-sm font-medium ${
                currentView === 'WALLET' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Wallet
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />

          {/* Profile Section */}
          {user ? (
            <ProfileDropdown user={user} onSignOut={onSignOut} />
          ) : (
            <button 
              onClick={() => (window.location.href = '/auth')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
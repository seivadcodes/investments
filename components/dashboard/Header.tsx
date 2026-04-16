'use client';
import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Menu, X, ChevronDown, LogOut, Settings, Wallet, Users, TrendingUp } from 'lucide-react';
import { ViewState } from './DashboardViews';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// 🔑 ADD YOUR AUTHORIZED BROKER EMAILS HERE
const BROKER_AUTHORIZED_EMAILS = [
  'antonellahellen@outlook.com',
  'kelly27ben@gmail.com',
  'fahamu@gmail.com',
  'abu@gmail.com',
  // Add more emails as needed
];

type HeaderProps = {
  user: any;
  onSignOut: () => Promise<void>;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
};

export default function Header({ user, onSignOut, currentView, onViewChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  // 🔑 Check if user is authorized to see Broker navigation
  const isBrokerAuthorized = user?.email && BROKER_AUTHORIZED_EMAILS.includes(user.email);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when view changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentView]);

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ✅ FIX: Proper navigation handler
  const handleNavClick = (view: ViewState) => {
    if (view === 'WALLET') {
      window.location.href = '/wallet';
    } else if (view === 'BROKER') {
      window.location.href = '/broker';
    } else {
      onViewChange(view);
    }
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between">
          {/* Logo - Left */}
          <div
            className="flex items-center gap-2 cursor-pointer flex-shrink-0"
            onClick={() => handleNavClick('DASHBOARD')}
          >
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold text-slate-800 tracking-tight hidden xs:block">
              TrueLabel
            </span>
          </div>

          {/* Desktop Navigation - Center/Right */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleNavClick('DASHBOARD')}
              className={cn(
                "text-sm font-medium transition-colors",
                ['DASHBOARD', 'WORK', 'PROCESSING', 'RESULTS'].includes(currentView)
                  ? "text-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleNavClick('WALLET')}
              className={cn(
                "text-sm font-medium transition-colors",
                currentView === 'WALLET' ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Wallet
            </button>

            <button
              onClick={() => window.location.href = '/trend'}
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1",
                "text-slate-500 hover:text-slate-800"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Forex
            </button>
            
            {/* 🔑 Broker Navigation - Only for Authorized Emails */}
            {isBrokerAuthorized && (
              <button
                onClick={() => handleNavClick('BROKER')}
                className={cn(
                  "text-sm font-medium transition-colors flex items-center gap-1",
                  currentView === 'BROKER' ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Users className="w-4 h-4" />
                Broker
              </button>
            )}
            
            <div className="h-6 w-px bg-slate-200" />
            
            {/* Desktop Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {getInitials()}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-slate-800">{getDisplayName()}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[120px]">{user?.email}</p>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-slate-400 transition-transform",
                  profileDropdownOpen && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">{getDisplayName()}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      View Transactions
                    </button>
                    
                    {/* 🔑 Show Broker Dashboard link in dropdown for authorized users */}
                    {isBrokerAuthorized && (
                      <button 
                        onClick={() => handleNavClick('BROKER')}
                        className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Broker Dashboard
                      </button>
                    )}
                    
                    <div className="border-t border-slate-100 my-2" />
                    <button
                      onClick={async () => {
                        await onSignOut();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button - Right */}
          <div className="flex md:hidden items-center gap-3">
            {/* Mobile Profile Avatar */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold"
              >
                {getInitials()}
              </button>
              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">{getDisplayName()}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                    <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Account Settings
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      View Transactions
                    </button>
                    
                    {/* 🔑 Mobile Broker Link in Dropdown */}
                    {isBrokerAuthorized && (
                      <button 
                        onClick={() => handleNavClick('BROKER')}
                        className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Broker Dashboard
                      </button>
                    )}
                    
                    <div className="border-t border-slate-100 my-2" />
                    <button
                      onClick={async () => {
                        await onSignOut();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Full Width Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-slate-200 bg-white overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2">
                <button
                  onClick={() => handleNavClick('DASHBOARD')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg font-medium transition-colors",
                    ['DASHBOARD', 'WORK', 'PROCESSING', 'RESULTS'].includes(currentView)
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Dashboard</span>
                  </div>
                </button>
                <button
                  onClick={() => handleNavClick('WALLET')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg font-medium transition-colors",
                    currentView === 'WALLET'
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5" />
                    <span>Wallet</span>
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '/trend'}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg font-medium transition-colors",
                    "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5" />
                    <span>Forex</span>
                  </div>
                </button>
                
                {/* 🔑 Mobile Broker Menu Item - Only for Authorized */}
                {isBrokerAuthorized && (
                  <button
                    onClick={() => handleNavClick('BROKER')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg font-medium transition-colors",
                      currentView === 'BROKER'
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5" />
                      <span>Broker Hub</span>
                    </div>
                  </button>
                )}
                
                <div className="pt-4 border-t border-slate-200 mt-4">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {getInitials()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{getDisplayName()}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await onSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full mt-2 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center gap-3"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
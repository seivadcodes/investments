// app/trend/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Download, Loader2, CheckCircle, AlertCircle, 
  ArrowUp, ArrowDown, ShieldCheck, Lock, Edit3, Save, X 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';

// 🔑 ADD EDITOR EMAILS HERE - Simple frontend check
const EDITOR_EMAILS = [
  'fahamu@gmail.com',
  // Add more emails as needed
];

type Asset = 'XAUUSD' | 'EURUSD';

interface ChartRow {
  id?: string;
  user_id: string;
  asset: Asset;
  date: string;
  open_0330: number;
  peak_price: number;
  peak_time: string;
  close_price: number;
  close_time: string;
  opposite_peak_price?: number | null;
  opposite_peak_time?: string | null;
  created_at?: string;
  // Form helper properties (not stored in DB)
  peak_hour?: number;
  peak_minute?: number;
  opp_peak_hour?: number;
  opp_peak_minute?: number;
}

interface NotificationState {
  msg: string;
  type: 'success' | 'error' | 'info';
}

// Format date with day name: "Mon, 15 Apr 2024"
const formatDateWithDay = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
};

const formatDiff = (open: number, value: number) => {
  const diff = value - open;
  const pct = ((diff / open) * 100).toFixed(2);
  return { diff: Math.abs(diff).toFixed(2), pct, isPositive: diff >= 0 };
};

const formatPrice = (price: number, asset: Asset) => {
  return asset === 'XAUUSD' ? price.toFixed(2) : price.toFixed(4);
};

export default function TrendPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  const canEdit = user?.email ? EDITOR_EMAILS.includes(user.email) : false;

  const [activeTab, setActiveTab] = useState<Asset>('XAUUSD');
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  
  const CLOSE_TIME = '21:00';
  
  const [newRow, setNewRow] = useState<Partial<ChartRow>>({
    date: new Date().toISOString().slice(0, 10),
    peak_hour: undefined,
    peak_minute: undefined,
    peak_time: '',
    opp_peak_hour: undefined,
    opp_peak_minute: undefined,
    opposite_peak_time: '',
  });

  const [editRow, setEditRow] = useState<Partial<ChartRow> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [user, authLoading, router]);

  const fetchRows = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('chart_simple')
        .select('*')
        .eq('asset', activeTab)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setRows(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTab]);

  useEffect(() => {
    if (user?.id) fetchRows();
  }, [user?.id, activeTab]);

  useEffect(() => {
    resetNewRow();
  }, [activeTab]);

  const resetNewRow = () => {
    setNewRow({
      date: new Date().toISOString().slice(0, 10),
      peak_hour: undefined,
      peak_minute: undefined,
      peak_time: '',
      opp_peak_hour: undefined,
      opp_peak_minute: undefined,
      opposite_peak_time: '',
    });
  };

  const showNotification = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdd = async () => {
    if (!user?.id || !newRow.date || !newRow.open_0330 || !newRow.peak_price) return;
    
    setAdding(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('chart_simple').insert({
        user_id: user.id,
        asset: activeTab,
        date: newRow.date!,
        open_0330: Number(newRow.open_0330),
        peak_price: Number(newRow.peak_price),
        peak_time: newRow.peak_time || '00:00',
        close_price: Number(newRow.close_price) || 0,
        close_time: CLOSE_TIME,
        opposite_peak_price: newRow.opposite_peak_price ? Number(newRow.opposite_peak_price) : null,
        opposite_peak_time: newRow.opposite_peak_time || null,
      });
      
      if (error) throw error;
      
      showNotification('✓ Added', 'success');
      resetNewRow();
      fetchRows();
    } catch (err: any) {
      showNotification(err.message || 'Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (row: ChartRow) => {
    setEditingId(row.id || null);
    // Parse peak_time for form inputs
    const [peakH, peakM] = row.peak_time?.split(':').map(Number) || [0, 0];
    const [oppH, oppM] = row.opposite_peak_time?.split(':').map(Number) || [0, 0];
    setEditRow({
      ...row,
      peak_hour: peakH,
      peak_minute: peakM,
      opp_peak_hour: oppH,
      opp_peak_minute: oppM,
    });
  };

  const handleSave = async (row: ChartRow) => {
    if (!row.id) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chart_simple')
        .update({
          date: editRow?.date,
          open_0330: editRow?.open_0330,
          peak_price: editRow?.peak_price,
          peak_time: editRow?.peak_time,
          close_price: editRow?.close_price,
          opposite_peak_price: editRow?.opposite_peak_price,
          opposite_peak_time: editRow?.opposite_peak_time,
        })
        .eq('id', row.id);
      
      if (error) throw error;
      
      showNotification('✓ Updated', 'success');
      setEditingId(null);
      setEditRow(null);
      fetchRows();
    } catch (err: any) {
      showNotification(err.message || 'Failed to update', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditRow(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this row?')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chart_simple')
        .delete()
        .eq('id', id);
      if (error) throw error;
      showNotification('Deleted', 'info');
      fetchRows();
    } catch {
      showNotification('Failed to delete', 'error');
    }
  };

  const handleExport = () => {
    if (rows.length === 0) {
      showNotification('No data to export', 'info');
      return;
    }
    const headers = ['Date', '00:30 Price', 'Peak Price', 'Peak Time', 'Opposite Peak', 'Opp Time', 'Close Price', 'Close Time', 'Peak Move', 'Opp Move'];
    const assetData = rows.map(r => {
      const peakMove = formatDiff(r.open_0330, r.peak_price);
      const oppMove = r.opposite_peak_price ? formatDiff(r.open_0330, r.opposite_peak_price) : null;
      return [
        formatDateWithDay(r.date),
        formatPrice(r.open_0330, activeTab),
        formatPrice(r.peak_price, activeTab),
        r.peak_time,
        r.opposite_peak_price ? formatPrice(r.opposite_peak_price, activeTab) : '-',
        r.opposite_peak_time || '-',
        formatPrice(r.close_price, activeTab),
        r.close_time,
        `${peakMove.isPositive ? '+' : '-'}${peakMove.diff} (${peakMove.pct}%)`,
        oppMove ? `${oppMove.isPositive ? '+' : '-'}${oppMove.diff} (${oppMove.pct}%)` : '-'
      ];
    });
    const csv = [headers.join(','), ...assetData.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Exported 📥', 'success');
  };

  // Mobile card view component
  const MobileCard = ({ row }: { row: ChartRow }) => {
    const peakMove = formatDiff(row.open_0330, row.peak_price);
    const oppMove = row.opposite_peak_price ? formatDiff(row.open_0330, row.opposite_peak_price) : null;
    const isEditing = editingId === row.id;

    if (isEditing && editRow) {
      return (
        <div className="bg-white rounded-xl border border-blue-300 p-4 mb-3 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-blue-700">Editing</span>
            <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={editRow.date || ''}
                onChange={(e) => setEditRow(prev => prev ? { ...prev, date: e.target.value } : null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">00:30 Price</label>
                <input
                  type="number"
                  step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                  value={editRow.open_0330 ?? ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, open_0330: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Peak Price</label>
                <input
                  type="number"
                  step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                  value={editRow.peak_price ?? ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, peak_price: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Peak Time</label>
                <input
                  type="time"
                  value={editRow.peak_time || ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, peak_time: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Opposite Peak</label>
                <input
                  type="number"
                  step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                  value={editRow.opposite_peak_price ?? ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, opposite_peak_price: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Opp Time</label>
                <input
                  type="time"
                  value={editRow.opposite_peak_time || ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, opposite_peak_time: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Close Price</label>
                <input
                  type="number"
                  step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                  value={editRow.close_price ?? ''}
                  onChange={(e) => setEditRow(prev => prev ? { ...prev, close_price: parseFloat(e.target.value) } : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleSave(row)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-bold text-slate-900">{formatDateWithDay(row.date)}</div>
            <div className="text-xs text-slate-500">{activeTab}</div>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <button
                onClick={() => handleEdit(row)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => row.id && handleDelete(row.id)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">00:30 Price</span>
            <span className="font-mono font-medium">{formatPrice(row.open_0330, activeTab)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-500">Peak</span>
            <div className="text-right">
              <div className="font-mono font-medium">{formatPrice(row.peak_price, activeTab)}</div>
              <div className="text-xs text-slate-400">{row.peak_time} UTC</div>
            </div>
          </div>

          {row.opposite_peak_price && (
            <div className="flex justify-between">
              <span className="text-slate-500">Opposite Peak</span>
              <div className="text-right">
                <div className="font-mono font-medium">{formatPrice(row.opposite_peak_price, activeTab)}</div>
                <div className="text-xs text-slate-400">{row.opposite_peak_time} UTC</div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-slate-500">Close</span>
            <div className="text-right">
              <div className="font-mono font-medium">{formatPrice(row.close_price, activeTab)}</div>
              <div className="text-xs text-slate-400">{row.close_time} UTC</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-xs">00:30 → Peak</span>
              <span className={cn(
                "font-bold font-mono text-sm flex items-center gap-1",
                peakMove.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {peakMove.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {peakMove.diff} ({peakMove.pct}%)
              </span>
            </div>
            
            {row.opposite_peak_price && oppMove && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-slate-500 text-xs">00:30 → Opp Peak</span>
                <span className={cn(
                  "font-bold font-mono text-sm flex items-center gap-1",
                  oppMove.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {oppMove.isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {oppMove.diff} ({oppMove.pct}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={cn(
              "fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg font-bold text-sm flex items-center gap-2",
              notification.type === 'success' ? "bg-green-600 text-white" :
              notification.type === 'error' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        user={user}
        onSignOut={signOut}
        currentView="DASHBOARD"
        onViewChange={(v) => {
          if (v === 'DASHBOARD') router.push('/investor');
          if (v === 'WALLET') router.push('/wallet');
        }}
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === 'XAUUSD' ? '🥇 Gold (XAU/USD)' : '💶 Euro (EUR/USD)'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Track daily 00:30 UTC → Peak → Close movements
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
              canEdit ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            )}>
              {canEdit ? <ShieldCheck className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {canEdit ? "Editor" : "View Only"}
            </div>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Asset Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('XAUUSD')}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'XAUUSD'
                ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            🥇 Gold
          </button>
          <button
            onClick={() => setActiveTab('EURUSD')}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'EURUSD'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            💶 Euro
          </button>
        </div>

        {/* Add Form - ONLY SHOWS IF canEdit */}
        <AnimatePresence>
          {canEdit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span className="font-bold">Add New Day</span>
                </div>
                
                {/* Mobile: Stacked inputs | Desktop: Grid */}
                <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:gap-3 md:space-y-0 items-end">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={newRow.date}
                      onChange={(e) => setNewRow(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">00:30 Price</label>
                    <input
                      type="number"
                      step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                      value={newRow.open_0330 ?? ''}
                      onChange={(e) => setNewRow(prev => ({ ...prev, open_0330: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder={activeTab === 'XAUUSD' ? "4650.00" : "1.0800"}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Peak Price</label>
                    <input
                      type="number"
                      step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                      value={newRow.peak_price ?? ''}
                      onChange={(e) => setNewRow(prev => ({ ...prev, peak_price: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder={activeTab === 'XAUUSD' ? "4750.00" : "1.0850"}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Peak Time (UTC)</label>
                    <input
                      type="time"
                      value={newRow.peak_time || ''}
                      onChange={(e) => setNewRow(prev => ({ ...prev, peak_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Opposite Peak</label>
                    <input
                      type="number"
                      step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                      value={newRow.opposite_peak_price ?? ''}
                      onChange={(e) => setNewRow(prev => ({ ...prev, opposite_peak_price: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="Optional"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Opp Time (UTC)</label>
                    <input
                      type="time"
                      value={newRow.opposite_peak_time || ''}
                      onChange={(e) => setNewRow(prev => ({ ...prev, opposite_peak_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Close Price</label>
                    <input
                      type="number"
                      step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                      value={newRow.close_price ?? ''}
                      onChange={(e) => setNewRow(prev => ({ ...prev, close_price: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder={activeTab === 'XAUUSD' ? "4700.00" : "1.0820"}
                    />
                  </div>
                  
                  <div className="md:col-span-2 lg:col-span-1 xl:col-span-2">
                    <button
                      onClick={handleAdd}
                      disabled={adding}
                      className={cn(
                        "w-full px-4 py-2 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                        adding ? "bg-slate-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Add Entry
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Data Section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Observations</h2>
          <span className="text-sm text-slate-500">{rows.length} entries</span>
        </div>

        {/* Mobile View - Cards */}
        <div className="md:hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
              {canEdit ? "No observations yet. Add your first day above! 👆" : "No data available yet."}
            </div>
          ) : (
            rows.map((row) => <MobileCard key={row.id} row={row} />)
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">00:30</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Peak</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Peak Time</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Opp Peak</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Opp Time</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Close</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-700">Close Time</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Peak Δ</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Opp Δ</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                        {canEdit ? "No observations yet. Add your first day above! 👆" : "No data available yet."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const peakMove = formatDiff(row.open_0330, row.peak_price);
                      const oppMove = row.opposite_peak_price ? formatDiff(row.open_0330, row.opposite_peak_price) : null;
                      const isEditing = editingId === row.id;

                      if (isEditing && editRow) {
                        return (
                          <tr key={row.id} className="border-b border-slate-100 bg-blue-50">
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={editRow.date || ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, date: e.target.value } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                                value={editRow.open_0330 ?? ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, open_0330: parseFloat(e.target.value) } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono text-right"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                                value={editRow.peak_price ?? ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, peak_price: parseFloat(e.target.value) } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="time"
                                value={editRow.peak_time || ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, peak_time: e.target.value } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                                value={editRow.opposite_peak_price ?? ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, opposite_peak_price: parseFloat(e.target.value) } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono text-right"
                                placeholder="-"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="time"
                                value={editRow.opposite_peak_time || ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, opposite_peak_time: e.target.value } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                                value={editRow.close_price ?? ''}
                                onChange={(e) => setEditRow(prev => prev ? { ...prev, close_price: parseFloat(e.target.value) } : null)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-mono text-right"
                              />
                            </td>
                            <td className="px-4 py-3 text-center text-slate-600">{row.close_time}</td>
                            <td className="px-4 py-3 text-right text-slate-400">—</td>
                            <td className="px-4 py-3 text-right text-slate-400">—</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleSave(row)}
                                  className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{formatDateWithDay(row.date)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPrice(row.open_0330, activeTab)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPrice(row.peak_price, activeTab)}</td>
                          <td className="px-4 py-3 text-center text-slate-600 font-mono">{row.peak_time}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {row.opposite_peak_price ? formatPrice(row.opposite_peak_price, activeTab) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 font-mono">
                            {row.opposite_peak_time || '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{formatPrice(row.close_price, activeTab)}</td>
                          <td className="px-4 py-3 text-center text-slate-600 font-mono">{row.close_time}</td>
                          <td className={cn(
                            "px-4 py-3 text-right font-bold font-mono flex items-center justify-end gap-1",
                            peakMove.isPositive ? "text-green-600" : "text-red-600"
                          )}>
                            {peakMove.isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                            {peakMove.diff} ({peakMove.pct}%)
                          </td>
                          <td className={cn(
                            "px-4 py-3 text-right font-bold font-mono flex items-center justify-end gap-1",
                            oppMove 
                              ? (oppMove.isPositive ? "text-green-600" : "text-red-600")
                              : "text-slate-400"
                          )}>
                            {oppMove ? (
                              <>
                                {oppMove.isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                                {oppMove.diff} ({oppMove.pct}%)
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {canEdit && (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => handleEdit(row)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => row.id && handleDelete(row.id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
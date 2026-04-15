// app/trend/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Download, Loader2, CheckCircle, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';

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
  created_at?: string;
}

interface NotificationState {
  msg: string;
  type: 'success' | 'error' | 'info';
}

const formatDiff = (open: number, peak: number) => {
  const diff = peak - open;
  const pct = ((diff / open) * 100).toFixed(2);
  return { diff: Math.abs(diff).toFixed(2), pct, isBullish: diff >= 0 };
};

export default function TrendPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<Asset>('XAUUSD');
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);
  
  const CLOSE_TIME = '21:00';
  
  const [newRow, setNewRow] = useState<Partial<ChartRow> & { peak_hour?: number; peak_minute?: number }>({
    date: new Date().toISOString().slice(0, 10),
    peak_hour: undefined,
    peak_minute: undefined,
    peak_time: '',
  });

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
        .eq('user_id', user.id)
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
  }, [user?.id, activeTab, fetchRows]);

  useEffect(() => {
    setNewRow({
      date: new Date().toISOString().slice(0, 10),
      peak_hour: undefined,
      peak_minute: undefined,
      peak_time: '',
    });
  }, [activeTab]);

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
        close_price: Number(newRow.close_price),
        close_time: CLOSE_TIME
      });
      
      if (error) throw error;
      
      showNotification('✓ Added', 'success');
      setNewRow({
        date: new Date().toISOString().slice(0, 10),
        peak_hour: undefined,
        peak_minute: undefined,
        peak_time: '',
      });
      fetchRows();
    } catch (err: any) {
      showNotification(err.message || 'Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this row?')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chart_simple')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
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
    const headers = ['Date', '03:30 Price', 'Peak Price', 'Peak Time', 'Close Price', 'Close Time', 'Move'];
    const assetData = rows.map(r => {
      const { diff, pct, isBullish } = formatDiff(r.open_0330, r.peak_price);
      return [
        r.date,
        r.open_0330,
        r.peak_price,
        r.peak_time,
        r.close_price,
        r.close_time,
        `${isBullish ? '+' : '-'}${diff} (${pct}%)`
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {activeTab === 'XAUUSD' ? '🥇 Gold (XAU/USD)' : '💶 Euro (EUR/USD)'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track daily 03:30 UTC → Peak → Close movements
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('XAUUSD')}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2",
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
              "px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2",
              activeTab === 'EURUSD'
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            💶 Euro
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-5 h-5 text-blue-600" />
            <span className="font-bold">Add New Day</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
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
              <label className="block text-xs text-slate-500 mb-1">03:30 Price</label>
              <input
                type="number"
                step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                value={newRow.open_0330 ?? ''}
                onChange={(e) => setNewRow(prev => ({ ...prev, open_0330: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={activeTab === 'XAUUSD' ? "e.g. 4650.00" : "e.g. 1.0800"}
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
                placeholder={activeTab === 'XAUUSD' ? "e.g. 4750.00" : "e.g. 1.0850"}
              />
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">Peak Time (UTC)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newRow.peak_hour ?? ''}
                  onChange={(e) => {
                    const h = e.target.value === '' ? undefined : Math.min(23, Math.max(0, parseInt(e.target.value) || 0));
                    setNewRow(prev => ({
                      ...prev,
                      peak_hour: h,
                      peak_time: `${String(h ?? 0).padStart(2, '0')}:${String(prev.peak_minute ?? 0).padStart(2, '0')}`
                    }));
                  }}
                  className="w-14 px-2 py-2 border border-slate-300 rounded-lg text-sm text-center font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder="HH"
                />
                <span className="text-slate-400 font-bold text-lg">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={newRow.peak_minute ?? ''}
                  onChange={(e) => {
                    const m = e.target.value === '' ? undefined : Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                    setNewRow(prev => ({
                      ...prev,
                      peak_minute: m,
                      peak_time: `${String(prev.peak_hour ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`
                    }));
                  }}
                  className="w-14 px-2 py-2 border border-slate-300 rounded-lg text-sm text-center font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder="MM"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-500 mb-1">Close Price</label>
              <input
                type="number"
                step={activeTab === 'XAUUSD' ? "0.01" : "0.0001"}
                value={newRow.close_price ?? ''}
                onChange={(e) => setNewRow(prev => ({ ...prev, close_price: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder={activeTab === 'XAUUSD' ? "e.g. 4700.00" : "e.g. 1.0820"}
              />
            </div>
            
            <button
              onClick={handleAdd}
              disabled={adding}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2",
                adding ? "bg-slate-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              )}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </motion.div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Observations</h2>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">03:30 Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Peak Price</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Peak Time</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Close Price</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-700">Close Time</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">03:30 → Peak</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      No observations yet. Add your first day above! 👆
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const { diff, pct, isBullish } = formatDiff(row.open_0330, row.peak_price);
                    return (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{row.date}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.open_0330.toFixed(activeTab === 'XAUUSD' ? 2 : 4)}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.peak_price.toFixed(activeTab === 'XAUUSD' ? 2 : 4)}</td>
                        <td className="px-4 py-3 text-center text-slate-600 font-mono">{row.peak_time}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.close_price.toFixed(activeTab === 'XAUUSD' ? 2 : 4)}</td>
                        <td className="px-4 py-3 text-center text-slate-600 font-mono">{row.close_time}</td>
                        <td className={cn(
                          "px-4 py-3 text-right font-bold font-mono flex items-center justify-end gap-1",
                          isBullish ? "text-green-600" : "text-red-600"
                        )}>
                          {isBullish ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                          {diff} ({pct}%)
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => row.id && handleDelete(row.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {rows.length >= 3 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Quick insight:</strong> Over your last {rows.length} entries, 
              {activeTab === 'XAUUSD' ? ' gold' : ' EUR/USD'} moved 
              <span className="font-bold">
                {' '}{rows.filter(r => formatDiff(r.open_0330, r.peak_price).isBullish).length}/{rows.length}{' '}
              </span>
              times in the direction of the peak after 03:30 UTC.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
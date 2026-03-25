'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, User, Phone, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase';
import Header from '@/components/dashboard/Header';
import Footer from '@/components/dashboard/Footer';

interface Application {
  id: string;
  user_id: string;
  mpesa_number: string;
  initial_capital: number;
  applied_at: string;
  email?: string;
  full_name?: string;
}

export default function AdminBrokersPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 🔒 Simple Admin Check (Replace with your actual admin logic)
  const isAdmin = user?.email === 'fahamu@gmail.com'; 

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      alert('Access Denied: Admins only');
      router.push('/');
      return;
    }
    fetchApplications();
  }, [user, isAdmin, router]);

  const fetchApplications = async () => {
    try {
      const supabase = createClient();
      // Join with auth.users to get email/name if stored in profiles, 
      // or just fetch applications and lookup profiles separately
      const { data, error } = await supabase
        .from('broker_applications')
        .select('*')
        .eq('status', 'PENDING')
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch user details for each application
      const appsWithDetails = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', app.user_id)
            .single();
          return { ...app, email: profile?.email, full_name: profile?.full_name };
        })
      );

      setApplications(appsWithDetails);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId: string, userId: string, mpesa: string) => {
    if (!confirm('Approve this user as a broker?')) return;
    setProcessingId(appId);

    try {
      const supabase = createClient();
      // Call the secure DB function we created earlier
      const { error } = await supabase.rpc('approve_broker_application', {
        app_id: appId,
        broker_name: 'Verified Broker', // Or use user's name
        b_mpesa: mpesa,
        b_location: 'Kenya' // Default, can be updated later
      });

      if (error) throw error;

      alert('Broker approved successfully!');
      fetchApplications(); // Refresh list
    } catch (err: any) {
      alert('Error approving: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string) => {
    if (!confirm('Reject this application?')) return;
    try {
      const supabase = createClient();
      await supabase
        .from('broker_applications')
        .update({ status: 'REJECTED', reviewed_at: new Date().toISOString() })
        .eq('id', appId);
      
      alert('Application rejected.');
      fetchApplications();
    } catch (err) {
      alert('Error rejecting');
    }
  };

  if (!isAdmin || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header user={user} onSignOut={signOut} currentView="DASHBOARD" onViewChange={() => {}} />
      
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
              Broker Applications
            </h1>
            <p className="text-slate-500 mt-1">Review and approve new brokers for the network.</p>
          </div>
          <button onClick={fetchApplications} className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : applications.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No pending applications.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map((app) => (
              <motion.div 
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-800">{app.full_name || app.email}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.mpesa_number}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Kenya</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Applied: {new Date(app.applied_at).toLocaleDateString()} • Capital: {app.initial_capital} TLC
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReject(app.id)}
                    disabled={!!processingId}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(app.id, app.user_id, app.mpesa_number)}
                    disabled={!!processingId}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center gap-2"
                  >
                    {processingId === app.id ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
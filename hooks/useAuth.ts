'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

// Helper: Ensure profile exists and create referral record if needed
async function ensureProfileExists(
  supabase: ReturnType<typeof createClient>,
  user: User, 
  referrerCode?: string | null
) {
  if (!user?.id) return;

  // First, resolve referrerCode to referrerId if provided
  let referrerId: string | null = null;
  if (referrerCode) {
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referrerCode.toUpperCase())
      .maybeSingle();
    
    if (referrer?.id && referrer.id !== user.id) {
      referrerId = referrer.id;
    }
  }

  // Check if profile exists
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, referral_code, referrer_id')
    .eq('id', user.id)
    .maybeSingle();

  const now = new Date().toISOString();
  const metadata = user.user_metadata;

  const fullName =
    (typeof metadata?.full_name === 'string' ? metadata.full_name : null) ||
    user.email?.split('@')[0] ||
    'User';

  const country = typeof metadata?.country === 'string' ? metadata.country : null;

  if (fetchError?.code === 'PGRST116' || !existingProfile) {
    // Profile doesn't exist → create it
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        country,
        referral_code: user.id.substring(0, 6).toUpperCase(),
        referrer_id: referrerId,
        last_seen: now,
        created_at: now,
        onboarding_completed: false,
        wallet_balance: 0,
        base_balance: 0,
        is_broker: false,
        height_unit: 'cm',
        weight_unit: 'kg',
      });

    if (insertError && insertError.code !== '23505') {
      console.error('Failed to create profile:', insertError);
    }

    // ✅ CRITICAL: Create referral record if user has a referrer
    if (referrerId) {
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: user.id,
          status: 'ACTIVE',
          referral_code: referrerCode?.toUpperCase() || '',
          created_at: now
        });
      
      if (referralError) {
        console.error('Failed to create referral record:', referralError);
      } else {
        console.log('✅ Referral record created successfully');
      }
    }
  } else if (existingProfile) {
    // Profile exists → update last_seen and referrer_id if not set
    const updateData: Record<string, any> = { last_seen: now };
    
    if (!existingProfile.referrer_id && referrerId) {
      updateData.referrer_id = referrerId;
      
      // Also create the referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: user.id,
          status: 'ACTIVE',
          referral_code: referrerCode?.toUpperCase() || '',
          created_at: now
        });
      
      if (referralError && referralError.code !== '23505') {
        console.warn('Failed to create referral record:', referralError);
      }
    }
    
    if (!existingProfile.referral_code) {
      updateData.referral_code = user.id.substring(0, 6).toUpperCase();
    }
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.warn('Failed to update profile:', updateError);
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const router = useRouter();

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
      country?: string | null,
      referrerCode?: string | null
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            country: country || null,
          },
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      });
      if (error) throw error;
      
      // Ensure profile is created with referrer
      if (data.user) {
        await ensureProfileExists(supabase, data.user, referrerCode);
      }
      
      return data;
    },
    []
  );

  const signOut = useCallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    router.push('/auth');
  }, [router]);

  useEffect(() => {
    let isSubscribed = true;
    const supabase = createClient();

    const clearStaleSession = () => {
      try {
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach((key) => {
            if (
              key.startsWith('supabase.auth.token') ||
              key.startsWith('supabase.session') ||
              key.startsWith('sb-')
            ) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch (e) {
        console.warn('Unable to clear stale session data:', e);
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error:', error);
        if (isSubscribed) {
          setLoading(false);
          setSessionChecked(true);
        }
        return;
      }

      if (isSubscribed && session?.user) {
        ensureProfileExists(supabase, session.user);
        setUser(session.user);
      } else if (isSubscribed) {
        setUser(null);
      }

      if (isSubscribed) {
        setLoading(false);
        setSessionChecked(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
        setSessionChecked(true);
        const currentPath = window.location.pathname;
        if (
          !currentPath.startsWith('/auth') &&
          !currentPath.startsWith('/onboarding')
        ) {
          router.push('/auth');
        }
      } else if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        if (session?.user) {
          ensureProfileExists(supabase, session.user);
          setUser(session.user);
        }
        setLoading(false);
        setSessionChecked(true);
      }
    });

    clearStaleSession();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return {
    user,
    loading,
    sessionChecked,
    signIn,
    signUp,
    signOut,
  };
}
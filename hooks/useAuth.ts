// /hooks/useAuth.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

// Helper to ensure profile exists and has basic fields + referral tracking
async function ensureProfileExists(user: User, referralCode?: string | null) {
  if (!user?.id) return;

  const supabase = createClient();

  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, referral_code')
    .eq('id', user.id)
    .single();

  const now = new Date().toISOString();
  const metadata = user.user_metadata;

  const fullName =
    (typeof metadata?.full_name === 'string' ? metadata.full_name : null) ||
    user.email?.split('@')[0] ||
    'User';

  const country = typeof metadata?.country === 'string' ? metadata.country : null;
  const storedReferral = typeof metadata?.referral_code === 'string' ? metadata.referral_code : referralCode;

  if (fetchError?.code === 'PGRST116') {
    // Profile doesn't exist → create it with referral code if provided
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        country,
        referral_code: storedReferral, // Store the referral code they signed up with
        last_seen: now,
        created_at: now,
        onboarding_completed: false,
        height_unit: 'cm',
        weight_unit: 'kg',
      });

    if (insertError && insertError.code !== '23505') {
      console.error('Failed to create profile:', insertError);
    }

    // If they used a referral code, create a referral record linking them to the referrer
    if (storedReferral) {
      await createReferralRecord(supabase, user.id, storedReferral);
    }
  } else if (existingProfile) {
    // Profile exists → update last_seen and ensure referral_code is set if not already
    const updateData: Record<string, any> = { last_seen: now };
    
    // Only update referral_code if it wasn't already set and we have a new one
    if (!existingProfile.referral_code && storedReferral) {
      updateData.referral_code = storedReferral;
      // Also create referral record if we're adding it now
      await createReferralRecord(supabase, user.id, storedReferral);
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

// Helper: Create referral record linking new user to referrer
async function createReferralRecord(supabase: ReturnType<typeof createClient>, newUserId: string, referralCode: string) {
  try {
    // Find the referrer by their referral_code
    const { data: referrer, error: referrerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      console.warn('Referral code not found:', referralCode);
      return;
    }

    // Don't allow self-referral
    if (referrer.id === newUserId) return;

    // Check if referral already exists to avoid duplicates
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrer.id)
      .eq('referred_id', newUserId)
      .maybeSingle();

    if (existingReferral) return; // Already tracked

    // Create the referral record
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: newUserId,
        referral_code: referralCode.toUpperCase(),
        status: 'PENDING', // Will become ACTIVE after email verification or first action
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to create referral record:', insertError);
    }
  } catch (err) {
    console.error('Referral tracking error:', err);
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
      referralCode?: string | null
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            country: country || null,
            referral_code: referralCode?.toUpperCase() || null, // Store in user_metadata too
          },
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      });
      if (error) throw error;
      
      // Ensure profile is created with referral code
      if (data.user) {
        await ensureProfileExists(data.user, referralCode);
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
        ensureProfileExists(session.user);
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
          ensureProfileExists(session.user);
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
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@mymart/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      // Mock sign-in for testing
      const mockUser = {
        id: 'cust-demo-1',
        email,
        user_metadata: { full_name: 'Rahul Sharma' },
      } as User;
      setUser(mockUser);
      setProfile({
        id: 'cust-demo-1',
        full_name: 'Rahul Sharma',
        phone: '9876543210',
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
      return { success: true };
    } catch (err: unknown) {
      const e = err as Error;
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    if (!isSupabaseConfigured) {
      const mockUser = {
        id: `cust-${Date.now()}`,
        email,
        user_metadata: { full_name: fullName, phone },
      } as User;
      setUser(mockUser);
      setProfile({
        id: mockUser.id,
        full_name: fullName,
        phone,
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { success: true };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
          },
        },
      });

      if (error) return { success: false, error: error.message };
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }
      return { success: true };
    } catch (err: unknown) {
      const e = err as Error;
      return { success: false, error: e.message || 'Signup failed' };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: Boolean(user),
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within an AuthProvider');
  }
  return context;
};

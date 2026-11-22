import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@mymart/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enableDemoMode: () => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('mymart_admin_demo') === 'true';
  });

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      setProfile(data as Profile);
      const userIsAdmin = data?.role === 'admin';
      setIsAdmin(userIsAdmin);
      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
      return null;
    }
  };

  useEffect(() => {
    if (isDemoMode) {
      setUser({
        id: 'demo-admin-id',
        email: 'owner@mymart.in',
        app_metadata: {},
        user_metadata: { full_name: 'Store Owner' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      setProfile({
        id: 'demo-admin-id',
        full_name: 'Store Owner',
        phone: '+91 9876543210',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isDemoMode]);

  const login = async (email: string, password: string) => {
    setError(null);
    if (isDemoMode) {
      return { success: true };
    }

    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'Supabase credentials are not configured yet in .env file. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        if (userProfile?.role !== 'admin') {
          await supabase.auth.signOut();
          return {
            success: false,
            error: 'Access Denied: This account does not possess owner/admin privileges.',
          };
        }
      }

      return { success: true };
    } catch (err: unknown) {
      const e = err as Error;
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      localStorage.removeItem('mymart_admin_demo');
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const enableDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem('mymart_admin_demo', 'true');
    setUser({
      id: 'demo-admin-id',
      email: 'owner@mymart.in',
      app_metadata: {},
      user_metadata: { full_name: 'Store Owner' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User);
    setProfile({
      id: 'demo-admin-id',
      full_name: 'Store Owner',
      phone: '+91 9876543210',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setIsAdmin(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        error,
        login,
        logout,
        enableDemoMode,
        isDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

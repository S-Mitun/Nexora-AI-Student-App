import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StudentProfile, AuthUser } from '../types/auth';
import { apiService, setApiAccessToken } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  profile: StudentProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSupabaseConnected: boolean;
  identities: string[];
  primaryProvider?: string;
  hasPasswordAuth: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; needsEmailVerification?: boolean }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<StudentProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to extract connected provider identities and password configuration from Supabase user
const extractIdentities = (supabaseUser: any): { identities: string[]; primaryProvider: string; hasPasswordAuth: boolean } => {
  if (!supabaseUser) return { identities: [], primaryProvider: 'unknown', hasPasswordAuth: false };
  const providersSet = new Set<string>();

  if (Array.isArray(supabaseUser.app_metadata?.providers)) {
    supabaseUser.app_metadata.providers.forEach((p: string) => providersSet.add(p));
  } else if (typeof supabaseUser.app_metadata?.provider === 'string') {
    providersSet.add(supabaseUser.app_metadata.provider);
  }

  if (Array.isArray(supabaseUser.identities)) {
    supabaseUser.identities.forEach((id: any) => {
      if (id.provider) providersSet.add(id.provider);
    });
  }

  const identitiesList = Array.from(providersSet);
  const primary = supabaseUser.app_metadata?.provider || identitiesList[0] || 'email';
  
  // Detect whether the student has password authentication configured
  const hasPassword = Boolean(
    providersSet.has('email') ||
    supabaseUser.user_metadata?.has_password_auth === true ||
    primary === 'email'
  );

  return { 
    identities: identitiesList.length > 0 ? identitiesList : ['email'], 
    primaryProvider: primary, 
    hasPasswordAuth: hasPassword 
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [identities, setIdentities] = useState<string[]>([]);
  const [primaryProvider, setPrimaryProvider] = useState<string>('email');
  const [hasPasswordAuth, setHasPasswordAuth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or auto-provision student profile from FastAPI backend
  const loadProfile = async (accessToken?: string) => {
    try {
      if (accessToken) {
        setApiAccessToken(accessToken);
      }
      const data = await apiService.getProfile();
      setProfile(data);
      if (data?.preferred_language) {
        localStorage.setItem('nexora_preferred_language', data.preferred_language);
      }
    } catch (err) {
      console.warn('[NEXORA] Could not load profile from backend API:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          // 1. Restore real Supabase session
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (data.session) {
            const currentSession = data.session;
            const currentUser = currentSession.user;
            if (isMounted) {
              setSession(currentSession);
              setUser({
                id: currentUser.id,
                email: currentUser.email,
                user_metadata: currentUser.user_metadata,
                app_metadata: currentUser.app_metadata,
                identities: currentUser.identities,
              });
              const idData = extractIdentities(currentUser);
              setIdentities(idData.identities);
              setPrimaryProvider(idData.primaryProvider);
              setHasPasswordAuth(idData.hasPasswordAuth);
              setApiAccessToken(currentSession.access_token);
              localStorage.setItem('nexora_access_token', currentSession.access_token);
            }
            await loadProfile(currentSession.access_token);
          } else {
            setApiAccessToken(null);
            localStorage.removeItem('nexora_access_token');
          }
        } else {
          // 2. Dev mode fallback: restore local dev student session if previously saved
          const storedDevUser = localStorage.getItem('nexora_dev_student');
          if (storedDevUser && isMounted) {
            const devData = JSON.parse(storedDevUser);
            setUser(devData.user);
            setIdentities(['email']);
            setPrimaryProvider('email');
            setHasPasswordAuth(true);
            const devToken = `dev-student-${devData.user.id}`;
            setSession({ access_token: devToken });
            setApiAccessToken(devToken);
            localStorage.setItem('nexora_access_token', devToken);
            await loadProfile(devToken);
          }
        }
      } catch (err) {
        console.error('[NEXORA] Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 3. Supabase Auth state change listener
    let authListener: any = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession) {
            const cUser = currentSession.user;
            setSession(currentSession);
            setUser({
              id: cUser.id,
              email: cUser.email,
              user_metadata: cUser.user_metadata,
              app_metadata: cUser.app_metadata,
              identities: cUser.identities,
            });
            const idData = extractIdentities(cUser);
            setIdentities(idData.identities);
            setPrimaryProvider(idData.primaryProvider);
            setHasPasswordAuth(idData.hasPasswordAuth);
            setApiAccessToken(currentSession.access_token);
            localStorage.setItem('nexora_access_token', currentSession.access_token);
            await loadProfile(currentSession.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setProfile(null);
          setIdentities([]);
          setPrimaryProvider('email');
          setHasPasswordAuth(false);
          setApiAccessToken(null);
          localStorage.removeItem('nexora_access_token');
        }
        setLoading(false);
      });
      authListener = data.subscription;
    }

    return () => {
      isMounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error };

        if (data.session) {
          const sUser = data.session.user;
          setSession(data.session);
          setUser({
            id: sUser.id,
            email: sUser.email,
            user_metadata: sUser.user_metadata,
            app_metadata: sUser.app_metadata,
            identities: sUser.identities,
          });
          const idData = extractIdentities(sUser);
          setIdentities(idData.identities);
          setPrimaryProvider(idData.primaryProvider);
          setHasPasswordAuth(idData.hasPasswordAuth);
          setApiAccessToken(data.session.access_token);
          localStorage.setItem('nexora_access_token', data.session.access_token);
          await loadProfile(data.session.access_token);
        }
        return { error: null };
      } else {
        // Dev fallback simulation
        const devId = `dev-${Date.now()}`;
        const devUser: AuthUser = {
          id: devId,
          email,
          user_metadata: { full_name: email.split('@')[0], has_password_auth: true },
          app_metadata: { provider: 'email', providers: ['email'] },
        };
        const devToken = `dev-student-${devId}`;
        setUser(devUser);
        setIdentities(['email']);
        setPrimaryProvider('email');
        setHasPasswordAuth(true);
        setSession({ access_token: devToken });
        setApiAccessToken(devToken);
        localStorage.setItem('nexora_access_token', devToken);
        localStorage.setItem('nexora_dev_student', JSON.stringify({ user: devUser }));
        await loadProfile(devToken);
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (isSupabaseConfigured) {
        const redirectUrl = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
          },
        });
        if (error) return { error };
        return { error: null };
      } else {
        return {
          error: new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'),
        };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split('@')[0],
              has_password_auth: true,
            },
          },
        });
        if (error) return { error };

        const needsEmailVerification = !data.session;
        if (data.session) {
          const sUser = data.session.user;
          setSession(data.session);
          setUser({
            id: sUser.id,
            email: sUser.email,
            user_metadata: sUser.user_metadata,
            app_metadata: sUser.app_metadata,
            identities: sUser.identities,
          });
          const idData = extractIdentities(sUser);
          setIdentities(idData.identities);
          setPrimaryProvider(idData.primaryProvider);
          setHasPasswordAuth(idData.hasPasswordAuth);
          setApiAccessToken(data.session.access_token);
          localStorage.setItem('nexora_access_token', data.session.access_token);
          await loadProfile(data.session.access_token);
        }
        return { error: null, needsEmailVerification };
      } else {
        // Dev fallback simulation
        const devId = `dev-${Date.now()}`;
        const devUser: AuthUser = {
          id: devId,
          email,
          user_metadata: { full_name: fullName || email.split('@')[0], has_password_auth: true },
          app_metadata: { provider: 'email', providers: ['email'] },
        };
        const devToken = `dev-student-${devId}`;
        setUser(devUser);
        setIdentities(['email']);
        setPrimaryProvider('email');
        setHasPasswordAuth(true);
        setSession({ access_token: devToken });
        setApiAccessToken(devToken);
        localStorage.setItem('nexora_access_token', devToken);
        localStorage.setItem('nexora_dev_student', JSON.stringify({ user: devUser }));
        await loadProfile(devToken);
        return { error: null, needsEmailVerification: false };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
        });
        if (error) return { error };
        return { error: null };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: Error | null }> => {
    try {
      if (isSupabaseConfigured) {
        // Set password on current authenticated Supabase user session
        const { data, error } = await supabase.auth.updateUser({
          password,
          data: { has_password_auth: true },
        });
        if (error) return { error };

        if (data.user) {
          const u = data.user;
          setUser({
            id: u.id,
            email: u.email,
            user_metadata: u.user_metadata,
            app_metadata: u.app_metadata,
            identities: u.identities,
          });
          const idData = extractIdentities(u);
          setIdentities(idData.identities);
          setPrimaryProvider(idData.primaryProvider);
          setHasPasswordAuth(true);
        }
        return { error: null };
      } else {
        // Dev fallback simulation
        if (user) {
          const updatedUser: AuthUser = {
            ...user,
            user_metadata: {
              ...(user.user_metadata || {}),
              has_password_auth: true,
            },
          };
          setUser(updatedUser);
          setIdentities(Array.from(new Set([...identities, 'email'])));
          setHasPasswordAuth(true);
        }
        return { error: null };
      }
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[NEXORA] Error signing out from Supabase:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIdentities([]);
      setPrimaryProvider('email');
      setHasPasswordAuth(false);
      setApiAccessToken(null);
      localStorage.removeItem('nexora_access_token');
      localStorage.removeItem('nexora_dev_student');
    }
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      await loadProfile(session.access_token);
    }
  };

  const updateProfile = async (updates: Partial<StudentProfile>) => {
    try {
      const updated = await apiService.updateProfile(updates);
      setProfile(updated);
      if (updated?.preferred_language) {
        localStorage.setItem('nexora_preferred_language', updated.preferred_language);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAuthenticated: Boolean(user),
        isSupabaseConnected: isSupabaseConfigured,
        identities,
        primaryProvider,
        hasPasswordAuth,
        signIn,
        signInWithGoogle,
        signUp,
        resendVerificationEmail,
        updatePassword,
        signOut,
        refreshProfile,
        updateProfile,
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

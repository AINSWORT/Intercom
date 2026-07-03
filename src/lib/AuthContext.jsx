import { createContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
    } else {
      setProfile(data);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession?.user) await loadProfile(initialSession.user.id);
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError({ type: 'login_failed', message: error.message });
    return { error };
  };

  const register = async (email, password, fullName) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) setAuthError({ type: 'register_failed', message: error.message });
    // Si la confirmación de correo está desactivada en Supabase, signUp ya
    // devuelve una sesión activa (onAuthStateChange se encarga de entrar a
    // la app). Si está activada, no hay sesión todavía y hay que avisarle
    // al usuario que revise su correo.
    const needsEmailConfirmation = !error && !data.session;
    return { error, needsEmailConfirmation };
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setAuthError({ type: 'login_failed', message: error.message });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const resetPasswordForEmail = async (email) => {
    setAuthError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-password`,
    });
    if (error) setAuthError({ type: 'reset_failed', message: error.message });
    return { error };
  };

  const updatePassword = async (newPassword) => {
    setAuthError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsPasswordRecovery(false);
    else setAuthError({ type: 'update_password_failed', message: error.message });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      profile,
      isAuthenticated: !!session,
      isLoadingAuth,
      isPasswordRecovery,
      authError,
      login,
      register,
      loginWithGoogle,
      logout,
      resetPasswordForEmail,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };

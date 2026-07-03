import { useAuth } from '@/lib/useAuth';

export default function useCurrentUser() {
  const { profile, isLoadingAuth } = useAuth();

  const isSuperadmin = profile?.role === 'superadmin';
  const isAdmin = isSuperadmin || profile?.role === 'admin';
  const isUsuario = profile?.role === 'usuario';

  return { user: profile, loading: isLoadingAuth, isAdmin, isSuperadmin, isUsuario };
}

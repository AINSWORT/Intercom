import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/useAuth';
import useCurrentUser from '@/hooks/useCurrentUser';
import AppLayout from '@/Components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Antennas from '@/pages/Antennas';
import Technicians from '@/pages/Technicians';
import PageNotFound from '@/lib/PageNotFound';

function FullScreenSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function RequireAdmin({ children }) {
  const { isAdmin, loading } = useCurrentUser();
  if (loading) return <FullScreenSpinner />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const { isAuthenticated, isLoadingAuth, isPasswordRecovery } = useAuth();

  if (isLoadingAuth) return <FullScreenSpinner />;
  if (isPasswordRecovery) return <ResetPasswordPage />;
  if (!isAuthenticated) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/clientes/:id" element={<ClientDetail />} />
        <Route path="/antenas" element={<Antennas />} />
        <Route
          path="/tecnicos"
          element={
            <RequireAdmin>
              <Technicians />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export default App;

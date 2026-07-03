import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Radio, Wrench, LogOut, Menu, X, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import useCurrentUser from '../hooks/useCurrentUser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/UI/dialog';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Button } from '@/Components/UI/button';
import Footer from '@/Components/Footer';
import logo from '@/assets/logo.png';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/clientes', label: 'Clientes', icon: Users },
  { path: '/antenas', label: 'Antenas', icon: Radio },
  { path: '/tecnicos', label: 'Técnicos', icon: Wrench },
];

function ChangePasswordDialog({ open, onClose }) {
  const { updatePassword, authError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setDone(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (password !== confirmPassword || password.length < 6) return;
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (!error) setDone(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Tu contraseña se actualizó correctamente.</p>
            <Button onClick={handleClose} className="w-full">Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nueva contraseña</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder="••••••••" />
            </div>
            <div>
              <Label>Confirmar contraseña</Label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6} placeholder="••••••••" />
            </div>
            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-destructive font-medium">Las contraseñas no coinciden.</p>
            )}
            {authError && <p className="text-sm text-destructive font-medium">{authError.message}</p>}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !password || password !== confirmPassword}
                className="flex-1"
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const { user, isAdmin } = useCurrentUser();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const filteredNav = navItems.filter(item => {
    if (item.path === '/tecnicos') return isAdmin;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Intercom" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h1 className="font-bold text-sidebar-primary-foreground text-lg leading-tight">Intercom</h1>
              <p className="text-xs text-sidebar-foreground/60">Internet a un clic</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {filteredNav.map(item => {
            const active = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
              {user?.full_name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.full_name || 'Usuario'}</p>
              <p className="text-xs text-sidebar-foreground/50">
                {user?.role === 'superadmin' ? 'Superadmin' : user?.role === 'admin' ? 'Admin' : 'Técnico'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
          >
            <KeyRound className="w-4 h-4" />
            Cambiar contraseña
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Intercom" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-sidebar-primary-foreground">Intercom</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-sidebar p-4 space-y-1 pt-16" onClick={e => e.stopPropagation()}>
            {filteredNav.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={() => { setMobileOpen(false); setShowChangePassword(true); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent w-full mt-4"
            >
              <KeyRound className="w-4 h-4" />
              Cambiar contraseña
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent w-full"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-0 mt-14 lg:mt-0 overflow-auto flex flex-col">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>

      <ChangePasswordDialog open={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  );
}

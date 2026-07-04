import { useEffect, useState } from 'react';
import { Profile, Client } from '@/api/entities';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { UserPlus, Shield, ShieldCheck, Wrench, Trash2 } from 'lucide-react';
import { Button } from '@/Components/UI/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/UI/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/UI/alert-dialog';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import useCurrentUser from '@/hooks/useCurrentUser';
import ErrorState from '@/Components/ErrorState';

const ROLE_LABEL = { superadmin: 'Superadmin', admin: 'Admin', usuario: 'Técnico' };
const ROLE_ICON = { superadmin: ShieldCheck, admin: Shield, usuario: Wrench };

export default function Technicians() {
  const { user: currentUser, isSuperadmin } = useCurrentUser();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteUserError, setDeleteUserError] = useState(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, c] = await Promise.all([
          Profile.list(),
          Client.list(),
        ]);
        setUsers(u);
        setClients(c);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const reloadData = async () => {
    const [u, c] = await Promise.all([
      Profile.list(),
      Client.list(),
    ]);
    setUsers(u);
    setClients(c);
  };

  const handleInvite = async () => {
    setInviting(true);
    setInviteError(null);
    // Se usa un cliente Supabase aislado (sin persistir sesión) para no
    // reemplazar la sesión de quien está creando la cuenta.
    // El rol nunca se pasa desde aquí: siempre nace como 'usuario' y solo
    // un superadmin puede ascenderlo después (ver protect_role_change en schema.sql).
    const { error } = await supabaseAdmin.auth.signUp({
      email: inviteEmail,
      password: invitePassword,
      options: { data: { full_name: inviteFullName } },
    });
    setInviting(false);
    if (error) {
      setInviteError(error.message);
      return;
    }
    setShowInvite(false);
    setInviteEmail('');
    setInviteFullName('');
    setInvitePassword('');
    reloadData();
  };

  const handleRoleChange = async (userId, newRole) => {
    setRoleUpdating(userId);
    try {
      await Profile.update(userId, { role: newRole });
      await reloadData();
    } finally {
      setRoleUpdating(null);
    }
  };

  const handleDeleteUser = async () => {
    setDeletingInProgress(true);
    setDeleteUserError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId: deletingUser.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setDeletingInProgress(false);
    if (error) {
      setDeleteUserError(error.message);
      return;
    }
    setDeletingUser(null);
    await reloadData();
  };

  const getClientCount = (email) => clients.filter(c => c.technician_email === email).length;

  if (error) return <ErrorState message={error} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Técnicos</h1>
          <p className="text-muted-foreground text-sm">{users.length} usuarios en el sistema</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Invitar Técnico
        </Button>
      </div>

      <div className="space-y-2">
        {users.map(user => {
          const RoleIcon = ROLE_ICON[user.role] || Wrench;
          return (
            <div key={user.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  user.role === 'usuario' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  <RoleIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{user.full_name || 'Sin nombre'}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1 sm:shrink-0">
                <div className="flex items-center gap-2">
                  {isSuperadmin ? (
                    <Select
                      value={user.role}
                      onValueChange={v => handleRoleChange(user.id, v)}
                      disabled={roleUpdating === user.id}
                    >
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usuario">Técnico</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="superadmin">Superadmin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      user.role === 'usuario' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      {ROLE_LABEL[user.role] || user.role}
                    </span>
                  )}
                  {isSuperadmin && user.id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletingUser(user)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{getClientCount(user.email)} clientes asignados</p>
              </div>
            </div>
          );
        })}
      </div>

      {showInvite && (
        <Dialog open onOpenChange={() => setShowInvite(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Invitar Técnico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nombre completo</Label>
                <Input
                  value={inviteFullName}
                  onChange={e => setInviteFullName(e.target.value)}
                  placeholder="Nombre del técnico"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <Label>Contraseña temporal</Label>
                <Input
                  type="password"
                  value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                La cuenta se crea con rol Técnico. Un superadmin puede ascenderla después desde esta misma pantalla.
              </p>
              {inviteError && <p className="text-sm text-destructive font-medium">{inviteError}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowInvite(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteFullName || invitePassword.length < 6} className="flex-1">
                  {inviting ? 'Creando...' : 'Crear cuenta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deletingUser} onOpenChange={() => { setDeletingUser(null); setDeleteUserError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará por completo la cuenta de {deletingUser?.full_name || deletingUser?.email}. No podrá volver a iniciar sesión. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteUserError && <p className="text-sm text-destructive font-medium">{deleteUserError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={deletingInProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingInProgress ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Shield, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Technicians() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('tecnico');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [u, c] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Client.list(),
      ]);
      setUsers(u);
      setClients(c);
      setLoading(false);
    };
    fetchData();
  }, []);

  const reloadData = async () => {
    const [u, c] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Client.list(),
    ]);
    setUsers(u);
    setClients(c);
  };

  const handleInvite = async () => {
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole === 'admin' ? 'admin' : 'user');
    // After invite, update role if tecnico
    // Note: invited user will have default role, we need to wait for them to register
    setInviting(false);
    setShowInvite(false);
    setInviteEmail('');
    reloadData();
  };

  const getClientCount = (email) => clients.filter(c => c.technician_email === email).length;

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
          <UserPlus className="w-4 h-4" /> Invitar Usuario
        </Button>
      </div>

      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
              }`}>
                {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{user.full_name || 'Sin nombre'}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'
              }`}>
                {user.role === 'admin' ? 'Superadmin' : 'Técnico'}
              </span>
              <p className="text-xs text-muted-foreground mt-1">{getClientCount(user.email)} clientes asignados</p>
            </div>
          </div>
        ))}
      </div>

      {showInvite && (
        <Dialog open onOpenChange={() => setShowInvite(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Invitar Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
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
                <Label>Rol</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="admin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowInvite(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="flex-1">
                  {inviting ? 'Invitando...' : 'Invitar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
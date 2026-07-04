import { useEffect, useState } from 'react';
import { Antenna as AntennaEntity, Client } from '@/api/entities';
import { Plus, Radio, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/Components/UI/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/UI/alert-dialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import AntennaFormDialog from '@/Components/AntennaFormDialog';
import ErrorState from '@/Components/ErrorState';

export default function Antennas() {
  const { user, isAdmin, isSuperadmin } = useCurrentUser();
  const canModify = (antenna) => isSuperadmin || (user?.role === 'admin' && antenna.created_by === user?.id);
  const [antennas, setAntennas] = useState([]);
  const [clientCounts, setClientCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const countClientsByAntenna = (clients) =>
    clients.reduce((acc, c) => {
      if (c.antenna_id) acc[c.antenna_id] = (acc[c.antenna_id] || 0) + 1;
      return acc;
    }, {});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [a, clients] = await Promise.all([AntennaEntity.list('-created_at'), Client.list()]);
        setAntennas(a);
        setClientCounts(countClientsByAntenna(clients));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const reloadData = async () => {
    const [a, clients] = await Promise.all([AntennaEntity.list('-created_at'), Client.list()]);
    setAntennas(a);
    setClientCounts(countClientsByAntenna(clients));
  };

  const handleDelete = async () => {
    await AntennaEntity.delete(deleting.id);
    setDeleting(null);
    await reloadData();
  };

  const statusColor = {
    Activa: 'bg-green-100 text-green-700',
    Inactiva: 'bg-red-100 text-red-700',
    'En mantenimiento': 'bg-yellow-100 text-yellow-700',
  };

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
          <h1 className="text-2xl font-bold text-foreground">Antenas</h1>
          <p className="text-muted-foreground text-sm">{antennas.length} antenas registradas</p>
        </div>
        {isAdmin && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva Antena
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {antennas.map(antenna => (
          <div key={antenna.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Radio className="w-5 h-5 text-accent-foreground" />
              </div>
              {canModify(antenna) && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(antenna); setShowForm(true); }}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(antenna)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-foreground">{antenna.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{antenna.location}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[antenna.status] || 'bg-gray-100 text-gray-600'}`}>
                {antenna.status}
              </span>
              <span className="text-xs text-muted-foreground">{antenna.type}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {clientCounts[antenna.id] || 0} cliente{clientCounts[antenna.id] === 1 ? '' : 's'}
              </span>
            </div>
            {antenna.notes && <p className="text-xs text-muted-foreground mt-2">{antenna.notes}</p>}
          </div>
        ))}
      </div>

      {antennas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No hay antenas registradas</div>
      )}

      {showForm && (
        <AntennaFormDialog
          antenna={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reloadData(); }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar antena?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la antena {deleting?.name}. Los clientes asignados a esta antena no serán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
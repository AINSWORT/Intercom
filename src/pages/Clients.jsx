import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useCurrentUser from '@/hooks/useCurrentUser';
import ClientFormDialog from '@/Components/ClientFormDialog';

export default function Clients() {
  const { isAdmin } = useCurrentUser();
  const [clients, setClients] = useState([]);
  const [antennas, setAntennas] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [c, a, t] = await Promise.all([
        base44.entities.Client.list('-created_date'),
        base44.entities.Antenna.list(),
        base44.entities.User.list(),
      ]);
      setClients(c);
      setAntennas(a);
      setTechnicians(t.filter(u => u.role === 'tecnico' || u.role === 'admin'));
      setLoading(false);
    };
    fetchData();
  }, []);

  const reloadData = async () => {
    const [c, a, t] = await Promise.all([
      base44.entities.Client.list('-created_date'),
      base44.entities.Antenna.list(),
      base44.entities.User.list(),
    ]);
    setClients(c);
    setAntennas(a);
    setTechnicians(t.filter(u => u.role === 'tecnico' || u.role === 'admin'));
  };

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.address?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const getAntennaName = (id) => antennas.find(a => a.id === id)?.name || '—';
  const getTechName = (email) => technicians.find(t => t.email === email)?.full_name || email || '—';

  const statusColor = {
    Activo: 'bg-green-100 text-green-700',
    Suspendido: 'bg-yellow-100 text-yellow-700',
    Cancelado: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clients.length} clientes registrados</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, dirección o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(client => (
          <Link
            key={client.id}
            to={`/clientes/${client.id}`}
            className="block bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{client.full_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[client.status] || 'bg-gray-100 text-gray-600'}`}>
                    {client.status || 'Activo'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{client.address}</span>
                  <span>Antena: {getAntennaName(client.antenna_id)}</span>
                  <span>Técnico: {getTechName(client.technician_email)}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron clientes
          </div>
        )}
      </div>

      {showForm && (
        <ClientFormDialog
          antennas={antennas}
          technicians={technicians}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); reloadData(); }}
        />
      )}
    </div>
  );
}
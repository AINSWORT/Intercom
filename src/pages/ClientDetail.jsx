import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client, Antenna, Profile, Payment } from '@/api/entities';
import { ArrowLeft, Edit, Trash2, Phone, MapPin, Radio, CreditCard, Calendar } from 'lucide-react';
import { Button } from '@/Components/UI/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/UI/alert-dialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import PaymentCalendar from '@/Components/PaymentCalendar';
import ClientFormDialog from '@/Components/ClientFormDialog';
import ErrorState from '@/Components/ErrorState';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperadmin } = useCurrentUser();
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [antennas, setAntennas] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clients, a, t, p] = await Promise.all([
          Client.list(),
          Antenna.list(),
          Profile.list(),
          Payment.filter({ client_id: id }),
        ]);
        setClient(clients.find(c => c.id === id));
        setAntennas(a);
        setTechnicians(t);
        setPayments(p);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const reloadData = async () => {
    const [clients, a, t, p] = await Promise.all([
      Client.list(),
      Antenna.list(),
      Profile.list(),
      Payment.filter({ client_id: id }),
    ]);
    setClient(clients.find(c => c.id === id));
    setAntennas(a);
    setTechnicians(t);
    setPayments(p);
  };

  const loadPayments = async () => {
    const p = await Payment.filter({ client_id: id });
    setPayments(p);
  };

  const handleDelete = async () => {
    await Client.delete(id);
    navigate('/clientes');
  };

  if (error) return <ErrorState message={error} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" onClick={() => navigate('/clientes')} className="mt-4">Volver</Button>
      </div>
    );
  }

  const antenna = antennas.find(a => a.id === client.antenna_id);
  const tech = technicians.find(t => t.email === client.technician_email);

  const statusColor = {
    Activo: 'bg-green-100 text-green-700',
    Suspendido: 'bg-yellow-100 text-yellow-700',
    Cancelado: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{client.full_name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[client.status] || 'bg-gray-100 text-gray-600'}`}>
              {client.status || 'Activo'}
            </span>
          </div>
        </div>
        {(isSuperadmin || (user?.role === 'admin' && client.created_by === user?.id)) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1.5">
              <Edit className="w-4 h-4" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDelete(true)} className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" /> Eliminar
            </Button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Información del Cliente</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{client.phone || 'Sin teléfono'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{client.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Antena: {antenna?.name || '—'} ({antenna?.location || ''})</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Tarjeta: {client.bank_card_number || 'No registrada'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Instalación: {client.installation_date || 'No registrada'}</span>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Servicio</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium">{client.plan || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cuota mensual</span>
              <span className="text-sm font-medium">${client.monthly_fee || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Técnico encargado</span>
              <span className="text-sm font-medium">{tech?.full_name || client.technician_email}</span>
            </div>
            {client.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Notas:</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Calendar */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <PaymentCalendar
          clientId={id}
          payments={payments}
          monthlyFee={client.monthly_fee}
          onPaymentChange={loadPayments}
          canRegisterPayment={true}
        />
      </div>

      {showEdit && (
        <ClientFormDialog
          client={client}
          antennas={antennas}
          technicians={technicians}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); reloadData(); }}
        />
      )}

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará toda la información de {client.full_name}.
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
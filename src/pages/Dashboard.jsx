import { useEffect, useState } from 'react';
import { Client, Antenna, Payment } from '@/api/entities';
import { Users, Radio, CreditCard, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import useCurrentUser from '@/hooks/useCurrentUser';
import ErrorState from '@/Components/ErrorState';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2 text-foreground">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { user, isAdmin } = useCurrentUser();
  const [stats, setStats] = useState({ clients: 0, antennas: 0, payments: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const [clients, antennas, payments] = await Promise.all([
          Client.list(),
          Antenna.list(),
          Payment.list(),
        ]);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const paidThisMonth = payments.filter(p => p.month === currentMonth && p.year === currentYear);
        const pendingCount = clients.filter(c => c.status === 'Activo').length - paidThisMonth.length;

        setStats({
          clients: clients.length,
          antennas: antennas.length,
          payments: paidThisMonth.length,
          pending: Math.max(0, pendingCount),
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (error) return <ErrorState message={error} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Bienvenido, {user?.full_name || 'Usuario'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'Panel de administración' : 'Panel de técnico'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Clientes"
          value={stats.clients}
          color="bg-accent text-accent-foreground"
          to="/clientes"
        />
        <StatCard
          icon={Radio}
          label="Antenas"
          value={stats.antennas}
          color="bg-green-50 text-green-600"
          to="/antenas"
        />
        <StatCard
          icon={CreditCard}
          label="Pagos este mes"
          value={stats.payments}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pagos pendientes"
          value={stats.pending}
          color="bg-orange-50 text-orange-600"
        />
      </div>
    </div>
  );
}
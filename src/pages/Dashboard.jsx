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

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const REVENUE_CHART_HEIGHT = 140;

function buildRevenueSeries(payments) {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const totals = new Map();
  for (const p of payments) {
    const key = `${p.year}-${p.month}`;
    totals.set(key, (totals.get(key) || 0) + Number(p.amount || 0));
  }
  return months.map(({ year, month }) => ({
    label: `${MONTHS_SHORT[month - 1]} ${String(year).slice(2)}`,
    total: totals.get(`${year}-${month}`) || 0,
  }));
}

function RevenueChart({ data }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-6">
        Ingresos mensuales (últimos 12 meses)
      </h3>
      <div className="flex items-end gap-2" style={{ height: REVENUE_CHART_HEIGHT }}>
        {data.map((d, i) => {
          const barHeight = d.total > 0 ? Math.max((d.total / max) * REVENUE_CHART_HEIGHT, 4) : 2;
          return (
            <div key={i} className="flex-1 h-full flex flex-col items-center justify-end group relative">
              <div className="absolute -top-2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium bg-foreground text-background px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-10">
                ${d.total.toLocaleString('es-MX')}
              </div>
              <div className="w-full rounded-t-md bg-[hsl(var(--chart-1))]" style={{ height: barHeight }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground">{d.label}</span>
        ))}
      </div>
    </div>
  );
}

const STATUS_ITEMS = [
  { key: 'Activo', label: 'Activos', color: 'bg-green-500' },
  { key: 'Suspendido', label: 'Suspendidos', color: 'bg-yellow-500' },
  { key: 'Cancelado', label: 'Cancelados', color: 'bg-red-500' },
];

function StatusBreakdown({ counts, total }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Clientes por estado</h3>
      {STATUS_ITEMS.map(({ key, label, color }) => {
        const count = counts[key] || 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-foreground">{label}</span>
              <span className="text-muted-foreground">{count} ({pct}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { user, isAdmin } = useCurrentUser();
  const [stats, setStats] = useState({ clients: 0, antennas: 0, payments: 0, pending: 0 });
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
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
        setRevenueSeries(buildRevenueSeries(payments));
        setStatusCounts(clients.reduce((acc, c) => {
          const key = STATUS_ITEMS.some(s => s.key === c.status) ? c.status : 'Activo';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}));
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart data={revenueSeries} />
        <StatusBreakdown counts={statusCounts} total={stats.clients} />
      </div>
    </div>
  );
}
import {
  Card,
  Building2,
  Eye,
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
} from '@propieya/ui'

const STATS = [
  {
    label: 'Propiedades activas',
    value: '24',
    change: '+2',
    trend: 'up',
    icon: Building2,
  },
  {
    label: 'Visitas este mes',
    value: '1,234',
    change: '+12%',
    trend: 'up',
    icon: Eye,
  },
  {
    label: 'Leads nuevos',
    value: '18',
    change: '+5',
    trend: 'up',
    icon: Users,
  },
  {
    label: 'Consultas pendientes',
    value: '7',
    change: '-3',
    trend: 'down',
    icon: MessageSquare,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary">
          Resumen de tu actividad en Propieya
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-brand-primary/10">
                <stat.icon className="h-5 w-5 text-brand-primary" />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-semantic-success' : 'text-semantic-error'
                }`}
              >
                {stat.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {stat.change}
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
              <p className="text-sm text-text-secondary">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="font-semibold text-text-primary mb-4">
            Últimos leads
          </h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary"
              >
                <div className="h-10 w-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-brand-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    Consulta por Depto 3 amb
                  </p>
                  <p className="text-xs text-text-tertiary">Hace 2 horas</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold text-text-primary mb-4">
            Propiedades más vistas
          </h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary"
              >
                <div className="h-10 w-14 rounded bg-surface-elevated" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    Depto 2 amb en Palermo
                  </p>
                  <p className="text-xs text-text-tertiary">145 visitas</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

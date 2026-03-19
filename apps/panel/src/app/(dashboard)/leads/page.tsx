import { Card, Badge, Mail, Phone, Calendar, Building2 } from '@propieya/ui'

type LeadStatus = 'new' | 'contacted' | 'qualified'

interface MockLead {
  id: string
  name: string
  email: string
  phone: string
  property: string
  status: LeadStatus
  createdAt: string
  message: string
}

const MOCK_LEADS: MockLead[] = [
  {
    id: '1',
    name: 'María García',
    email: 'maria@email.com',
    phone: '+54 11 1234-5678',
    property: 'Departamento 3 amb en Palermo',
    status: 'new',
    createdAt: '2024-03-18 14:30',
    message: 'Hola, me interesa el departamento. ¿Cuándo podría visitarlo?',
  },
  {
    id: '2',
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    phone: '+54 11 9876-5432',
    property: 'Casa con jardín en Olivos',
    status: 'contacted',
    createdAt: '2024-03-17 10:15',
    message: 'Quisiera más información sobre la casa. ¿Acepta permutas?',
  },
  {
    id: '3',
    name: 'Ana López',
    email: 'ana.lopez@email.com',
    phone: '+54 11 5555-1234',
    property: 'Departamento 3 amb en Palermo',
    status: 'qualified',
    createdAt: '2024-03-16 09:00',
    message: 'Busco un 3 ambientes para comprar. Tengo preaprobado bancario.',
  },
]

const STATUS_MAP: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  new: { label: 'Nuevo', variant: 'default' },
  contacted: { label: 'Contactado', variant: 'secondary' },
  qualified: { label: 'Calificado', variant: 'outline' },
}

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
        <p className="text-text-secondary">
          Consultas recibidas por tus propiedades
        </p>
      </div>

      <div className="grid gap-4">
        {MOCK_LEADS.map((lead) => (
          <Card key={lead.id} className="p-4">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Lead info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {lead.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-text-secondary">
                      <Building2 className="h-4 w-4" />
                      {lead.property}
                    </div>
                  </div>
                  <Badge variant={STATUS_MAP[lead.status].variant}>
                    {STATUS_MAP[lead.status].label}
                  </Badge>
                </div>

                <p className="text-sm text-text-secondary bg-surface-secondary p-3 rounded-lg">
                  "{lead.message}"
                </p>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary"
                  >
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </a>
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 text-text-secondary hover:text-brand-primary"
                  >
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </a>
                  <span className="flex items-center gap-1.5 text-text-tertiary">
                    <Calendar className="h-4 w-4" />
                    {lead.createdAt}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

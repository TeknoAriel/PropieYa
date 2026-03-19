import { z } from 'zod'

export const createLeadSchema = z.object({
  listingId: z.string().uuid(),
  contact: z.object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
    preferredContact: z.enum(['email', 'phone', 'whatsapp']).default('email'),
  }),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres').max(2000),
  useGeneratedMessage: z.boolean().default(false),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
})

export const updateLeadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost', 'archived']),
  note: z.string().max(1000).optional(),
})

export const addLeadNoteSchema = z.object({
  content: z.string().min(1).max(2000),
  isPrivate: z.boolean().default(false),
})

export const rateLeadSchema = z.object({
  quality: z.number().int().min(1).max(5),
  relevance: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
})

export const leadFiltersSchema = z.object({
  status: z
    .enum(['new', 'contacted', 'qualified', 'negotiating', 'converted', 'lost', 'archived'])
    .optional(),
  listingId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  intentLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
export type AddLeadNoteInput = z.infer<typeof addLeadNoteSchema>
export type RateLeadInput = z.infer<typeof rateLeadSchema>
export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>

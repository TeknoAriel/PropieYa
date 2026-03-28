import { z } from 'zod'

import { ACCOUNT_INTENT_VALUES } from '../constants/account-intent'

export const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
      .regex(/[0-9]/, 'La contraseña debe tener al menos un número'),
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    phone: z.string().optional(),
    accountIntent: z.enum(ACCOUNT_INTENT_VALUES).default('seeker'),
    /** Obligatorio si accountIntent === agency_publisher */
    organizationName: z.string().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.accountIntent === 'agency_publisher' &&
      (!data.organizationName || data.organizationName.trim().length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá el nombre de la inmobiliaria (mínimo 2 caracteres)',
        path: ['organizationName'],
      })
    }
  })

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe tener al menos un número'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
})

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  displayMode: z.enum(['simple', 'professional']).optional(),
  emailNotifications: z
    .object({
      newListings: z.boolean(),
      priceChanges: z.boolean(),
      leadUpdates: z.boolean(),
      marketing: z.boolean(),
    })
    .optional(),
  pushNotifications: z.boolean().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

'use client'

import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@propieya/ui'

import { trpc } from '@/lib/trpc'

const PACKS = [
  { id: 'p5' as const, credits: 5, hint: 'Ideal para probar' },
  { id: 'p15' as const, credits: 15, hint: 'Mejor precio por lead' },
  { id: 'p50' as const, credits: 50, hint: 'Alto volumen' },
]

type LeadCreditsPurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si la compra simulada no está permitida en servidor */
  simulatedAllowed: boolean
  onPurchased?: () => void
  /** Al cerrar sin completar compra (tracking abandono). */
  onDismissTrack?: () => void
}

export function LeadCreditsPurchaseDialog({
  open,
  onOpenChange,
  simulatedAllowed,
  onPurchased,
  onDismissTrack,
}: LeadCreditsPurchaseDialogProps) {
  const [selected, setSelected] = useState<(typeof PACKS)[number]['id']>('p15')
  const utils = trpc.useUtils()

  const purchase = trpc.organization.purchaseLeadCreditsPack.useMutation({
    onSuccess: async () => {
      await utils.organization.leadMonetizationSummary.invalidate()
      onPurchased?.()
      onOpenChange(false)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && open) {
          onDismissTrack?.()
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comprar créditos de activación</DialogTitle>
          <DialogDescription>
            Cada crédito desbloquea un lead pendiente: ves email, teléfono y mensaje completo.{' '}
            {simulatedAllowed ? (
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                Modo simulado: no hay cobro real; los créditos se suman al instante.
              </span>
            ) : (
              <span>
                La compra simulada no está activa en este entorno. Contactá soporte o configurá el
                checkout.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {PACKS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                selected === p.id
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-border hover:bg-surface-secondary'
              }`}
            >
              <div className="font-medium text-text-primary">
                {p.credits} créditos
              </div>
              <div className="text-xs text-text-tertiary">{p.hint}</div>
            </button>
          ))}
        </div>

        {purchase.error?.message ? (
          <p className="text-sm text-red-600" role="alert">
            {purchase.error.message}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!simulatedAllowed || purchase.isPending}
            onClick={() => purchase.mutate({ packId: selected })}
          >
            {purchase.isPending ? 'Procesando…' : 'Confirmar (simulado)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

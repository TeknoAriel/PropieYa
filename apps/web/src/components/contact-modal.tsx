'use client'

import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
} from '@propieya/ui'

import { trpc } from '@/lib/trpc'

interface ContactModalProps {
  listingId: string
  listingTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({
  listingId,
  listingTitle,
  open,
  onOpenChange,
}: ContactModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const [success, setSuccess] = useState(false)
  const createLead = trpc.lead.create.useMutation({
    onSuccess: () => {
      setSuccess(true)
      setName('')
      setEmail('')
      setMessage('')
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 1500)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createLead.mutate({ listingId, contactName: name, contactEmail: email, message })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contactar por esta propiedad</DialogTitle>
          <DialogDescription>
            {success
              ? 'Gracias, te contactaremos a la brevedad.'
              : `Dejá tu mensaje y te responderán a la brevedad. Aviso: ${listingTitle}`}
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <p className="py-4 text-center text-text-secondary">✓ Mensaje enviado correctamente</p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contact-name">Nombre</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              required
              maxLength={255}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              maxLength={255}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contact-message">Mensaje</Label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribí tu consulta..."
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full min-h-[100px] rounded-lg border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0"
            />
          </div>
          {createLead.error && (
            <p className="text-sm text-semantic-error">{createLead.error.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useEffect, useState } from 'react'

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
import { formatTrpcUserMessage, PORTAL_LISTING_UX_COPY as L } from '@propieya/shared'

import { trpc } from '@/lib/trpc'

interface ContactModalProps {
  listingId: string
  listingTitle: string
  listingExternalId?: string | null
  assignedContact?: {
    id: string | null
    full_name: string | null
    email: string | null
    phone: string | null
    phone_whatsapp: string | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactModal({
  listingId,
  listingTitle,
  listingExternalId,
  assignedContact,
  open,
  onOpenChange,
}: ContactModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [success, setSuccess] = useState(false)
  const draftKey = `propieya:lead-draft:${listingId}`

  const createLead = trpc.lead.create.useMutation({
    onSuccess: () => {
      try {
        localStorage.removeItem(draftKey)
      } catch {
        /* ignore */
      }
      setSuccess(true)
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 1500)
    },
  })

  useEffect(() => {
    if (!open) return
    try {
      const raw = localStorage.getItem(draftKey)
      if (!raw) return
      const p = JSON.parse(raw) as {
        name?: string
        email?: string
        phone?: string
        message?: string
      }
      if (typeof p.name === 'string') setName(p.name)
      if (typeof p.email === 'string') setEmail(p.email)
      if (typeof p.phone === 'string') setPhone(p.phone)
      if (typeof p.message === 'string') setMessage(p.message)
    } catch {
      /* ignore */
    }
  }, [open, draftKey])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ name, email, phone, message })
        )
      } catch {
        /* private mode / quota */
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [open, draftKey, name, email, phone, message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const pageUrl = typeof window !== 'undefined' ? window.location.href : undefined
    createLead.mutate({
      listingId,
      contactName: name,
      contactEmail: email,
      contactPhone: phone.trim() ? phone.trim() : undefined,
      message,
      pageUrl,
      propertyCode: listingExternalId ?? undefined,
      assignedUserId: assignedContact?.id ?? undefined,
      assignedUserName: assignedContact?.full_name ?? undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{success ? L.modalSuccessTitle : L.modalTitle}</DialogTitle>
          {success ? (
            <DialogDescription>{L.modalSuccessBody}</DialogDescription>
          ) : (
            <>
              <DialogDescription>{L.modalDescriptionIdle}</DialogDescription>
              <p className="mt-2 rounded-lg border border-brand-accent/25 bg-brand-secondary/40 px-3 py-2 text-xs leading-relaxed text-text-secondary">
                {L.modalExpectationLine}
              </p>
              <p className="mt-3 text-sm font-medium leading-snug text-text-primary">
                {listingTitle}
              </p>
            </>
          )}
        </DialogHeader>
        {success ? (
          <p className="py-4 text-center text-sm font-medium text-semantic-success">
            ✓ {L.modalSentOk}
          </p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contact-name">{L.modalNameLabel}</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.modalNamePlaceholder}
              required
              maxLength={255}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contact-email">{L.modalEmailLabel}</Label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={L.modalEmailPlaceholder}
              required
              maxLength={255}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contact-phone">Teléfono (opcional)</Label>
            <Input
              id="contact-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+54 9 11 1234-5678"
              maxLength={50}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="contact-message">{L.modalMessageLabel}</Label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={L.modalMessagePlaceholder}
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="mt-1 w-full min-h-[100px] rounded-lg border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-0"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-text-tertiary">{L.contactModalInternalNote}</p>
          <p className="text-[11px] leading-relaxed text-text-tertiary">{L.contactModalDraftHint}</p>
          {createLead.error && (
            <p className="text-sm text-semantic-error" role="alert">
              {formatTrpcUserMessage(createLead.error)}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {L.modalCancel}
            </Button>
            <Button type="submit" className="font-semibold sm:min-w-[11rem]" disabled={createLead.isPending}>
              {createLead.isPending ? L.modalSubmitPending : L.modalSubmit}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

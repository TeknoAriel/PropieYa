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
import { PORTAL_LISTING_UX_COPY as L } from '@propieya/shared'

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
          <DialogTitle>{success ? L.modalSuccessTitle : L.modalTitle}</DialogTitle>
          <DialogDescription>
            {success
              ? L.modalSuccessBody
              : `${L.modalDescriptionIdle} ${listingTitle}`}
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <p className="py-4 text-center text-text-secondary">✓ {L.modalSentOk}</p>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs leading-relaxed text-text-tertiary">
            {L.contactModalInternalNote}
          </p>
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
          {createLead.error && (
            <p className="text-sm text-semantic-error">{createLead.error.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {L.modalCancel}
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? L.modalSubmitPending : L.modalSubmit}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

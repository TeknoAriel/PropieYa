'use client'

import { useMemo, useState } from 'react'

import { Button, Input, Label } from '@propieya/ui'

const SUBJECT_PREFIX = 'Consulta Propieya (portal)'

function buildMailtoHref(email: string, name: string, fromEmail: string, message: string): string {
  const subject = encodeURIComponent(`${SUBJECT_PREFIX}`)
  const body = encodeURIComponent(
    `Nombre: ${name}\nEmail: ${fromEmail}\n\n${message}`
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
}

type ContactoFormProps = {
  /** Si no hay correo público, solo mostramos ayuda para copiar el texto. */
  contactEmail?: string
}

export function ContactoForm({ contactEmail }: ContactoFormProps) {
  const [name, setName] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [message, setMessage] = useState('')

  const mailtoHref = useMemo(() => {
    const to = contactEmail?.trim()
    if (!to || !name.trim() || !fromEmail.trim() || message.trim().length < 10) return null
    return buildMailtoHref(to, name.trim(), fromEmail.trim(), message.trim())
  }, [contactEmail, name, fromEmail, message])

  const plainBody = useMemo(
    () => `Nombre: ${name}\nEmail: ${fromEmail}\n\n${message}`,
    [name, fromEmail, message]
  )

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-surface-secondary/40 p-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (mailtoHref) window.location.href = mailtoHref
      }}
    >
      <div>
        <Label htmlFor="contacto-nombre">Nombre</Label>
        <Input
          id="contacto-nombre"
          className="mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cómo te llamamos"
          maxLength={120}
          autoComplete="name"
        />
      </div>
      <div>
        <Label htmlFor="contacto-email">Tu email</Label>
        <Input
          id="contacto-email"
          type="email"
          className="mt-1"
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="para responderte"
          maxLength={255}
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="contacto-mensaje">Mensaje</Label>
        <textarea
          id="contacto-mensaje"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Contanos en qué podemos ayudarte…"
          minLength={10}
          maxLength={4000}
          rows={5}
          className="mt-1 w-full rounded-lg border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        />
      </div>
      {contactEmail?.trim() ? (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!mailtoHref}>
            Abrir en tu correo
          </Button>
          <p className="w-full text-xs text-text-tertiary">
            Se abre tu cliente de email con el mensaje listo. Si no pasa nada, revisá que tengas
            configurado un programa de correo o probá copiar el texto abajo.
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          Cuando configuremos el correo público, este formulario armará el mensaje automáticamente.
          Mientras tanto podés copiar el texto.
        </p>
      )}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-text-secondary mb-1">Copiar mensaje</p>
        <pre className="max-h-40 overflow-auto rounded-md bg-surface-elevated p-3 text-xs text-text-primary whitespace-pre-wrap">
          {plainBody.trim() || '…'}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => {
            void navigator.clipboard.writeText(plainBody.trim())
          }}
        >
          Copiar al portapapeles
        </Button>
      </div>
    </form>
  )
}

/**
 * Envío de emails vía Resend.
 * Si RESEND_API_KEY no está configurado, no se envían emails (silent no-op).
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.EMAIL_FROM ?? 'Propieya <noreply@propieya.com>'

export async function sendExpiringSoonEmail(params: {
  to: string
  listingTitle: string
  renewUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'Resend no configurado' }
  }

  const subject = `Tu aviso "${params.listingTitle}" está por vencer`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin-bottom: 16px;">Aviso por vencer</h1>
  <p>Tu publicación <strong>${escapeHtml(params.listingTitle)}</strong> está próxima a vencer.</p>
  <p>Para mantenerla activa, renovala desde tu panel:</p>
  <p style="margin: 24px 0;">
    <a href="${escapeHtml(params.renewUrl)}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Renovar aviso</a>
  </p>
  <p style="font-size: 0.875rem; color: #666;">Si no renovás a tiempo, el aviso se suspenderá automáticamente.</p>
  <p style="font-size: 0.875rem; color: #666; margin-top: 32px;">— Propieya</p>
</body>
</html>
`.trim()

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject,
      html,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

export async function sendNewLeadEmail(params: {
  to: string
  listingTitle: string
  contactName: string
  contactEmail: string
  message: string
  panelLeadsUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: 'Resend no configurado' }
  }

  const subject = `Nuevo lead: ${params.listingTitle}`
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin-bottom: 16px;">Nuevo lead</h1>
  <p>Recibiste un mensaje por tu aviso <strong>${escapeHtml(params.listingTitle)}</strong>.</p>
  <p><strong>De:</strong> ${escapeHtml(params.contactName)} (${escapeHtml(params.contactEmail)})</p>
  <p><strong>Mensaje:</strong></p>
  <p style="background: #f3f4f6; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(params.message)}</p>
  <p style="margin: 24px 0;">
    <a href="${escapeHtml(params.panelLeadsUrl)}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Ver leads en el panel</a>
  </p>
  <p style="font-size: 0.875rem; color: #666; margin-top: 32px;">— Propieya</p>
</body>
</html>
`.trim()

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject,
      html,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** URL pública del panel (publicadores). Sin barra final. */
export function getPanelPublicUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_PANEL_URL?.trim() ||
    'https://propieya-panel.vercel.app'
  return raw.replace(/\/$/, '')
}

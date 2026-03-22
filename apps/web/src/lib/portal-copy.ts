import {
  resolvePortalCopyPack,
  type PortalCopyPack,
  type PortalCopyPackId,
} from '@propieya/shared'

export function getPortalPackId(): PortalCopyPackId {
  return resolvePortalCopyPack(process.env.NEXT_PUBLIC_PORTAL_COPY_PACK).id
}

export function getPortalPack(): PortalCopyPack {
  return resolvePortalCopyPack(process.env.NEXT_PUBLIC_PORTAL_COPY_PACK)
}

export function showCopyPackLabel(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_COPY_PACK_LABEL === '1'
}

export function isMagicLinkTestMode(): boolean {
  const v = process.env.MAGIC_LINK_TEST_MODE?.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

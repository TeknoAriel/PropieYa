'use client'

import Image from 'next/image'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { ListingMedia } from '@propieya/shared'

const SWIPE_PX = 48

function NavChevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === 'left' ? (
        <path d="M15 6L9 12l6 6" />
      ) : (
        <path d="M9 6l6 6-6 6" />
      )}
    </svg>
  )
}

type ListingImageGalleryProps = {
  images: ListingMedia[]
  listingTitle: string
}

export function ListingImageGallery({ images, listingTitle }: ListingImageGalleryProps) {
  const n = images.length
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const thumbRowRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const lightboxTouchStartX = useRef<number | null>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const lastInteractionWasSwipe = useRef(false)
  const labelId = useId()

  const safeIndex = n > 0 ? Math.min(activeIndex, n - 1) : 0
  const current = n > 0 ? images[safeIndex] : null

  const goPrev = useCallback(() => {
    if (n < 2) return
    setActiveIndex((i) => (i - 1 + n) % n)
  }, [n])

  const goNext = useCallback(() => {
    if (n < 2) return
    setActiveIndex((i) => (i + 1) % n)
  }, [n])

  useEffect(() => {
    if (activeIndex >= n && n > 0) {
      setActiveIndex(0)
    }
  }, [activeIndex, n])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setLightboxOpen(false)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, goPrev, goNext])

  useEffect(() => {
    if (!lightboxOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lightboxOpen])

  useEffect(() => {
    if (lightboxOpen) {
      closeBtnRef.current?.focus()
    }
  }, [lightboxOpen])

  useEffect(() => {
    if (!thumbRowRef.current || n < 2) return
    const el = thumbRowRef.current.querySelector<HTMLElement>(`[data-thumb-index="${safeIndex}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [safeIndex, n])

  const onMainTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onMainTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return
    const endX = e.changedTouches[0]?.clientX
    if (endX == null) {
      touchStartX.current = null
      return
    }
    const dx = endX - touchStartX.current
    touchStartX.current = null
    if (n < 2 || Math.abs(dx) < SWIPE_PX) return
    lastInteractionWasSwipe.current = true
    window.setTimeout(() => {
      lastInteractionWasSwipe.current = false
    }, 450)
    if (dx > 0) goPrev()
    else goNext()
  }

  const onMainImageClick = () => {
    if (lastInteractionWasSwipe.current) return
    setLightboxOpen(true)
  }

  const onLbTouchStart = (e: React.TouchEvent) => {
    lightboxTouchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onLbTouchEnd = (e: React.TouchEvent) => {
    if (lightboxTouchStartX.current == null || n < 2) {
      lightboxTouchStartX.current = null
      return
    }
    const endX = e.changedTouches[0]?.clientX
    if (endX == null) {
      lightboxTouchStartX.current = null
      return
    }
    const dx = endX - lightboxTouchStartX.current
    lightboxTouchStartX.current = null
    if (Math.abs(dx) < SWIPE_PX) return
    if (dx > 0) goPrev()
    else goNext()
  }

  if (!n || !current) return null

  return (
    <>
      <div className="space-y-0">
        <div
          className="relative aspect-[4/3] w-full max-h-[min(70vh,560px)] min-h-[200px] bg-surface-secondary sm:aspect-[16/9] sm:max-h-[min(62vh,520px)]"
          onTouchStart={onMainTouchStart}
          onTouchEnd={onMainTouchEnd}
        >
          <Image
            src={current.url}
            alt={current.alt ?? listingTitle}
            fill
            priority={safeIndex === 0}
            sizes="(max-width: 1024px) 100vw, min(1200px, 100vw)"
            className="object-cover"
            unoptimized
          />
          {n > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white/50 sm:left-3 sm:h-12 sm:w-12"
                aria-label="Foto anterior"
              >
                <NavChevron dir="left" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-3 sm:h-12 sm:w-12"
                aria-label="Foto siguiente"
              >
                <NavChevron dir="right" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onMainImageClick()
            }}
            className="absolute inset-0 z-[1] flex cursor-zoom-in items-end justify-end p-2 sm:p-3"
            aria-label={`Ver galería en grande, foto ${safeIndex + 1} de ${n}`}
          />
          <div className="pointer-events-none absolute bottom-2 right-2 z-[2] sm:bottom-3 sm:right-3">
            <span className="inline-block rounded-md bg-black/55 px-2.5 py-1 text-xs font-medium text-white/95 shadow-sm backdrop-blur-sm">
              {safeIndex + 1} / {n}
            </span>
          </div>
        </div>

        {n > 1 ? (
          <div
            ref={thumbRowRef}
            className="flex gap-2 overflow-x-auto border-t border-border/40 bg-surface-primary px-2 py-2.5 [scrollbar-gutter:stable] sm:gap-2.5 sm:px-3 sm:py-3"
            role="tablist"
            aria-label="Miniaturas de la galería"
          >
            {images.map((img, idx) => {
              const isActive = idx === safeIndex
              return (
                <button
                  key={img.id}
                  type="button"
                  data-thumb-index={idx}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-[4.5rem] sm:w-[4.5rem] ${
                    isActive
                      ? 'border-brand-primary ring-2 ring-brand-primary/30'
                      : 'border-border/50 opacity-90 hover:border-border hover:opacity-100'
                  } `}
                >
                  <Image
                    src={img.url}
                    alt={img.alt ?? `${listingTitle} — foto ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 72px, 80px"
                    className="object-cover"
                    unoptimized
                  />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="border-t border-border/40 bg-surface-primary px-3 py-2 text-center text-xs text-text-tertiary">
            1 foto
          </div>
        )}
      </div>

      {lightboxOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-black/95"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
              <p id={labelId} className="text-sm font-medium text-white/95">
                Galería · {safeIndex + 1} / {n}
              </p>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="flex h-10 min-w-[2.5rem] items-center justify-center rounded-md text-sm font-medium text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Cerrar galería"
              >
                Cerrar
              </button>
            </div>
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-2 sm:px-6"
              onClick={() => setLightboxOpen(false)}
              onTouchStart={onLbTouchStart}
              onTouchEnd={onLbTouchEnd}
            >
              {n > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      goPrev()
                    }}
                    className="absolute left-1 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20 sm:left-4"
                    aria-label="Foto anterior"
                  >
                    <NavChevron dir="left" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      goNext()
                    }}
                    className="absolute right-1 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20 sm:right-4"
                    aria-label="Foto siguiente"
                  >
                    <NavChevron dir="right" />
                  </button>
                </>
              ) : null}
              <div
                className="relative h-[min(85dvh,100vw)] w-full max-w-6xl shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={current.url}
                  alt={current.alt ?? listingTitle}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            {n > 1 ? (
              <div className="max-h-[30vh] shrink-0 overflow-x-auto border-t border-white/10 bg-black/40 px-2 py-2">
                <div className="flex w-max min-w-full justify-center gap-2 sm:gap-2.5">
                  {images.map((img, idx) => {
                    const isActive = idx === safeIndex
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 sm:h-16 sm:w-16 ${
                          isActive ? 'border-white' : 'border-white/20 opacity-80 hover:opacity-100'
                        }`}
                        aria-label={`Foto ${idx + 1}`}
                        aria-current={isActive}
                      >
                        <Image
                          src={img.url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          unoptimized
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>,
          document.body
        )}
    </>
  )
}

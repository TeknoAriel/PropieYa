/**
 * Breakpoints responsive (mismos que Tailwind)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

/**
 * Temas de color
 */
export const THEMES = {
  light: 'light',
  dark: 'dark',
  system: 'system',
} as const

/**
 * Modos de visualización
 */
export const DISPLAY_MODES = {
  simple: 'simple',
  professional: 'professional',
} as const

/**
 * Design tokens - Colores base
 * Estos se mapean a CSS custom properties
 */
export const COLOR_TOKENS = {
  light: {
    // Surfaces
    'surface-primary': '#FAFAF8',
    'surface-secondary': '#F0EDE8',
    'surface-elevated': '#FFFFFF',
    'surface-overlay': 'rgba(0, 0, 0, 0.5)',

    // Text
    'text-primary': '#1A1A1A',
    'text-secondary': '#666660',
    'text-tertiary': '#999994',
    'text-inverse': '#FFFFFF',

    // Brand
    'brand-primary': '#2D6A4F',
    'brand-primary-hover': '#1B4332',
    'brand-secondary': '#95D5B2',
    'brand-accent': '#C17B4A',

    // Semantic
    'semantic-success': '#40916C',
    'semantic-warning': '#E9C46A',
    'semantic-error': '#BC4749',
    'semantic-info': '#577590',

    // Borders
    'border-default': '#E0DDD8',
    'border-strong': '#C4C0BA',
    'border-focus': '#2D6A4F',
  },
  dark: {
    // Surfaces
    'surface-primary': '#1C1C1E',
    'surface-secondary': '#2C2C2E',
    'surface-elevated': '#3A3A3C',
    'surface-overlay': 'rgba(0, 0, 0, 0.7)',

    // Text
    'text-primary': '#F0F0F0',
    'text-secondary': '#A0A0A0',
    'text-tertiary': '#6B6B6B',
    'text-inverse': '#1A1A1A',

    // Brand
    'brand-primary': '#52B788',
    'brand-primary-hover': '#74C69D',
    'brand-secondary': '#1B4332',
    'brand-accent': '#D4956A',

    // Semantic
    'semantic-success': '#52B788',
    'semantic-warning': '#F4D35E',
    'semantic-error': '#E07A5F',
    'semantic-info': '#81B29A',

    // Borders
    'border-default': '#3A3A3C',
    'border-strong': '#545456',
    'border-focus': '#52B788',
  },
} as const

/**
 * Espaciado (basado en 4px)
 */
export const SPACING = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

/**
 * Border radius
 */
export const RADIUS = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const

/**
 * Sombras
 */
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const

/**
 * Transiciones
 */
export const TRANSITIONS = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const

/**
 * Z-index layers
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const

/** Atajos de exploración (home + rail): una sola fuente para evitar duplicar bloques. */
export const HOME_EXPLORE_TYPES: { href: string; label: string; hint: string }[] =
  [
    {
      href: '/buscar?tipo=apartment',
      label: 'Departamentos',
      hint: 'Pisos, PH y monoambientes',
    },
    {
      href: '/buscar?tipo=house',
      label: 'Casas',
      hint: 'Chalets y viviendas',
    },
    {
      href: '/buscar?tipo=land',
      label: 'Terrenos',
      hint: 'Lotes y campos',
    },
    {
      href: '/buscar?tipo=commercial',
      label: 'Locales',
      hint: 'Comercial y oficinas',
    },
  ]

export const HOME_POPULAR_ZONES: { href: string; label: string }[] = [
  { href: '/buscar?barrio=Palermo', label: 'Palermo' },
  { href: '/buscar?barrio=Belgrano', label: 'Belgrano' },
  { href: '/buscar?barrio=Núñez', label: 'Núñez' },
  { href: '/buscar?ciudad=Rosario', label: 'Rosario' },
  { href: '/buscar?ciudad=Córdoba', label: 'Córdoba' },
  { href: '/buscar?ciudad=Mendoza', label: 'Mendoza' },
]

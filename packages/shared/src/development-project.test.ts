import { describe, expect, it } from 'vitest'

import {
  extractDevelopmentProjectName,
  extractLocationHintFromTitle,
  groupListingsIntoDevelopmentProjects,
  isWeakDevelopmentProjectName,
  resolveDevelopmentProjectIdentity,
  type DevelopmentListingRow,
} from './development-project'

function row(
  partial: Partial<DevelopmentListingRow> & Pick<DevelopmentListingRow, 'id' | 'title'>
): DevelopmentListingRow {
  return {
    description: '',
    propertyType: 'development_unit',
    operationType: 'sale',
    priceAmount: 100000,
    priceCurrency: 'USD',
    surfaceTotal: 50,
    surfaceCovered: 45,
    bedrooms: 1,
    bathrooms: 1,
    address: { city: 'Rosario', neighborhood: 'Centro' },
    features: {},
    primaryImageUrl: null,
    externalId: null,
    ...partial,
  }
}

describe('development project naming', () => {
  it('detecta nombres débiles de tipología', () => {
    expect(isWeakDevelopmentProjectName('Departamento')).toBe(true)
    expect(isWeakDevelopmentProjectName('Departamento de 3 dormitorios')).toBe(true)
    expect(isWeakDevelopmentProjectName('MSR Modena SKY')).toBe(false)
    expect(isWeakDevelopmentProjectName('Complejo Habitacional El Colonial')).toBe(false)
  })

  it('extrae Torre / Edificio del título marketing', () => {
    expect(
      extractDevelopmentProjectName(
        '¡Vive en Grande en Torre Firenze! Departamentos de 2 y 3 Ambientes'
      )
    ).toMatch(/Torre Firenze/i)
  })

  it('enriquece identidad débil con ubicación', () => {
    const id = resolveDevelopmentProjectIdentity(
      'Departamento 1 dormitorio en pozo 3 de febrero 2376',
      'Rosario',
      'Centro'
    )
    expect(isWeakDevelopmentProjectName(id.projectName)).toBe(false)
    expect(id.projectName.toLowerCase()).toMatch(/emprendimiento/)
    expect(id.projectKey).not.toMatch(/^departamento\|/i)
  })

  it('extrae hint de calle', () => {
    expect(extractLocationHintFromTitle('Departamento sobre Av San Martin al 200')).toMatch(
      /San Martin/i
    )
  })

  it('no agrupa deptos genéricos de barrios distintos bajo el mismo nombre plano', () => {
    const projects = groupListingsIntoDevelopmentProjects([
      row({
        id: '1',
        title: 'Departamento',
        address: { city: 'Rosario', neighborhood: 'Centro' },
        features: { developmentProjectKey: 'departamento|rosario|centro', developmentProjectName: 'Departamento' },
      }),
      row({
        id: '2',
        title: 'Departamento',
        address: { city: 'Rosario', neighborhood: 'Pichincha' },
        features: {
          developmentProjectKey: 'departamento|rosario|pichincha',
          developmentProjectName: 'Departamento',
        },
      }),
      row({
        id: '3',
        title: '¡Vive en Grande en Torre Firenze! Departamentos de 2 ambientes',
        address: { city: 'Córdoba', neighborhood: 'Nueva Córdoba' },
      }),
    ])
    expect(projects.some((p) => /Torre Firenze/i.test(p.name))).toBe(true)
    expect(projects.every((p) => p.name !== 'Departamento')).toBe(true)
    expect(projects.length).toBeGreaterThanOrEqual(2)
  })
})

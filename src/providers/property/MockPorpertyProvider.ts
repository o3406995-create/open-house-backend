import type {
  PropertyDataProvider,
  PropertySearchCriteria,
  PropertyDTO,
} from "./PropertyDataProvider.js"
import { mockProperties } from "./mock-data/properties.js"

function matchesCriteria(property: PropertyDTO, criteria: PropertySearchCriteria): boolean {
  if (criteria.minBedrooms !== undefined && property.bedrooms < criteria.minBedrooms) {
    return false
  }
  if (criteria.maxBedrooms !== undefined && property.bedrooms > criteria.maxBedrooms) {
    return false
  }
  if (criteria.minBathrooms !== undefined && property.bathrooms < criteria.minBathrooms) {
    return false
  }
  if (criteria.maxBathrooms !== undefined && property.bathrooms > criteria.maxBathrooms) {
    return false
  }
  if (
    criteria.minPrice !== undefined &&
    property.price !== null &&
    property.price < criteria.minPrice
  ) {
    return false
  }
  if (
    criteria.maxPrice !== undefined &&
    property.price !== null &&
    property.price > criteria.maxPrice
  ) {
    return false
  }
  if (
    criteria.propertyType &&
    property.propertyType.toLowerCase() !== criteria.propertyType.toLowerCase()
  ) {
    return false
  }

  return true
}

export const mockPropertyProvider: PropertyDataProvider = {
  search: async (criteria: PropertySearchCriteria): Promise<PropertyDTO[]> => {
    return mockProperties.filter((property) => matchesCriteria(property, criteria))
  },

  getById: async (externalId: string): Promise<PropertyDTO | null> => {
    const property = mockProperties.find((p) => p.externalId === externalId)
    return property ?? null
  },
}
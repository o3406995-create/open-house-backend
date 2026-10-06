import type { PropertyDataProvider } from "./propertyDataProvider.js"
import type { PropertyDTO, PropertySearchCriteria } from "../types/property.js"
import { mockProperties } from "../mock-data/propertyMockData.js"
import { propertyMatchesCriteria } from "../helper/propertyMatchesCriteria.js"

export const mockPropertyProvider: PropertyDataProvider = {
  search: async (criteria: PropertySearchCriteria): Promise<PropertyDTO[]> => {
    return mockProperties.filter((property) => propertyMatchesCriteria(property, criteria))
  },

  getById: async (externalId: string): Promise<PropertyDTO | null> => {
    const property = mockProperties.find((item) => item.externalId === externalId)
    return property ?? null
  },
}

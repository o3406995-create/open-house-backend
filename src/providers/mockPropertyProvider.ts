import type { PropertyDataProvider } from "./propertyDataProvider.js"
import type {
  PropertyDetailDTO,
  PropertySearchCriteria,
  PropertySummaryDTO,
} from "../types/property.js"
import { mockProperties } from "../mock-data/propertyMockData.js"
import { propertyMatchesCriteria } from "../helper/propertyMatchesCriteria.js"
import { toSummary } from "../helper/propertySummary.js"

export const mockPropertyProvider: PropertyDataProvider = {
  search: async (criteria: PropertySearchCriteria): Promise<PropertySummaryDTO[]> => {
    return mockProperties
      .filter((property) => propertyMatchesCriteria(property, criteria))
      .map(toSummary)
  },

  getById: async (externalId: string): Promise<PropertyDetailDTO | null> => {
    const property = mockProperties.find((item) => item.externalId === externalId)
    return property ?? null
  },
}
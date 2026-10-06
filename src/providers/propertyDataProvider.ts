import type { PropertyDTO, PropertySearchCriteria } from "../types/property.js"

export interface PropertyDataProvider {
  search(criteria: PropertySearchCriteria): Promise<PropertyDTO[]>
  getById(externalId: string): Promise<PropertyDTO | null>
}

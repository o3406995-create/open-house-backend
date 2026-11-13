import type {
  PropertyDetailDTO,
  PropertySearchCriteria,
  PropertySummaryDTO,
} from "../types/property.js"

export interface PropertyDataProvider {
  search(criteria: PropertySearchCriteria): Promise<PropertySummaryDTO[]>
  getById(externalId: string): Promise<PropertyDetailDTO | null>
}
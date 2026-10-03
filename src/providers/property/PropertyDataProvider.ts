export interface PropertySearchCriteria {
  latitude: number
  longitude: number
  radiusMeters: number
  startDate?: Date
  endDate?: Date
  minPrice?: number
  maxPrice?: number
  minBedrooms?: number
  maxBedrooms?: number
  minBathrooms?: number
  maxBathrooms?: number
  propertyType?: string
  auctionOnly?: boolean
}

export interface OpenHouseDTO {
  externalId: string
  startDatetime: Date
  endDatetime: Date
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
}

export interface PropertyDTO {
  externalId: string
  source: string
  address: string
  suburb: string
  state: string
  postcode: string
  price: number | null
  displayPrice: string
  bedrooms: number
  bathrooms: number
  propertyType: string
  latitude: number | null
  longitude: number | null
  description: string | null
  listingUrl: string | null
  openHouses: OpenHouseDTO[]
}

export interface PropertyDataProvider {
  search(criteria: PropertySearchCriteria): Promise<PropertyDTO[]>
  getById(externalId: string): Promise<PropertyDTO | null>
}
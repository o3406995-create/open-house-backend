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

export type PropertySource = "domain" | "mock"

export interface OpenHouseDTO {
  externalId: string
  startDatetime: Date
  endDatetime: Date
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
}

// Public professional details of the listing agent, as supplied by the provider.
export interface AgentDTO {
  name: string
  agencyName: string | null
  phone: string | null
  email: string | null
  photoUrl: string | null
}

// Returned by search: only what a list or map marker needs.
export interface PropertySummaryDTO {
  externalId: string
  source: PropertySource
  address: string
  suburb: string
  state: string
  postcode: string
  price: number | null
  displayPrice: string
  bedrooms: number
  bathrooms: number
  carSpaces: number | null
  propertyType: string
  latitude: number | null
  longitude: number | null
  thumbnailUrl: string | null
  openHouses: OpenHouseDTO[]
}

// Returned by the details endpoint: the summary plus everything the details page shows.
export interface PropertyDetailDTO extends PropertySummaryDTO {
  landSizeSqm: number | null
  description: string | null
  listingUrl: string | null
  images: string[]
  agent: AgentDTO | null
}
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

// Public professional details of the listing agent, as supplied by the provider.
export interface AgentDTO {
  name: string
  agencyName: string | null
  phone: string | null
  email: string | null
  photoUrl: string | null
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
  carSpaces: number | null
  landSizeSqm: number | null
  propertyType: string
  latitude: number | null
  longitude: number | null
  description: string | null
  listingUrl: string | null
  images: string[]
  agent: AgentDTO | null
  openHouses: OpenHouseDTO[]
}
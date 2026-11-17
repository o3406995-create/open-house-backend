import type { PropertySource, PropertySummaryDTO } from "../types/property.js"
import { SOURCE_DOMAIN, SOURCE_MOCK, PRICE_WITHHELD_LABEL } from "../constants/domain.js"

// The columns of the local Property table that make up a listing snapshot
export interface PropertySnapshot {
  external_id: string | null
  source: string | null
  address: string
  suburb: string
  state: string
  postcode: string
  price: number | null
  display_price: string | null
  bedrooms: number
  bathrooms: number
  property_type: string
  latitude: number | null
  longitude: number | null
}

function toPropertySource(value: string | null): PropertySource | null {
  return value === SOURCE_DOMAIN || value === SOURCE_MOCK ? value : null
}

// Builds a summary from the stored snapshot. Fields that are not stored locally
// (car spaces, thumbnail, open houses) are empty.
export function snapshotToSummary(snapshot: PropertySnapshot): PropertySummaryDTO | null {
  const source = toPropertySource(snapshot.source)
  if (!snapshot.external_id || !source) return null

  return {
    externalId: snapshot.external_id,
    source,
    address: snapshot.address,
    suburb: snapshot.suburb,
    state: snapshot.state,
    postcode: snapshot.postcode,
    price: snapshot.price,
    displayPrice: snapshot.display_price ?? PRICE_WITHHELD_LABEL,
    bedrooms: snapshot.bedrooms,
    bathrooms: snapshot.bathrooms,
    carSpaces: null,
    propertyType: snapshot.property_type,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    thumbnailUrl: null,
    openHouses: [],
  }
}
import type { PropertyDetailDTO } from "../types/property.js"
import { PROPERTY_STATUS_ACTIVE } from "../constants/savedProperty.js"

// Columns of the local Property table that hold a snapshot of an external listing
export interface PropertyRecordInput {
  external_id: string
  source: string
  address: string
  suburb: string
  state: string
  postcode: string
  price: number | null
  display_price: string
  bedrooms: number
  bathrooms: number
  property_type: string
  latitude: number | null
  longitude: number | null
  description: string | null
  listing_url: string | null
  status: typeof PROPERTY_STATUS_ACTIVE
}

export function toPropertyRecord(detail: PropertyDetailDTO): PropertyRecordInput {
  return {
    external_id: detail.externalId,
    source: detail.source,
    address: detail.address,
    suburb: detail.suburb,
    state: detail.state,
    postcode: detail.postcode,
    // The column is an integer
    price: detail.price === null ? null : Math.round(detail.price),
    display_price: detail.displayPrice,
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    property_type: detail.propertyType,
    latitude: detail.latitude,
    longitude: detail.longitude,
    description: detail.description,
    listing_url: detail.listingUrl,
    status: PROPERTY_STATUS_ACTIVE,
  }
}
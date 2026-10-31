import type { PropertyDetailDTO, PropertySummaryDTO } from "../types/property.js"

// Builds the summary field by field on purpose: if it spread the detail object,
// images and agent would leak into search responses at runtime even though the
// type says otherwise. A new summary field must be added here explicitly.
export function toSummary(detail: PropertyDetailDTO): PropertySummaryDTO {
  return {
    externalId: detail.externalId,
    source: detail.source,
    address: detail.address,
    suburb: detail.suburb,
    state: detail.state,
    postcode: detail.postcode,
    price: detail.price,
    displayPrice: detail.displayPrice,
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    carSpaces: detail.carSpaces,
    propertyType: detail.propertyType,
    latitude: detail.latitude,
    longitude: detail.longitude,
    thumbnailUrl: detail.images[0] ?? null,
    openHouses: detail.openHouses,
  }
}
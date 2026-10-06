import type { PropertyDTO, OpenHouseDTO } from "../types/property.js"

// Shape of a single item returned by Domain's "search" endpoint (only fields we use)
interface DomainSearchListing {
  listing: {
    id: number
    priceDetails?: {
      price?: number
      displayPrice?: string
    }
    propertyDetails: {
      propertyType: string
      bathrooms: number
      bedrooms: number
      suburb: string
      state: string
      postcode: string
      displayableAddress: string
      latitude?: number
      longitude?: number
    }
    summaryDescription?: string
    inspectionSchedule?: {
      times: Array<{
        openingTime: string
        closingTime: string
      }>
    }
    listingSlug: string
  }
}

// Shape returned by Domain's "getById" endpoint (field names differ from search)
interface DomainListingDetail {
  id: number
  propertyTypes?: string[]
  bathrooms: number
  bedrooms: number
  addressParts: {
    suburb: string
    stateAbbreviation: string
    postcode: string
    displayAddress: string
  }
  geoLocation?: {
    latitude: number
    longitude: number
  }
  priceDetails?: {
    price?: number
    displayPrice?: string
  }
  description?: string
  inspectionDetails?: {
    inspections: Array<{
      openingDateTime: string
      closingDateTime: string
    }>
  }
  seoUrl?: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function mapInspectionTimes(
  listingId: string,
  times: Array<{ openingTime: string; closingTime: string }>,
): OpenHouseDTO[] {
  return times.map((time, index) => ({
    externalId: `${listingId}-${index}`,
    startDatetime: new Date(time.openingTime),
    endDatetime: new Date(time.closingTime),
    status: "SCHEDULED",
  }))
}

export function mapSearchResultToDTO(item: DomainSearchListing): PropertyDTO {
  const { listing } = item
  const externalId = String(listing.id)

  return {
    externalId,
    source: "domain",
    address: listing.propertyDetails.displayableAddress,
    suburb: listing.propertyDetails.suburb,
    state: listing.propertyDetails.state,
    postcode: listing.propertyDetails.postcode,
    price: listing.priceDetails?.price ?? null,
    displayPrice: listing.priceDetails?.displayPrice ?? "Price withheld",
    bedrooms: listing.propertyDetails.bedrooms,
    bathrooms: listing.propertyDetails.bathrooms,
    propertyType: listing.propertyDetails.propertyType,
    latitude: listing.propertyDetails.latitude ?? null,
    longitude: listing.propertyDetails.longitude ?? null,
    description: listing.summaryDescription
      ? stripHtml(listing.summaryDescription)
      : null,
    listingUrl: `https://www.domain.com.au/${listing.listingSlug}`,
    openHouses: listing.inspectionSchedule?.times
      ? mapInspectionTimes(externalId, listing.inspectionSchedule.times)
      : [],
  }
}

export function mapDetailToDTO(detail: DomainListingDetail): PropertyDTO {
  const externalId = String(detail.id)

  return {
    externalId,
    source: "domain",
    address: detail.addressParts.displayAddress,
    suburb: detail.addressParts.suburb,
    state: detail.addressParts.stateAbbreviation.toUpperCase(),
    postcode: detail.addressParts.postcode,
    price: detail.priceDetails?.price ?? null,
    displayPrice: detail.priceDetails?.displayPrice ?? "Price withheld",
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    propertyType: detail.propertyTypes?.[0] ?? "Unknown",
    latitude: detail.geoLocation?.latitude ?? null,
    longitude: detail.geoLocation?.longitude ?? null,
    description: detail.description ?? null,
    listingUrl: detail.seoUrl ?? null,
    openHouses: detail.inspectionDetails?.inspections
      ? mapInspectionTimes(
          externalId,
          detail.inspectionDetails.inspections.map((i) => ({
            openingTime: i.openingDateTime,
            closingTime: i.closingDateTime,
          })),
        )
      : [],
  }
}
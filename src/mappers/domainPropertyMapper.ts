import type { PropertyDTO, OpenHouseDTO, AgentDTO } from "../types/property.js"
import { DOMAIN_MEDIA_CATEGORY_IMAGE } from "../constants/property.js"

// NOTE: the media / advertiser / carspaces / land-size fields below are mapped
// defensively (missing => null / []). Verify the exact field names against a real
// Domain response once "Agents & Listings" access is approved.

interface DomainMediaItem {
  category?: string
  type?: string
  url?: string
}

interface DomainAdvertiser {
  name?: string
  contacts?: Array<{
    name?: string
    photoUrl?: string
  }>
}

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
      carspaces?: number
      landArea?: number
      suburb: string
      state: string
      postcode: string
      displayableAddress: string
      latitude?: number
      longitude?: number
    }
    summaryDescription?: string
    media?: DomainMediaItem[]
    advertiser?: DomainAdvertiser
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
  carspaces?: number
  landAreaSqm?: number
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
  media?: DomainMediaItem[]
  advertiser?: DomainAdvertiser
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

function mapImages(media: DomainMediaItem[] | undefined): string[] {
  if (!media) return []

  return media
    .filter(
      (item): item is DomainMediaItem & { url: string } =>
        Boolean(item.url) &&
        (!item.category ||
          item.category.toLowerCase() === DOMAIN_MEDIA_CATEGORY_IMAGE),
    )
    .map((item) => item.url)
}

// Domain's public responses do not expose agent phone/email, so those stay null.
function mapAgent(advertiser: DomainAdvertiser | undefined): AgentDTO | null {
  const contact = advertiser?.contacts?.[0]
  if (!contact?.name) return null

  return {
    name: contact.name,
    agencyName: advertiser?.name ?? null,
    phone: null,
    email: null,
    photoUrl: contact.photoUrl ?? null,
  }
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
    carSpaces: listing.propertyDetails.carspaces ?? null,
    landSizeSqm: listing.propertyDetails.landArea ?? null,
    propertyType: listing.propertyDetails.propertyType,
    latitude: listing.propertyDetails.latitude ?? null,
    longitude: listing.propertyDetails.longitude ?? null,
    description: listing.summaryDescription
      ? stripHtml(listing.summaryDescription)
      : null,
    listingUrl: `https://www.domain.com.au/${listing.listingSlug}`,
    images: mapImages(listing.media),
    agent: mapAgent(listing.advertiser),
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
    carSpaces: detail.carspaces ?? null,
    landSizeSqm: detail.landAreaSqm ?? null,
    propertyType: detail.propertyTypes?.[0] ?? "Unknown",
    latitude: detail.geoLocation?.latitude ?? null,
    longitude: detail.geoLocation?.longitude ?? null,
    description: detail.description ?? null,
    listingUrl: detail.seoUrl ?? null,
    images: mapImages(detail.media),
    agent: mapAgent(detail.advertiser),
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
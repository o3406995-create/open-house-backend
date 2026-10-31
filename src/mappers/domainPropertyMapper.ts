import type {
  AgentDTO,
  OpenHouseDTO,
  PropertyDetailDTO,
  PropertySummaryDTO,
} from "../types/property.js"
import {
  SOURCE_DOMAIN,
  DOMAIN_LISTING_BASE_URL,
  DOMAIN_MEDIA_CATEGORY_IMAGE,
  PRICE_WITHHELD_LABEL,
  UNKNOWN_PROPERTY_TYPE,
} from "../constants/domain.js"
import { toSafeUrl } from "../helper/safeUrl.js"

// NOTE: media / advertiser / carspaces / land-size field names below are unverified
// (Domain access pending). Check them against a real response once approved.
// Everything is mapped defensively: missing data becomes null / [].

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

interface DomainInspectionTime {
  openingTime: string
  closingTime: string
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
      suburb: string
      state: string
      postcode: string
      displayableAddress: string
      latitude?: number
      longitude?: number
    }
    media?: DomainMediaItem[]
    inspectionSchedule?: {
      times: DomainInspectionTime[]
    }
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

// Provider-independent intermediate shapes. Each Domain endpoint is reduced to these,
// then built into a DTO in one place, so a new DTO field is added once.
interface NormalizedSummary {
  id: number
  address: string
  suburb: string
  state: string
  postcode: string
  price?: number | undefined
  displayPrice?: string | undefined
  bedrooms: number
  bathrooms: number
  carSpaces?: number | undefined
  propertyType?: string | undefined
  latitude?: number | undefined
  longitude?: number | undefined
  media?: DomainMediaItem[] | undefined
  inspections: DomainInspectionTime[]
}

interface NormalizedDetail extends NormalizedSummary {
  landSizeSqm?: number | undefined
  description?: string | undefined
  listingUrl?: string | undefined
  advertiser?: DomainAdvertiser | undefined
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

function mapInspectionTimes(
  listingId: string,
  times: DomainInspectionTime[],
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
      (item) =>
        !item.category ||
        item.category.toLowerCase() === DOMAIN_MEDIA_CATEGORY_IMAGE,
    )
    .map((item) => toSafeUrl(item.url, DOMAIN_LISTING_BASE_URL))
    .filter((url): url is string => url !== null)
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
    photoUrl: toSafeUrl(contact.photoUrl, DOMAIN_LISTING_BASE_URL),
  }
}

function toSummaryDTO(listing: NormalizedSummary): PropertySummaryDTO {
  const externalId = String(listing.id)

  return {
    externalId,
    source: SOURCE_DOMAIN,
    address: listing.address,
    suburb: listing.suburb,
    state: listing.state,
    postcode: listing.postcode,
    price: listing.price ?? null,
    displayPrice: listing.displayPrice ?? PRICE_WITHHELD_LABEL,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    carSpaces: listing.carSpaces ?? null,
    propertyType: listing.propertyType ?? UNKNOWN_PROPERTY_TYPE,
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,
    thumbnailUrl: mapImages(listing.media)[0] ?? null,
    openHouses: mapInspectionTimes(externalId, listing.inspections),
  }
}

function toDetailDTO(listing: NormalizedDetail): PropertyDetailDTO {
  return {
    ...toSummaryDTO(listing),
    landSizeSqm: listing.landSizeSqm ?? null,
    description: listing.description ? stripHtml(listing.description) : null,
    listingUrl: toSafeUrl(listing.listingUrl, DOMAIN_LISTING_BASE_URL),
    images: mapImages(listing.media),
    agent: mapAgent(listing.advertiser),
  }
}

export function mapSearchResultToDTO(item: DomainSearchListing): PropertySummaryDTO {
  const { listing } = item
  const details = listing.propertyDetails

  return toSummaryDTO({
    id: listing.id,
    address: details.displayableAddress,
    suburb: details.suburb,
    state: details.state,
    postcode: details.postcode,
    price: listing.priceDetails?.price,
    displayPrice: listing.priceDetails?.displayPrice,
    bedrooms: details.bedrooms,
    bathrooms: details.bathrooms,
    carSpaces: details.carspaces,
    propertyType: details.propertyType,
    latitude: details.latitude,
    longitude: details.longitude,
    media: listing.media,
    inspections: listing.inspectionSchedule?.times ?? [],
  })
}

export function mapDetailToDTO(detail: DomainListingDetail): PropertyDetailDTO {
  return toDetailDTO({
    id: detail.id,
    address: detail.addressParts.displayAddress,
    suburb: detail.addressParts.suburb,
    state: detail.addressParts.stateAbbreviation.toUpperCase(),
    postcode: detail.addressParts.postcode,
    price: detail.priceDetails?.price,
    displayPrice: detail.priceDetails?.displayPrice,
    bedrooms: detail.bedrooms,
    bathrooms: detail.bathrooms,
    carSpaces: detail.carspaces,
    propertyType: detail.propertyTypes?.[0],
    latitude: detail.geoLocation?.latitude,
    longitude: detail.geoLocation?.longitude,
    media: detail.media,
    inspections: (detail.inspectionDetails?.inspections ?? []).map((i) => ({
      openingTime: i.openingDateTime,
      closingTime: i.closingDateTime,
    })),
    landSizeSqm: detail.landAreaSqm,
    description: detail.description,
    listingUrl: detail.seoUrl,
    advertiser: detail.advertiser,
  })
}
import type {
  PropertyDataProvider,
  PropertySearchCriteria,
  PropertyDTO,
} from "./PropertyDataProvider.js"
import { mapSearchResultToDTO, mapDetailToDTO } from "./mappers/domainMapper.js"
import { AppError } from "../../lib/AppError.js"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const AUTH_URL = "https://auth.domain.com.au/v1/connect/token"
const API_BASE_URL = "https://api.domain.com.au/v1"

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }

  const clientId = requireEnv("DOMAIN_CLIENT_ID")
  const clientSecret = requireEnv("DOMAIN_CLIENT_SECRET")

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials&scope=api_listings_read",
  })

  if (!response.ok) {
    throw new AppError("Failed to authenticate with Domain API.", 502)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }

  // Cache the token, expiring 60 seconds early as a safety buffer
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
  }

  return cachedToken.value
}

async function domainFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (response.status === 401) {
    throw new AppError("Domain API authentication failed.", 502)
  }
  if (response.status === 429) {
    throw new AppError("Domain API rate limit exceeded.", 503)
  }
  if (!response.ok) {
    throw new AppError(`Domain API request failed with status ${response.status}.`, 502)
  }

  return response
}

function buildSearchBody(criteria: PropertySearchCriteria) {
  return {
    listingType: "Sale",
    minBedrooms: criteria.minBedrooms,
    maxBedrooms: criteria.maxBedrooms,
    minBathrooms: criteria.minBathrooms,
    maxBathrooms: criteria.maxBathrooms,
    minPrice: criteria.minPrice,
    maxPrice: criteria.maxPrice,
    propertyTypes: criteria.propertyType ? [criteria.propertyType] : undefined,
    inspectionFrom: criteria.startDate?.toISOString(),
    inspectionTo: criteria.endDate?.toISOString(),
    geoWindow: {
      circle: {
        center: { lat: criteria.latitude, lon: criteria.longitude },
        radiusInMeters: criteria.radiusMeters,
      },
    },
  }
}

export const domainPropertyProvider: PropertyDataProvider = {
  search: async (criteria: PropertySearchCriteria): Promise<PropertyDTO[]> => {
    const response = await domainFetch("/listings/residential/_search", {
      method: "POST",
      body: JSON.stringify(buildSearchBody(criteria)),
    })

    const results = (await response.json()) as Array<{ type: string; listing?: unknown }>

    // Only PropertyListing items are handled for now; Project (grouped apartment) results are skipped
    return results
      .filter((item) => item.type === "PropertyListing" && item.listing)
      .map((item) => mapSearchResultToDTO(item as Parameters<typeof mapSearchResultToDTO>[0]))
  },

  getById: async (externalId: string): Promise<PropertyDTO | null> => {
    const response = await domainFetch(`/listings/${externalId}`)

    if (response.status === 404) {
      return null
    }

    const detail = await response.json()
    return mapDetailToDTO(detail as Parameters<typeof mapDetailToDTO>[0])
  },
}
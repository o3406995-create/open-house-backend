import { AppError } from "../lib/AppError.js"
import { domainPropertyProvider } from "../providers/domainPropertyProvider.js"
import { mockPropertyProvider } from "../providers/mockPropertyProvider.js"
import type { PropertyDataProvider } from "../providers/propertyDataProvider.js"
import type { PropertyDetailDTO, PropertySearchCriteria, PropertySource } from "../types/property.js"
import type { PropertySearchInput } from "../validators/property.validator.js"
import {
  PROPERTY_DATA_SOURCE_ENV,
  PROPERTY_DATA_SOURCE_DOMAIN,
  PROPERTY_ERROR_NOT_FOUND,
} from "../constants/property.js"
import { SOURCE_DOMAIN, SOURCE_MOCK } from "../constants/domain.js"
import { openHouseNotificationService } from "./openHouseNotification.service.js"

function propertyProvider(): PropertyDataProvider {
  if (process.env[PROPERTY_DATA_SOURCE_ENV] === PROPERTY_DATA_SOURCE_DOMAIN) {
    return domainPropertyProvider
  }
  return mockPropertyProvider
}

function toCriteria(input: PropertySearchInput): PropertySearchCriteria {
  return {
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: input.radiusMeters,
    ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
    ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
    ...(input.minPrice !== undefined ? { minPrice: input.minPrice } : {}),
    ...(input.maxPrice !== undefined ? { maxPrice: input.maxPrice } : {}),
    ...(input.minBedrooms !== undefined ? { minBedrooms: input.minBedrooms } : {}),
    ...(input.maxBedrooms !== undefined ? { maxBedrooms: input.maxBedrooms } : {}),
    ...(input.minBathrooms !== undefined ? { minBathrooms: input.minBathrooms } : {}),
    ...(input.maxBathrooms !== undefined ? { maxBathrooms: input.maxBathrooms } : {}),
    ...(input.propertyType !== undefined ? { propertyType: input.propertyType } : {}),
    ...(input.auctionOnly !== undefined ? { auctionOnly: input.auctionOnly } : {}),
  }
}

// Records the open houses a data source just returned, which tells the people who saved the
// property about new ones. A failure is only logged: reading a property must never fail because
// of it.
async function noteOpenHouses(property: PropertyDetailDTO): Promise<void> {
  try {
    await openHouseNotificationService.recordOpenHouses(
      { source: property.source, externalId: property.externalId },
      property.openHouses,
    )
  } catch (err) {
    console.error(`Could not record the open houses of ${property.externalId}:`, err)
  }
}

export const propertyService = {
  search: (input: PropertySearchInput) => {
    return propertyProvider().search(toCriteria(input))
  },

  // The data source the service currently reads from
  getActiveSource: (): PropertySource => {
    return propertyProvider() === domainPropertyProvider ? SOURCE_DOMAIN : SOURCE_MOCK
  },

  // Like getById, but returns null instead of throwing when the listing does not exist
  findById: async (externalId: string) => {
    const property = await propertyProvider().getById(externalId)
    if (property) await noteOpenHouses(property)
    return property
  },

  // Fetches through the active provider on every request. The open houses it returns are also
  // recorded (see noteOpenHouses), before the answer goes back.
  // All open houses are returned; callers group them into past/upcoming themselves.
  getById: async (externalId: string) => {
    const property = await propertyProvider().getById(externalId)
    if (!property) {
      throw new AppError(PROPERTY_ERROR_NOT_FOUND, 404)
    }
    await noteOpenHouses(property)
    return property
  },
}
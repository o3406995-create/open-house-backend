import { AppError } from "../lib/AppError.js"
import { domainPropertyProvider } from "../providers/domainPropertyProvider.js"
import { mockPropertyProvider } from "../providers/mockPropertyProvider.js"
import type { PropertyDataProvider } from "../providers/propertyDataProvider.js"
import type { PropertySearchCriteria } from "../types/property.js"
import type { PropertySearchInput } from "../validators/property.validator.js"

function propertyProvider(): PropertyDataProvider {
  if (process.env.PROPERTY_DATA_SOURCE === "domain") {
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

export const propertyService = {
  search: (input: PropertySearchInput) => {
    return propertyProvider().search(toCriteria(input))
  },

  getById: async (externalId: string) => {
    const property = await propertyProvider().getById(externalId)
    if (!property) {
      throw new AppError("Property not found.", 404)
    }
    return property
  },
}

import type { PropertyDTO, PropertySearchCriteria } from "../types/property.js"
import { distanceInMeters } from "./distance.js"

export function propertyMatchesCriteria(
  property: PropertyDTO,
  criteria: PropertySearchCriteria,
): boolean {
  if (property.latitude !== null && property.longitude !== null) {
    const distance = distanceInMeters(
      criteria.latitude,
      criteria.longitude,
      property.latitude,
      property.longitude,
    )
    if (distance > criteria.radiusMeters) {
      return false
    }
  }

  if (criteria.minBedrooms !== undefined && property.bedrooms < criteria.minBedrooms) {
    return false
  }
  if (criteria.maxBedrooms !== undefined && property.bedrooms > criteria.maxBedrooms) {
    return false
  }
  if (criteria.minBathrooms !== undefined && property.bathrooms < criteria.minBathrooms) {
    return false
  }
  if (criteria.maxBathrooms !== undefined && property.bathrooms > criteria.maxBathrooms) {
    return false
  }
  if (
    criteria.minPrice !== undefined &&
    property.price !== null &&
    property.price < criteria.minPrice
  ) {
    return false
  }
  if (
    criteria.maxPrice !== undefined &&
    property.price !== null &&
    property.price > criteria.maxPrice
  ) {
    return false
  }
  if (
    criteria.propertyType &&
    property.propertyType.toLowerCase() !== criteria.propertyType.toLowerCase()
  ) {
    return false
  }

  return true
}
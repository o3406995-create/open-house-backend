import { savedPropertyRepository } from "../repositories/savedProperty.repository.js"
import { propertyService } from "./property.service.js"
import { AppError } from "../lib/AppError.js"
import { toPropertyRecord, type PropertyRecordInput } from "../mappers/propertyRecordMapper.js"
import { snapshotToSummary } from "../mappers/savedSnapshotMapper.js"
import { toSummary } from "../helper/propertySummary.js"
import { upcomingOpenHouses } from "../helper/openHouses.js"
import { mapWithConcurrency } from "../helper/concurrency.js"
import { isUniqueConstraintError } from "../helper/prismaErrors.js"
import {
  SAVE_PROPERTY_MAX_ATTEMPTS,
  SAVED_PROVIDER_CONCURRENCY,
  SAVED_ERROR_NOT_FOUND,
  LISTING_STATUS,
  type ListingStatus,
} from "../constants/savedProperty.js"
import type { PropertySource, PropertySummaryDTO } from "../types/property.js"

type SavedRecord = Awaited<
  ReturnType<typeof savedPropertyRepository.listForUser>
>["records"][number]

// The unique indexes are the final guard against duplicates. When two requests race and
// one loses (unique constraint error), running the transaction again finds the rows the
// winner committed, so the loser ends up as a normal "already saved" result.
async function saveWithRetry(userId: number, record: PropertyRecordInput) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await savedPropertyRepository.saveForUser(userId, record)
    } catch (err) {
      if (!isUniqueConstraintError(err) || attempt >= SAVE_PROPERTY_MAX_ATTEMPTS) {
        throw err
      }
    }
  }
}

// Shows the freshest data available for one saved property.
async function resolveItem(record: SavedRecord, activeSource: PropertySource) {
  const snapshot = snapshotToSummary(record.property)
  if (!snapshot) return null

  let property: PropertySummaryDTO = snapshot
  let listingStatus: ListingStatus = LISTING_STATUS.UNKNOWN

  // Only listings from the active data source can be looked up again. Asking another
  // source for this id would wrongly report the listing as removed.
  if (snapshot.source === activeSource) {
    try {
      const live = await propertyService.findById(snapshot.externalId)
      if (live) {
        property = toSummary(live)
        listingStatus = LISTING_STATUS.AVAILABLE
      } else {
        listingStatus = LISTING_STATUS.REMOVED
      }
    } catch (err) {
      // One failing lookup must not break the whole list: keep the snapshot
      console.error(`Could not refresh saved property ${snapshot.externalId}:`, err)
    }
  }

  return {
    savedPropertyId: record.saved_property_id,
    savedAt: record.saved_at,
    listingStatus,
    property: { ...property, openHouses: upcomingOpenHouses(property.openHouses) },
  }
}

export const savedPropertyService = {
  save: async (userId: number, externalId: string) => {
    // The listing always comes from the provider, never from the client. Fetched before
    // the transaction so a slow external call never holds a database transaction open.
    // Throws 404 when the property does not exist.
    const detail = await propertyService.getById(externalId)

    const { created, savedProperty } = await saveWithRetry(userId, toPropertyRecord(detail))

    return {
      created,
      savedProperty: {
        savedPropertyId: savedProperty.saved_property_id,
        savedAt: savedProperty.saved_at,
        property: toSummary(detail),
      },
    }
  },

  list: async (userId: number, { page, pageSize }: { page: number; pageSize: number }) => {
    const { records, total } = await savedPropertyRepository.listForUser(userId, page, pageSize)
    const activeSource = propertyService.getActiveSource()

    const resolved = await mapWithConcurrency(
      records,
      SAVED_PROVIDER_CONCURRENCY,
      (record) => resolveItem(record, activeSource),
    )

    return {
      savedProperties: resolved.filter((item) => item !== null),
      total,
      page,
      pageSize,
    }
  },

  remove: async (userId: number, savedPropertyId: number) => {
    const deleted = await savedPropertyRepository.deleteForUser(userId, savedPropertyId)

    // "Does not exist" and "belongs to someone else" look the same on purpose, so ids of
    // other users cannot be probed.
    if (deleted === 0) {
      throw new AppError(SAVED_ERROR_NOT_FOUND, 404)
    }
  },
}
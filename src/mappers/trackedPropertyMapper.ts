import type { OpenHouseDTO } from "../types/property.js"
import { snapshotToSummary, type PropertySnapshot } from "./savedSnapshotMapper.js"

// A tracked property with the property that holds the stored snapshot
export interface TrackedRow {
  tracked_id: number
  created_at: Date
  property: PropertySnapshot
}

// An open house of a property that is still to come
export interface UpcomingOpenHouseRow {
  external_id: string | null
  start_datetime: Date
  end_datetime: Date
  status: OpenHouseDTO["status"]
}

export interface TrackedFigures {
  saveCount: number
  interestCount: number
}

// Null for an open house that has no id at the data source
export function toOpenHouse(row: UpcomingOpenHouseRow): OpenHouseDTO | null {
  if (row.external_id === null) return null

  return {
    externalId: row.external_id,
    startDatetime: row.start_datetime,
    endDatetime: row.end_datetime,
    status: row.status,
  }
}

// Built field by field on purpose: only these fields may leave, and none of them is about a person.
// Null for a row that cannot be matched to an external listing.
export function toTrackedItem(row: TrackedRow, figures: TrackedFigures, openHouses: UpcomingOpenHouseRow[]) {
  const summary = snapshotToSummary(row.property)
  if (!summary) return null

  return {
    trackedId: row.tracked_id,
    addedAt: row.created_at,
    saveCount: figures.saveCount,
    openHouseInterestCount: figures.interestCount,
    property: {
      ...summary,
      openHouses: openHouses.flatMap((openHouse) => toOpenHouse(openHouse) ?? []),
    },
  }
}

export type TrackedItem = NonNullable<ReturnType<typeof toTrackedItem>>

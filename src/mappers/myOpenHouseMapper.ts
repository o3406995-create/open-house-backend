import type { OpenHouseDTO } from "../types/property.js"
import { snapshotToSummary, type PropertySnapshot } from "./savedSnapshotMapper.js"
import { noteSummaryOf, type NoteSummaryRow } from "./noteMapper.js"
import {
  MY_OPEN_HOUSE_GROUP,
  USER_OPEN_HOUSE_STATUS_ATTENDED,
  USER_OPEN_HOUSE_STATUS_EXPIRED,
  type MyOpenHouseGroup,
} from "../constants/myOpenHouse.js"

// A UserOpenHouse row with its open house and the property that holds the stored snapshot
export interface MyOpenHouseRow {
  user_openHouse_id: number
  created_at: Date
  status: string
  // The note of the entry, when the query loaded it
  note?: NoteSummaryRow | null | undefined
  openHouse: {
    external_id: string | null
    start_datetime: Date
    end_datetime: Date
    status: OpenHouseDTO["status"]
    property: PropertySnapshot
  }
}

// Decides where an entry belongs. The first rule that matches wins.
export function groupOf(row: MyOpenHouseRow, now: Date, startOfTomorrow: Date): MyOpenHouseGroup {
  if (row.status === USER_OPEN_HOUSE_STATUS_ATTENDED) {
    return MY_OPEN_HOUSE_GROUP.ATTENDED
  }

  if (
    row.status === USER_OPEN_HOUSE_STATUS_EXPIRED ||
    row.openHouse.end_datetime.getTime() <= now.getTime()
  ) {
    return MY_OPEN_HOUSE_GROUP.EXPIRED
  }

  // It is not over yet: it is today when it starts before tomorrow begins, which includes
  // an open house that is already running
  if (row.openHouse.start_datetime.getTime() < startOfTomorrow.getTime()) {
    return MY_OPEN_HOUSE_GROUP.TODAY
  }

  return MY_OPEN_HOUSE_GROUP.UPCOMING
}

// Returns null for a row that cannot be matched to an external listing
export function toMyOpenHouseItem(row: MyOpenHouseRow, group: MyOpenHouseGroup) {
  const property = snapshotToSummary(row.openHouse.property)
  const externalId = row.openHouse.external_id

  if (!property || externalId === null) return null

  return {
    myOpenHouseId: row.user_openHouse_id,
    addedAt: row.created_at,
    attended: row.status === USER_OPEN_HOUSE_STATUS_ATTENDED,
    group,
    openHouse: {
      externalId,
      startDatetime: row.openHouse.start_datetime,
      endDatetime: row.openHouse.end_datetime,
      status: row.openHouse.status,
    },
    property,
    note: noteSummaryOf(row.note),
  }
}

export type MyOpenHouseItem = NonNullable<ReturnType<typeof toMyOpenHouseItem>>

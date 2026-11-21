import type { OpenHouseDTO } from "../types/property.js"

// Columns of the local OpenHouse table that hold a snapshot of an external open house
// (the property it belongs to is added by the repository)
export interface OpenHouseRecordInput {
  external_id: string
  start_datetime: Date
  end_datetime: Date
  status: OpenHouseDTO["status"]
}

export function toOpenHouseRecord(openHouse: OpenHouseDTO): OpenHouseRecordInput {
  return {
    external_id: openHouse.externalId,
    start_datetime: openHouse.startDatetime,
    end_datetime: openHouse.endDatetime,
    status: openHouse.status,
  }
}

import type { OpenHouseDTO } from "../types/property.js"
import { snapshotToSummary, type PropertySnapshot } from "./savedSnapshotMapper.js"

// A Notification row with its open house and the property that holds the stored snapshot
export interface NotificationRow {
  notification_id: number
  type: string
  message: string
  is_read: boolean
  created_at: Date
  property: PropertySnapshot
  openHouse: {
    external_id: string | null
    start_datetime: Date
    end_datetime: Date
    status: OpenHouseDTO["status"]
  }
}

// Returns null for a row that cannot be matched to an external listing and open house
export function toNotificationItem(row: NotificationRow) {
  const property = snapshotToSummary(row.property)
  const externalId = row.openHouse.external_id

  if (!property || externalId === null) return null

  return {
    notificationId: row.notification_id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    openHouse: {
      externalId,
      startDatetime: row.openHouse.start_datetime,
      endDatetime: row.openHouse.end_datetime,
      status: row.openHouse.status,
    },
    property,
  }
}

export type NotificationItem = NonNullable<ReturnType<typeof toNotificationItem>>

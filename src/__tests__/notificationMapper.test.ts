import { describe, it, expect } from "@jest/globals"
import { toNotificationItem, type NotificationRow } from "../mappers/notificationMapper.js"
import type { PropertySnapshot } from "../mappers/savedSnapshotMapper.js"

const snapshot: PropertySnapshot = {
  external_id: "mock-1",
  source: "mock",
  address: "12 Example Street, Brisbane",
  suburb: "Brisbane",
  state: "QLD",
  postcode: "4000",
  price: 650000,
  display_price: "$650,000",
  bedrooms: 3,
  bathrooms: 2,
  property_type: "House",
  latitude: -27.4698,
  longitude: 153.0251,
}

const CREATED = new Date("2026-11-24T00:00:00.000Z")
const START = new Date("2026-11-26T05:00:00.000Z")
const END = new Date("2026-11-26T05:30:00.000Z")

function row(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    notification_id: 4,
    type: "NEW_OPEN_HOUSE",
    message: "A new open house was added",
    is_read: false,
    created_at: CREATED,
    property: snapshot,
    openHouse: {
      external_id: "mock-1-1",
      start_datetime: START,
      end_datetime: END,
      status: "SCHEDULED",
    },
    ...overrides,
  }
}

describe("toNotificationItem", () => {
  it("describes a notification with its open house and the stored property", () => {
    expect(toNotificationItem(row())).toMatchObject({
      notificationId: 4,
      type: "NEW_OPEN_HOUSE",
      message: "A new open house was added",
      isRead: false,
      createdAt: CREATED,
      openHouse: {
        externalId: "mock-1-1",
        startDatetime: START,
        endDatetime: END,
        status: "SCHEDULED",
      },
      property: { externalId: "mock-1", source: "mock", address: "12 Example Street, Brisbane" },
    })
  })

  it.each(["NEW_OPEN_HOUSE", "PRICE_CHANGE", "STATUS_CHANGE"])("keeps the type %s", (type) => {
    expect(toNotificationItem(row({ type }))?.type).toBe(type)
  })

  it("carries the read state", () => {
    expect(toNotificationItem(row({ is_read: true }))?.isRead).toBe(true)
  })

  it("answers null when the property has no external id", () => {
    expect(toNotificationItem(row({ property: { ...snapshot, external_id: null } }))).toBeNull()
  })

  it("answers null when the property comes from a source that is not known", () => {
    expect(toNotificationItem(row({ property: { ...snapshot, source: "other" } }))).toBeNull()
  })

  it("answers null when the open house has no external id", () => {
    const openHouse = { external_id: null, start_datetime: START, end_datetime: END, status: "SCHEDULED" as const }

    expect(toNotificationItem(row({ openHouse }))).toBeNull()
  })
})

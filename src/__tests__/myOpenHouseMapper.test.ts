import { describe, it, expect } from "@jest/globals"
import {
  groupOf,
  toMyOpenHouseItem,
  type MyOpenHouseRow,
} from "../mappers/myOpenHouseMapper.js"
import type { PropertySnapshot } from "../mappers/savedSnapshotMapper.js"

// 11:29 on 22 November in Brisbane; tomorrow starts at midnight there
const NOW = new Date("2026-11-22T01:29:00.000Z")
const START_OF_TOMORROW = new Date("2026-11-22T14:00:00.000Z")

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

interface Options {
  status?: string
  start: string
  end: string
  externalId?: string | null
  property?: PropertySnapshot
}

function row({ status = "UPCOMING", start, end, externalId, property }: Options): MyOpenHouseRow {
  return {
    user_openHouse_id: 9,
    created_at: new Date("2026-11-20T00:00:00.000Z"),
    status,
    openHouse: {
      external_id: externalId === undefined ? "mock-1-1" : externalId,
      start_datetime: new Date(start),
      end_datetime: new Date(end),
      status: "SCHEDULED",
      property: property ?? snapshot,
    },
  }
}

const group = (options: Options) => groupOf(row(options), NOW, START_OF_TOMORROW)

describe("groupOf", () => {
  it("puts an entry the user marked as attended in attended, even if it is in the future", () => {
    expect(
      group({ status: "ATTENDED", start: "2026-11-25T00:00:00.000Z", end: "2026-11-25T00:30:00.000Z" }),
    ).toBe("attended")
  })

  it("puts an attended entry in attended once it is over as well", () => {
    expect(
      group({ status: "ATTENDED", start: "2026-11-20T00:00:00.000Z", end: "2026-11-20T00:30:00.000Z" }),
    ).toBe("attended")
  })

  it("puts an open house that has finished in expired", () => {
    expect(group({ start: "2026-11-21T00:00:00.000Z", end: "2026-11-21T00:30:00.000Z" })).toBe("expired")
  })

  it("puts an open house that ends exactly now in expired", () => {
    expect(group({ start: "2026-11-22T00:59:00.000Z", end: "2026-11-22T01:29:00.000Z" })).toBe("expired")
  })

  it("trusts a stored EXPIRED status", () => {
    expect(
      group({ status: "EXPIRED", start: "2026-11-25T00:00:00.000Z", end: "2026-11-25T00:30:00.000Z" }),
    ).toBe("expired")
  })

  it("puts an open house that starts later today in today", () => {
    expect(group({ start: "2026-11-22T05:00:00.000Z", end: "2026-11-22T05:30:00.000Z" })).toBe("today")
  })

  it("puts an open house that is running now in today", () => {
    expect(group({ start: "2026-11-22T01:00:00.000Z", end: "2026-11-22T02:00:00.000Z" })).toBe("today")
  })

  it("puts an open house that started yesterday and is still running in today", () => {
    expect(group({ start: "2026-11-21T13:00:00.000Z", end: "2026-11-22T02:00:00.000Z" })).toBe("today")
  })

  it("puts an open house that starts one moment before tomorrow in today", () => {
    expect(group({ start: "2026-11-22T13:59:59.000Z", end: "2026-11-22T14:30:00.000Z" })).toBe("today")
  })

  it("puts an open house that starts exactly when tomorrow begins in upcoming", () => {
    expect(group({ start: "2026-11-22T14:00:00.000Z", end: "2026-11-22T14:30:00.000Z" })).toBe("upcoming")
  })

  it("puts an open house on a later day in upcoming", () => {
    expect(group({ start: "2026-11-27T00:00:00.000Z", end: "2026-11-27T00:30:00.000Z" })).toBe("upcoming")
  })
})

describe("toMyOpenHouseItem", () => {
  const start = "2026-11-22T05:00:00.000Z"
  const end = "2026-11-22T05:30:00.000Z"

  it("describes the entry, its open house and the stored property", () => {
    expect(toMyOpenHouseItem(row({ start, end }), "today")).toMatchObject({
      myOpenHouseId: 9,
      addedAt: new Date("2026-11-20T00:00:00.000Z"),
      attended: false,
      group: "today",
      openHouse: {
        externalId: "mock-1-1",
        startDatetime: new Date(start),
        endDatetime: new Date(end),
        status: "SCHEDULED",
      },
      property: { externalId: "mock-1", address: "12 Example Street, Brisbane" },
    })
  })

  it("marks an attended entry", () => {
    expect(toMyOpenHouseItem(row({ status: "ATTENDED", start, end }), "attended")).toMatchObject({
      attended: true,
      group: "attended",
    })
  })

  it("returns null when the open house has no external id", () => {
    expect(toMyOpenHouseItem(row({ start, end, externalId: null }), "today")).toBeNull()
  })

  it("returns null when the property cannot be matched to an external listing", () => {
    const property = { ...snapshot, external_id: null }

    expect(toMyOpenHouseItem(row({ start, end, property }), "today")).toBeNull()
  })
})

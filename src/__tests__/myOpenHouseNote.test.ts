import { describe, it, expect } from "@jest/globals"
import { toMyOpenHouseItem, type MyOpenHouseRow } from "../mappers/myOpenHouseMapper.js"
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

function row(note: MyOpenHouseRow["note"]): MyOpenHouseRow {
  return {
    user_openHouse_id: 9,
    created_at: new Date("2026-11-20T00:00:00.000Z"),
    status: "UPCOMING",
    note,
    openHouse: {
      external_id: "mock-1-1",
      start_datetime: new Date("2026-11-22T05:00:00.000Z"),
      end_datetime: new Date("2026-11-22T05:30:00.000Z"),
      status: "SCHEDULED",
      property: snapshot,
    },
  }
}

describe("toMyOpenHouseItem: the note of the entry", () => {
  const updated = new Date("2026-11-21T03:00:00.000Z")

  it("carries the note of the entry", () => {
    const item = toMyOpenHouseItem(
      row({ note_id: 5, content: "Ask about parking", updated_at: updated }),
      "today",
    )

    expect(item?.note).toEqual({ noteId: 5, content: "Ask about parking", updatedAt: updated })
  })

  it("has a null note when the entry has none", () => {
    expect(toMyOpenHouseItem(row(null), "today")?.note).toBeNull()
  })

  it("has a null note when the row was loaded without it", () => {
    expect(toMyOpenHouseItem(row(undefined), "today")?.note).toBeNull()
  })
})

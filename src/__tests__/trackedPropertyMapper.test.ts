import { describe, it, expect } from "@jest/globals"
import {
  toOpenHouse,
  toTrackedItem,
  type TrackedRow,
  type UpcomingOpenHouseRow,
} from "../mappers/trackedPropertyMapper.js"

const SNAPSHOT = {
  external_id: "mock-1",
  source: "mock",
  address: "1 Example Street",
  suburb: "Brisbane",
  state: "QLD",
  postcode: "4000",
  price: 650000,
  display_price: "$650,000",
  bedrooms: 3,
  bathrooms: 2,
  property_type: "House",
  latitude: -27.47,
  longitude: 153.02,
}

const row = (property: Record<string, unknown> = {}): TrackedRow => ({
  tracked_id: 9,
  created_at: new Date("2026-11-27T05:00:00.000Z"),
  property: { ...SNAPSHOT, ...property } as unknown as TrackedRow["property"],
})

const FIGURES = { saveCount: 3, interestCount: 2 }

const openHouse = (overrides: Partial<UpcomingOpenHouseRow> = {}): UpcomingOpenHouseRow => ({
  external_id: "mock-1-0",
  start_datetime: new Date("2026-11-29T00:00:00.000Z"),
  end_datetime: new Date("2026-11-29T00:30:00.000Z"),
  status: "SCHEDULED",
  ...overrides,
})

// A row as a careless query could return it: with the user and the note loaded as well
const leaky = () =>
  ({
    ...row(),
    user: { name: "Someone Private", email: "private@example.com" },
    note: { content: "a private note" },
  }) as unknown as TrackedRow

describe("toOpenHouse", () => {
  it("maps the fields of an open house that is still to come", () => {
    expect(toOpenHouse(openHouse())).toEqual({
      externalId: "mock-1-0",
      startDatetime: new Date("2026-11-29T00:00:00.000Z"),
      endDatetime: new Date("2026-11-29T00:30:00.000Z"),
      status: "SCHEDULED",
    })
  })

  it("answers null for an open house that has no id at the data source", () => {
    expect(toOpenHouse(openHouse({ external_id: null }))).toBeNull()
  })
})

describe("toTrackedItem", () => {
  it("answers the row and the two figures", () => {
    expect(toTrackedItem(row(), FIGURES, [])).toMatchObject({
      trackedId: 9,
      addedAt: new Date("2026-11-27T05:00:00.000Z"),
      saveCount: 3,
      openHouseInterestCount: 2,
    })
  })

  it("answers exactly these fields: nothing about a person", () => {
    const item = toTrackedItem(row(), FIGURES, [])

    expect(Object.keys(item ?? {}).sort()).toEqual([
      "addedAt",
      "openHouseInterestCount",
      "property",
      "saveCount",
      "trackedId",
    ])
  })

  it("answers exactly the fields of a summary for the property", () => {
    const item = toTrackedItem(row(), FIGURES, [])

    expect(Object.keys(item?.property ?? {}).sort()).toEqual([
      "address", "bathrooms", "bedrooms", "carSpaces", "displayPrice", "externalId", "latitude",
      "longitude", "openHouses", "postcode", "price", "propertyType", "source", "state", "suburb",
      "thumbnailUrl",
    ])
  })

  it("does not let a user or a note that a query loaded by mistake out", () => {
    const text = JSON.stringify(toTrackedItem(leaky(), FIGURES, []))

    expect(text).not.toContain("Someone Private")
    expect(text).not.toContain("private@example.com")
    expect(text).not.toContain("a private note")
  })

  it("shows the open houses that are still to come, in the order they were given", () => {
    const item = toTrackedItem(row(), FIGURES, [openHouse({ external_id: "a" }), openHouse({ external_id: "b" })])

    expect(item?.property.openHouses.map((o) => o.externalId)).toEqual(["a", "b"])
  })

  it("leaves out an open house that has no id at the data source", () => {
    const item = toTrackedItem(row(), FIGURES, [openHouse({ external_id: null }), openHouse({ external_id: "b" })])

    expect(item?.property.openHouses.map((o) => o.externalId)).toEqual(["b"])
  })

  it("has no open houses when there are none", () => {
    expect(toTrackedItem(row(), FIGURES, [])?.property.openHouses).toEqual([])
  })

  it("answers zero for a property that nobody saved or showed an interest in", () => {
    expect(toTrackedItem(row(), { saveCount: 0, interestCount: 0 }, [])).toMatchObject({
      saveCount: 0,
      openHouseInterestCount: 0,
    })
  })

  it("answers no car spaces and no thumbnail: the stored snapshot does not have them", () => {
    const item = toTrackedItem(row(), FIGURES, [])

    expect(item?.property.carSpaces).toBeNull()
    expect(item?.property.thumbnailUrl).toBeNull()
  })

  it.each([
    ["no source", { source: null }],
    ["no id at the data source", { external_id: null }],
    ["a source that is not known", { source: "other" }],
  ])("answers null for a property with %s: it cannot be matched to a listing", (_label, property) => {
    expect(toTrackedItem(row(property), FIGURES, [])).toBeNull()
  })
})

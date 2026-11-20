import { describe, it, expect } from "@jest/globals"
import { snapshotToSummary, type PropertySnapshot } from "../mappers/savedSnapshotMapper.js"
import { PRICE_WITHHELD_LABEL } from "../constants/domain.js"

const snapshot = (overrides: Partial<PropertySnapshot> = {}): PropertySnapshot => ({
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
  ...overrides,
})

describe("snapshotToSummary", () => {
  it("maps the stored columns to the summary fields", () => {
    expect(snapshotToSummary(snapshot())).toMatchObject({
      externalId: "mock-1",
      source: "mock",
      address: "12 Example Street, Brisbane",
      price: 650000,
      displayPrice: "$650,000",
      bedrooms: 3,
      propertyType: "House",
    })
  })

  it("leaves the fields that are not stored locally empty", () => {
    expect(snapshotToSummary(snapshot())).toMatchObject({
      carSpaces: null,
      thumbnailUrl: null,
      openHouses: [],
    })
  })

  it("uses the withheld-price label when there is no display price", () => {
    expect(snapshotToSummary(snapshot({ display_price: null }))?.displayPrice).toBe(
      PRICE_WITHHELD_LABEL,
    )
  })

  it("keeps a null price", () => {
    expect(snapshotToSummary(snapshot({ price: null }))?.price).toBeNull()
  })

  it("accepts the domain source", () => {
    expect(snapshotToSummary(snapshot({ source: "domain" }))?.source).toBe("domain")
  })

  it("returns null when it cannot be matched to an external listing", () => {
    expect(snapshotToSummary(snapshot({ external_id: null }))).toBeNull()
    expect(snapshotToSummary(snapshot({ source: null }))).toBeNull()
  })

  it("returns null for a source it does not know", () => {
    expect(snapshotToSummary(snapshot({ source: "other" }))).toBeNull()
  })
})
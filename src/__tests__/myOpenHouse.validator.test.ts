import { describe, it, expect } from "@jest/globals"
import { addMyOpenHouseSchema } from "../validators/myOpenHouse.validator.js"

describe("addMyOpenHouseSchema", () => {
  it("accepts a property id and an open house id", () => {
    expect(
      addMyOpenHouseSchema.safeParse({
        propertyExternalId: "mock-1",
        openHouseExternalId: "mock-1-1",
      }).success,
    ).toBe(true)
  })

  it("accepts numeric ids", () => {
    expect(
      addMyOpenHouseSchema.safeParse({
        propertyExternalId: "2018123456",
        openHouseExternalId: "99887766",
      }).success,
    ).toBe(true)
  })

  it("requires both ids", () => {
    expect(addMyOpenHouseSchema.safeParse({}).success).toBe(false)
    expect(addMyOpenHouseSchema.safeParse({ propertyExternalId: "mock-1" }).success).toBe(false)
    expect(addMyOpenHouseSchema.safeParse({ openHouseExternalId: "mock-1-1" }).success).toBe(false)
  })

  it.each(["", "a..b", "a/b", "a?b", "a b", "a".repeat(65)])(
    "rejects the open house id %p",
    (openHouseExternalId) => {
      expect(
        addMyOpenHouseSchema.safeParse({ propertyExternalId: "mock-1", openHouseExternalId })
          .success,
      ).toBe(false)
    },
  )

  it("applies the property id rules to the property id", () => {
    expect(
      addMyOpenHouseSchema.safeParse({
        propertyExternalId: "a..b",
        openHouseExternalId: "mock-1-1",
      }).success,
    ).toBe(false)
  })

  it("accepts the longest open house id", () => {
    expect(
      addMyOpenHouseSchema.safeParse({
        propertyExternalId: "mock-1",
        openHouseExternalId: "a".repeat(64),
      }).success,
    ).toBe(true)
  })
})

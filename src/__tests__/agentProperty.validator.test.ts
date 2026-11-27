import { describe, it, expect } from "@jest/globals"
import { trackPropertySchema } from "../validators/agentProperty.validator.js"
import { savePropertySchema } from "../validators/savedProperty.validator.js"

describe("trackPropertySchema", () => {
  it("accepts the id of a listing", () => {
    expect(trackPropertySchema.parse({ externalId: "mock-1" })).toEqual({ externalId: "mock-1" })
  })

  it("drops fields it does not know: the listing itself is never taken from the client", () => {
    const parsed = trackPropertySchema.parse({ externalId: "mock-1", address: "1 Fake Street", price: 1 })

    expect(parsed).toEqual({ externalId: "mock-1" })
  })

  it.each([
    ["no id", {}],
    ["an empty id", { externalId: "" }],
    ["an id that is not text", { externalId: 5 }],
    ["null", { externalId: null }],
    ["no body", undefined],
  ])("rejects %s", (_label, body) => {
    expect(trackPropertySchema.safeParse(body).success).toBe(false)
  })

  // Tracking and saving take the same id, so the two must never disagree about what one is
  it.each(["mock-1", "", " ", "a/b", "x".repeat(300), "domain-2019876543", "mock 1", "../etc"])(
    "agrees with saving a property about %j",
    (externalId) => {
      expect(trackPropertySchema.safeParse({ externalId }).success).toBe(
        savePropertySchema.safeParse({ externalId }).success,
      )
    },
  )
})

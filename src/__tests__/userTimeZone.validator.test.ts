import { describe, it, expect } from "@jest/globals"
import { setTimeZoneSchema } from "../validators/userTimeZone.validator.js"

describe("setTimeZoneSchema", () => {
  it.each(["Australia/Sydney", "UTC", "America/New_York"])("accepts %s", (timeZone) => {
    expect(setTimeZoneSchema.parse({ timeZone })).toEqual({ timeZone })
  })

  it("ignores fields it does not know", () => {
    expect(setTimeZoneSchema.parse({ timeZone: "UTC", userId: 99 })).toEqual({ timeZone: "UTC" })
  })

  it.each([
    ["no time zone", {}],
    ["an empty time zone", { timeZone: "" }],
    ["a name that is not a time zone", { timeZone: "Mars/Olympus" }],
    ["a sentence", { timeZone: "not a zone" }],
    ["a name that is too long", { timeZone: "a".repeat(65) }],
    ["a number", { timeZone: 5 }],
    ["null", { timeZone: null }],
  ])("rejects %s", (_label, body) => {
    expect(setTimeZoneSchema.safeParse(body).success).toBe(false)
  })

  it.each([undefined, null, "Australia/Sydney", 5])("rejects a body that is %p", (body) => {
    expect(setTimeZoneSchema.safeParse(body).success).toBe(false)
  })
})

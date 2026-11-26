import { describe, it, expect } from "@jest/globals"
import { canonicalTimeZone, isValidTimeZone } from "../helper/timeZone.js"
import { timeZoneNameSchema } from "../validators/timeZoneName.js"

describe("isValidTimeZone", () => {
  it.each(["+10:00", "+11:00"])("rejects the offset %s: it is not a time zone name", (value) => {
    expect(isValidTimeZone(value)).toBe(false)
  })

  it.each(["Australia/Sydney", "UTC", "Etc/GMT-10", "australia/sydney"])("accepts the name %s", (value) => {
    expect(isValidTimeZone(value)).toBe(true)
  })
})

describe("canonicalTimeZone", () => {
  it("fixes the letter case", () => {
    expect(canonicalTimeZone("australia/sydney")).toBe("Australia/Sydney")
  })

  it("keeps a name that is fine", () => {
    expect(canonicalTimeZone("America/New_York")).toBe("America/New_York")
  })
})

describe("timeZoneNameSchema", () => {
  it("answers the canonical name", () => {
    expect(timeZoneNameSchema.parse("australia/sydney")).toBe("Australia/Sydney")
  })

  it.each([
    ["an offset", "+10:00"],
    ["a name that is not a time zone", "Mars/Olympus"],
    ["an empty name", ""],
  ])("rejects %s", (_label, value) => {
    expect(timeZoneNameSchema.safeParse(value).success).toBe(false)
  })
})

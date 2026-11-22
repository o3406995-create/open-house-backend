import { describe, it, expect } from "@jest/globals"
import { listMyOpenHousesSchema } from "../validators/myOpenHouse.validator.js"
import { DEFAULT_TIME_ZONE } from "../constants/myOpenHouse.js"

describe("listMyOpenHousesSchema", () => {
  it("falls back to the default time zone when none is given", () => {
    expect(listMyOpenHousesSchema.parse({})).toEqual({ timeZone: DEFAULT_TIME_ZONE })
  })

  it.each(["Australia/Sydney", "UTC", "America/New_York"])("accepts %s", (timeZone) => {
    expect(listMyOpenHousesSchema.parse({ timeZone })).toEqual({ timeZone })
  })

  it.each(["", "Mars/Olympus", "not a zone", "a".repeat(65)])(
    "rejects the time zone %p",
    (timeZone) => {
      expect(listMyOpenHousesSchema.safeParse({ timeZone }).success).toBe(false)
    },
  )

  it("rejects a time zone given more than once", () => {
    expect(listMyOpenHousesSchema.safeParse({ timeZone: ["UTC", "UTC"] }).success).toBe(false)
  })
})

import { describe, it, expect } from "@jest/globals"
import { isValidTimeZone, startOfNextDay } from "../helper/timeZone.js"

const HOUR = 60 * 60 * 1000

describe("isValidTimeZone", () => {
  it.each(["Australia/Brisbane", "UTC", "America/New_York", "Asia/Kolkata"])(
    "accepts %s",
    (timeZone) => {
      expect(isValidTimeZone(timeZone)).toBe(true)
    },
  )

  it.each(["Mars/Olympus", "not a zone", "Australia/Brisbane; DROP TABLE", "../etc/passwd"])(
    "rejects %s",
    (timeZone) => {
      expect(isValidTimeZone(timeZone)).toBe(false)
    },
  )
})

describe("startOfNextDay", () => {
  it.each([
    // [time zone, now, the instant the next day starts there]
    ["Australia/Brisbane", "2026-11-22T01:29:17.000Z", "2026-11-22T14:00:00.000Z"],
    ["UTC", "2026-11-22T01:29:17.000Z", "2026-11-23T00:00:00.000Z"],
    ["America/New_York", "2026-11-22T01:29:17.000Z", "2026-11-22T05:00:00.000Z"],
    ["Asia/Kolkata", "2026-11-22T01:29:17.000Z", "2026-11-22T18:30:00.000Z"],
  ])("finds the start of the next day in %s", (timeZone, now, expected) => {
    expect(startOfNextDay(new Date(now), timeZone).toISOString()).toBe(expected)
  })

  it("is the same day until the last second before midnight", () => {
    const lastSecond = new Date("2026-11-22T13:59:59.000Z")

    expect(startOfNextDay(lastSecond, "Australia/Brisbane").toISOString()).toBe(
      "2026-11-22T14:00:00.000Z",
    )
  })

  it("moves on to the following day exactly at midnight", () => {
    const midnight = new Date("2026-11-22T14:00:00.000Z")

    expect(startOfNextDay(midnight, "Australia/Brisbane").toISOString()).toBe(
      "2026-11-23T14:00:00.000Z",
    )
  })

  it("crosses the end of the year", () => {
    const newYearsEve = new Date("2026-12-31T05:00:00.000Z")

    expect(startOfNextDay(newYearsEve, "Australia/Brisbane").toISOString()).toBe(
      "2026-12-31T14:00:00.000Z",
    )
  })

  it("handles the day daylight saving starts (Sydney, 4 October 2026, a 23 hour day)", () => {
    const now = new Date("2026-10-03T20:00:00.000Z")

    expect(startOfNextDay(now, "Australia/Sydney").toISOString()).toBe("2026-10-04T13:00:00.000Z")
  })

  it("handles the day daylight saving ends (Sydney, 5 April 2026, a 25 hour day)", () => {
    const now = new Date("2026-04-04T20:00:00.000Z")

    expect(startOfNextDay(now, "Australia/Sydney").toISOString()).toBe("2026-04-05T14:00:00.000Z")
  })

  it.each(["Australia/Brisbane", "Australia/Sydney", "America/New_York", "Asia/Kolkata", "UTC"])(
    "is always within the next 25 hours in %s",
    (timeZone) => {
      for (let day = 0; day < 400; day += 7) {
        const now = new Date(Date.UTC(2026, 0, 1 + day, 7, 13))
        const wait = startOfNextDay(now, timeZone).getTime() - now.getTime()

        expect(wait).toBeGreaterThan(0)
        expect(wait).toBeLessThanOrEqual(25 * HOUR)
      }
    },
  )
})

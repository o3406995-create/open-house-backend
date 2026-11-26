import { describe, it, expect } from "@jest/globals"
import { localHour } from "../helper/timeZone.js"

describe("localHour", () => {
  it.each([
    ["Australia/Brisbane", "2026-11-26T09:00:00.000Z", 19],
    ["Australia/Sydney", "2026-11-26T09:00:00.000Z", 20],
    ["Australia/Sydney", "2026-06-26T09:00:00.000Z", 19],
    ["UTC", "2026-11-26T09:00:00.000Z", 9],
    ["America/New_York", "2026-11-26T09:00:00.000Z", 4],
    ["Australia/Brisbane", "2026-11-25T14:00:00.000Z", 0],
    ["Australia/Brisbane", "2026-11-26T13:59:00.000Z", 23],
  ])("%s at %s is hour %d", (timeZone, instant, hour) => {
    expect(localHour(new Date(instant), timeZone)).toBe(hour)
  })
})

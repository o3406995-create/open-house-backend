import { describe, it, expect } from "@jest/globals"
import { upcomingOpenHouses } from "../helper/openHouses.js"
import type { OpenHouseDTO } from "../types/property.js"

const NOW = new Date("2026-11-18T00:00:00.000Z")

const openHouse = (id: string, start: string, end: string): OpenHouseDTO => ({
  externalId: id,
  startDatetime: new Date(start),
  endDatetime: new Date(end),
  status: "SCHEDULED",
})

const ids = (list: OpenHouseDTO[]) => list.map((item) => item.externalId)

describe("upcomingOpenHouses", () => {
  it("drops open houses that already finished", () => {
    const past = openHouse("past", "2026-11-17T01:00:00.000Z", "2026-11-17T02:00:00.000Z")
    const future = openHouse("future", "2026-11-19T01:00:00.000Z", "2026-11-19T02:00:00.000Z")

    expect(ids(upcomingOpenHouses([past, future], NOW))).toEqual(["future"])
  })

  it("drops one that ends exactly now", () => {
    const ending = openHouse("ending", "2026-11-17T23:00:00.000Z", "2026-11-18T00:00:00.000Z")

    expect(upcomingOpenHouses([ending], NOW)).toEqual([])
  })

  it("keeps one that is in progress", () => {
    const running = openHouse("running", "2026-11-17T23:30:00.000Z", "2026-11-18T00:30:00.000Z")

    expect(ids(upcomingOpenHouses([running], NOW))).toEqual(["running"])
  })

  it("sorts by start time, earliest first", () => {
    const late = openHouse("late", "2026-11-20T01:00:00.000Z", "2026-11-20T02:00:00.000Z")
    const early = openHouse("early", "2026-11-19T01:00:00.000Z", "2026-11-19T02:00:00.000Z")

    expect(ids(upcomingOpenHouses([late, early], NOW))).toEqual(["early", "late"])
  })

  it("does not change the list it was given", () => {
    const late = openHouse("late", "2026-11-20T01:00:00.000Z", "2026-11-20T02:00:00.000Z")
    const early = openHouse("early", "2026-11-19T01:00:00.000Z", "2026-11-19T02:00:00.000Z")
    const input = [late, early]

    upcomingOpenHouses(input, NOW)

    expect(ids(input)).toEqual(["late", "early"])
  })

  it("returns an empty list for no open houses", () => {
    expect(upcomingOpenHouses([], NOW)).toEqual([])
  })
})
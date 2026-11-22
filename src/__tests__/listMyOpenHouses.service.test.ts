import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// The repository and the property service are replaced with fakes, so these tests never
// touch the database or the data source. The service is loaded AFTER the fakes are
// registered (see savedProperty.service.test.ts for why).
const mockListForUser = jest.fn<(userId: number) => Promise<unknown[]>>()

let myOpenHouseService: typeof import("../services/myOpenHouse.service.js").myOpenHouseService

beforeAll(async () => {
  jest.doMock("../repositories/myOpenHouse.repository.js", () => ({
    myOpenHouseRepository: {
      addForUser: () => Promise.reject(new Error("not used by these tests")),
      listForUser: (userId: number) => mockListForUser(userId),
    },
  }))

  jest.doMock("../services/property.service.js", () => ({
    propertyService: { getById: () => Promise.reject(new Error("not used by these tests")) },
  }))

  const loaded = await import("../services/myOpenHouse.service.js")
  myOpenHouseService = loaded.myOpenHouseService
})

// 11:29 on 22 November in Brisbane
const NOW = new Date("2026-11-22T01:29:00.000Z")
const BRISBANE = "Australia/Brisbane"

const snapshot = {
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
}

function row(
  id: number,
  start: string,
  end: string,
  status = "UPCOMING",
  externalId: string | null = `oh-${id}`,
) {
  return {
    user_openHouse_id: id,
    created_at: new Date("2026-11-20T00:00:00.000Z"),
    status,
    openHouse: {
      external_id: externalId,
      start_datetime: new Date(start),
      end_datetime: new Date(end),
      status: "SCHEDULED",
      property: snapshot,
    },
  }
}

const ids = (items: { myOpenHouseId: number }[]) => items.map((item) => item.myOpenHouseId)

// The repository returns the rows earliest first
const MIXED_ROWS = [
  row(3, "2026-11-19T00:00:00.000Z", "2026-11-19T00:30:00.000Z"), // finished
  row(1, "2026-11-20T00:00:00.000Z", "2026-11-20T00:30:00.000Z", "ATTENDED"),
  row(2, "2026-11-21T00:00:00.000Z", "2026-11-21T00:30:00.000Z", "ATTENDED"),
  row(4, "2026-11-21T10:00:00.000Z", "2026-11-21T10:30:00.000Z"), // finished, more recent
  row(5, "2026-11-22T05:00:00.000Z", "2026-11-22T05:30:00.000Z"), // today
  row(6, "2026-11-22T08:00:00.000Z", "2026-11-22T08:30:00.000Z"), // today
  row(8, "2026-11-24T00:00:00.000Z", "2026-11-24T00:30:00.000Z"), // upcoming
  row(7, "2026-11-25T00:00:00.000Z", "2026-11-25T00:30:00.000Z"), // upcoming
]

describe("myOpenHouseService.list", () => {
  it("puts every entry into its group", async () => {
    mockListForUser.mockResolvedValue(MIXED_ROWS)

    const result = await myOpenHouseService.list(7, BRISBANE, NOW)

    expect(ids(result.myOpenHouses.today)).toEqual([5, 6])
    expect(ids(result.myOpenHouses.upcoming)).toEqual([8, 7])
    expect(ids(result.myOpenHouses.attended)).toEqual([2, 1])
    expect(ids(result.myOpenHouses.expired)).toEqual([4, 3])
  })

  it("lists today and upcoming earliest first, attended and expired most recent first", async () => {
    mockListForUser.mockResolvedValue(MIXED_ROWS)

    const result = await myOpenHouseService.list(7, BRISBANE, NOW)

    expect(ids(result.myOpenHouses.upcoming)).toEqual([8, 7])
    expect(ids(result.myOpenHouses.expired)).toEqual([4, 3])
  })

  it("counts every group", async () => {
    mockListForUser.mockResolvedValue(MIXED_ROWS)

    const result = await myOpenHouseService.list(7, BRISBANE, NOW)

    expect(result.counts).toEqual({ today: 2, upcoming: 2, attended: 2, expired: 2 })
  })

  it("answers with the time zone it used", async () => {
    mockListForUser.mockResolvedValue([])

    expect((await myOpenHouseService.list(7, "Australia/Sydney", NOW)).timeZone).toBe(
      "Australia/Sydney",
    )
  })

  it("asks the repository for the rows of the user", async () => {
    mockListForUser.mockResolvedValue([])

    await myOpenHouseService.list(7, BRISBANE, NOW)

    expect(mockListForUser).toHaveBeenCalledWith(7)
  })

  it("returns four empty groups when the user has none", async () => {
    mockListForUser.mockResolvedValue([])

    const result = await myOpenHouseService.list(7, BRISBANE, NOW)

    expect(result.myOpenHouses).toEqual({ today: [], upcoming: [], attended: [], expired: [] })
    expect(result.counts).toEqual({ today: 0, upcoming: 0, attended: 0, expired: 0 })
  })

  it("decides what today is by the time zone", async () => {
    // 20:00 UTC on 22 November is 06:00 on 23 November in Brisbane, but still the 22nd in UTC
    mockListForUser.mockResolvedValue([
      row(9, "2026-11-22T20:00:00.000Z", "2026-11-22T20:30:00.000Z"),
    ])

    const inBrisbane = await myOpenHouseService.list(7, BRISBANE, NOW)
    const inUtc = await myOpenHouseService.list(7, "UTC", NOW)

    expect(inBrisbane.counts).toMatchObject({ today: 0, upcoming: 1 })
    expect(inUtc.counts).toMatchObject({ today: 1, upcoming: 0 })
  })

  it("leaves out entries that cannot be matched to an external open house", async () => {
    mockListForUser.mockResolvedValue([
      row(5, "2026-11-22T05:00:00.000Z", "2026-11-22T05:30:00.000Z", "UPCOMING", null),
      row(6, "2026-11-22T08:00:00.000Z", "2026-11-22T08:30:00.000Z"),
    ])

    const result = await myOpenHouseService.list(7, BRISBANE, NOW)

    expect(ids(result.myOpenHouses.today)).toEqual([6])
    expect(result.counts.today).toBe(1)
  })

  it("describes each entry with its open house and the stored property", async () => {
    mockListForUser.mockResolvedValue([
      row(5, "2026-11-22T05:00:00.000Z", "2026-11-22T05:30:00.000Z"),
    ])

    const [item] = (await myOpenHouseService.list(7, BRISBANE, NOW)).myOpenHouses.today

    expect(item).toMatchObject({
      myOpenHouseId: 5,
      group: "today",
      attended: false,
      openHouse: { externalId: "oh-5", status: "SCHEDULED" },
      property: { externalId: "mock-1", address: "12 Example Street, Brisbane" },
    })
  })

  it("passes a repository error on", async () => {
    mockListForUser.mockRejectedValue(new Error("database is down"))

    await expect(myOpenHouseService.list(7, BRISBANE, NOW)).rejects.toThrow("database is down")
  })
})

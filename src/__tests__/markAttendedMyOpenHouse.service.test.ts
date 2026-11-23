import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import {
  MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND,
  MY_OPEN_HOUSE_ERROR_NOT_STARTED,
} from "../constants/myOpenHouse.js"

// The repository and the property service are replaced with fakes, so these tests never
// touch the database. The service is loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const mockFindForUser = jest.fn<(userId: number, id: number) => Promise<unknown>>()
const mockMarkAttended = jest.fn<(userId: number, id: number) => Promise<number>>()

let myOpenHouseService: typeof import("../services/myOpenHouse.service.js").myOpenHouseService

beforeAll(async () => {
  jest.doMock("../repositories/myOpenHouse.repository.js", () => ({
    myOpenHouseRepository: {
      addForUser: () => Promise.reject(new Error("not used by these tests")),
      listForUser: () => Promise.reject(new Error("not used by these tests")),
      deleteForUser: () => Promise.reject(new Error("not used by these tests")),
      findForUser: (userId: number, id: number) => mockFindForUser(userId, id),
      markAttended: (userId: number, id: number) => mockMarkAttended(userId, id),
    },
  }))

  jest.doMock("../services/property.service.js", () => ({
    propertyService: { getById: () => Promise.reject(new Error("must not ask the provider")) },
  }))

  const loaded = await import("../services/myOpenHouse.service.js")
  myOpenHouseService = loaded.myOpenHouseService
})

// 11:29 on 22 November in Brisbane
const NOW = new Date("2026-11-22T01:29:00.000Z")

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

function row(start: string, end: string, status = "UPCOMING", externalId: string | null = "oh-1") {
  return {
    user_openHouse_id: 3,
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

const RUNNING = row("2026-11-22T01:00:00.000Z", "2026-11-22T02:00:00.000Z")

describe("myOpenHouseService.markAttended", () => {
  it("marks an open house that is running and describes the entry", async () => {
    mockFindForUser.mockResolvedValue(RUNNING)
    mockMarkAttended.mockResolvedValue(1)

    const item = await myOpenHouseService.markAttended(7, 3, NOW)

    expect(mockMarkAttended).toHaveBeenCalledWith(7, 3)
    expect(item).toMatchObject({
      myOpenHouseId: 3,
      attended: true,
      group: "attended",
      openHouse: { externalId: "oh-1", status: "SCHEDULED" },
      property: { externalId: "mock-1", address: "12 Example Street, Brisbane" },
    })
  })

  it("asks for the entry of the user", async () => {
    mockFindForUser.mockResolvedValue(RUNNING)
    mockMarkAttended.mockResolvedValue(1)

    await myOpenHouseService.markAttended(7, 3, NOW)

    expect(mockFindForUser).toHaveBeenCalledWith(7, 3)
  })

  it("marks an open house that has finished", async () => {
    mockFindForUser.mockResolvedValue(
      row("2026-11-20T00:00:00.000Z", "2026-11-20T00:30:00.000Z", "UPCOMING"),
    )
    mockMarkAttended.mockResolvedValue(1)

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).resolves.toMatchObject({
      attended: true,
    })
    expect(mockMarkAttended).toHaveBeenCalledTimes(1)
  })

  it("allows an open house that starts exactly now", async () => {
    mockFindForUser.mockResolvedValue(row(NOW.toISOString(), "2026-11-22T02:00:00.000Z"))
    mockMarkAttended.mockResolvedValue(1)

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).resolves.toMatchObject({
      attended: true,
    })
  })

  it.each([
    ["one millisecond", "2026-11-22T01:29:00.001Z"],
    ["a few days", "2026-11-25T00:00:00.000Z"],
  ])("answers 409 for an open house that starts %s later and writes nothing", async (_label, start) => {
    mockFindForUser.mockResolvedValue(row(start, "2026-11-26T00:00:00.000Z"))

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toMatchObject({
      statusCode: 409,
    })
    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toThrow(
      MY_OPEN_HOUSE_ERROR_NOT_STARTED,
    )
    expect(mockMarkAttended).not.toHaveBeenCalled()
  })

  it("returns an entry that is already attended without writing again", async () => {
    mockFindForUser.mockResolvedValue(
      row("2026-11-22T01:00:00.000Z", "2026-11-22T02:00:00.000Z", "ATTENDED"),
    )

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).resolves.toMatchObject({
      myOpenHouseId: 3,
      attended: true,
      group: "attended",
    })
    expect(mockMarkAttended).not.toHaveBeenCalled()
  })

  it("answers 404 when the entry does not exist or belongs to someone else, and writes nothing", async () => {
    mockFindForUser.mockResolvedValue(null)

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toThrow(
      MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND,
    )
    expect(mockMarkAttended).not.toHaveBeenCalled()
  })

  it("answers 404 for an entry that cannot be matched to an external open house, and writes nothing", async () => {
    mockFindForUser.mockResolvedValue(
      row("2026-11-22T01:00:00.000Z", "2026-11-22T02:00:00.000Z", "UPCOMING", null),
    )

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockMarkAttended).not.toHaveBeenCalled()
  })

  it("still answers with the entry when a concurrent request marked it first", async () => {
    mockFindForUser
      .mockResolvedValueOnce(RUNNING)
      .mockResolvedValueOnce(
        row("2026-11-22T01:00:00.000Z", "2026-11-22T02:00:00.000Z", "ATTENDED"),
      )
    mockMarkAttended.mockResolvedValue(0)

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).resolves.toMatchObject({
      attended: true,
    })
    expect(mockFindForUser).toHaveBeenCalledTimes(2)
  })

  it("answers 404 when the entry was removed between the lookup and the update", async () => {
    mockFindForUser.mockResolvedValueOnce(RUNNING).mockResolvedValueOnce(null)
    mockMarkAttended.mockResolvedValue(0)

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it("passes a repository error on", async () => {
    mockFindForUser.mockResolvedValue(RUNNING)
    mockMarkAttended.mockRejectedValue(new Error("database is down"))

    await expect(myOpenHouseService.markAttended(7, 3, NOW)).rejects.toThrow("database is down")
  })
})

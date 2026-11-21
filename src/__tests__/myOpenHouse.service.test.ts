import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import { AppError } from "../lib/AppError.js"
import type { OpenHouseDTO, PropertyDetailDTO } from "../types/property.js"
import type { PropertyRecordInput } from "../mappers/propertyRecordMapper.js"
import type { OpenHouseRecordInput } from "../mappers/openHouseRecordMapper.js"
import {
  MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE,
  MY_OPEN_HOUSE_ERROR_NOT_FOUND,
  MY_OPEN_HOUSE_MAX_ATTEMPTS,
} from "../constants/myOpenHouse.js"

// The repository and the property service are replaced with fakes, so these tests never
// touch the database or the data source.
const mockAddForUser =
  jest.fn<
    (userId: number, property: PropertyRecordInput, openHouse: OpenHouseRecordInput) => Promise<unknown>
  >()
const mockGetById = jest.fn<(externalId: string) => Promise<unknown>>()

// The service is loaded AFTER the fakes are registered (see savedProperty.service.test.ts
// for why jest.doMock and a dynamic import are used instead of jest.mock)
let myOpenHouseService: typeof import("../services/myOpenHouse.service.js").myOpenHouseService

beforeAll(async () => {
  jest.doMock("../repositories/myOpenHouse.repository.js", () => ({
    myOpenHouseRepository: {
      addForUser: (
        userId: number,
        property: PropertyRecordInput,
        openHouse: OpenHouseRecordInput,
      ) => mockAddForUser(userId, property, openHouse),
    },
  }))

  jest.doMock("../services/property.service.js", () => ({
    propertyService: {
      getById: (externalId: string) => mockGetById(externalId),
    },
  }))

  const loaded = await import("../services/myOpenHouse.service.js")
  myOpenHouseService = loaded.myOpenHouseService
})

const NOW = new Date("2026-11-21T00:00:00.000Z")
const HOUR = 60 * 60 * 1000

// An open house starting `startHours` from NOW (negative: already started) and lasting `hours`
function house(
  id: string,
  startHours: number,
  hours: number,
  status: OpenHouseDTO["status"] = "SCHEDULED",
): OpenHouseDTO {
  return {
    externalId: id,
    startDatetime: new Date(NOW.getTime() + startHours * HOUR),
    endDatetime: new Date(NOW.getTime() + (startHours + hours) * HOUR),
    status,
  }
}

function detailWith(openHouses: OpenHouseDTO[]): PropertyDetailDTO {
  return {
    externalId: "mock-1",
    source: "mock",
    address: "12 Example Street, Brisbane",
    suburb: "Brisbane",
    state: "QLD",
    postcode: "4000",
    price: 650000,
    displayPrice: "$650,000",
    bedrooms: 3,
    bathrooms: 2,
    carSpaces: 2,
    propertyType: "House",
    latitude: -27.4698,
    longitude: 153.0251,
    thumbnailUrl: null,
    openHouses,
    landSizeSqm: 600,
    description: null,
    listingUrl: null,
    images: [],
    agent: null,
  }
}

const row = {
  user_openHouse_id: 9,
  created_at: new Date("2026-11-20T00:00:00.000Z"),
  status: "UPCOMING",
}

const upcoming = house("mock-1-1", 24, 1)

describe("myOpenHouseService.add", () => {
  it("adds an upcoming open house and returns it with the property summary", async () => {
    mockGetById.mockResolvedValue(detailWith([house("mock-1-0", -48, 1), upcoming]))
    mockAddForUser.mockResolvedValue({ created: true, userOpenHouse: row })

    const result = await myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)

    expect(result.created).toBe(true)
    expect(result.myOpenHouse).toMatchObject({
      myOpenHouseId: 9,
      status: "UPCOMING",
      openHouse: { externalId: "mock-1-1", status: "SCHEDULED" },
      property: { externalId: "mock-1", address: "12 Example Street, Brisbane" },
    })
  })

  it("gives the repository the snapshots of the property and of that one open house", async () => {
    mockGetById.mockResolvedValue(detailWith([house("mock-1-0", -48, 1), upcoming]))
    mockAddForUser.mockResolvedValue({ created: true, userOpenHouse: row })

    await myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)

    expect(mockAddForUser).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ external_id: "mock-1", source: "mock" }),
      {
        external_id: "mock-1-1",
        start_datetime: upcoming.startDatetime,
        end_datetime: upcoming.endDatetime,
        status: "SCHEDULED",
      },
    )
  })

  it("reports a repeated add as not created", async () => {
    mockGetById.mockResolvedValue(detailWith([upcoming]))
    mockAddForUser.mockResolvedValue({ created: false, userOpenHouse: row })

    expect((await myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)).created).toBe(false)
  })

  it("answers 404 and writes nothing when the property does not exist", async () => {
    mockGetById.mockRejectedValue(new AppError("Property not found.", 404))

    await expect(myOpenHouseService.add(7, "nope", "mock-1-1", NOW)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockAddForUser).not.toHaveBeenCalled()
  })

  it("answers 404 when the open house does not belong to the property", async () => {
    mockGetById.mockResolvedValue(detailWith([upcoming]))

    await expect(myOpenHouseService.add(7, "mock-1", "mock-2-0", NOW)).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(myOpenHouseService.add(7, "mock-1", "mock-2-0", NOW)).rejects.toThrow(
      MY_OPEN_HOUSE_ERROR_NOT_FOUND,
    )
    expect(mockAddForUser).not.toHaveBeenCalled()
  })

  it.each([
    ["cancelled", house("x", 24, 1, "CANCELLED")],
    ["completed", house("x", 24, 1, "COMPLETED")],
    ["already finished", house("x", -3, 1)],
    ["ending exactly now", house("x", -1, 1)],
  ])("answers 409 for an open house that is %s", async (_label, openHouse) => {
    mockGetById.mockResolvedValue(detailWith([openHouse]))

    await expect(myOpenHouseService.add(7, "mock-1", "x", NOW)).rejects.toMatchObject({
      statusCode: 409,
    })
    await expect(myOpenHouseService.add(7, "mock-1", "x", NOW)).rejects.toThrow(
      MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE,
    )
    expect(mockAddForUser).not.toHaveBeenCalled()
  })

  it("accepts an open house that has started but not finished", async () => {
    mockGetById.mockResolvedValue(detailWith([house("mock-1-1", -1, 2)]))
    mockAddForUser.mockResolvedValue({ created: true, userOpenHouse: row })

    await expect(myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)).resolves.toMatchObject({
      created: true,
    })
  })

  it("retries when it loses a race on a unique index", async () => {
    mockGetById.mockResolvedValue(detailWith([upcoming]))
    mockAddForUser
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({ created: false, userOpenHouse: row })

    const result = await myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)

    expect(mockAddForUser).toHaveBeenCalledTimes(2)
    expect(result.created).toBe(false)
  })

  it("gives up after the maximum number of attempts", async () => {
    mockGetById.mockResolvedValue(detailWith([upcoming]))
    mockAddForUser.mockRejectedValue({ code: "P2002" })

    await expect(myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)).rejects.toMatchObject({
      code: "P2002",
    })
    expect(mockAddForUser).toHaveBeenCalledTimes(MY_OPEN_HOUSE_MAX_ATTEMPTS)
  })

  it("does not retry other errors", async () => {
    mockGetById.mockResolvedValue(detailWith([upcoming]))
    mockAddForUser.mockRejectedValue(new Error("database is down"))

    await expect(myOpenHouseService.add(7, "mock-1", "mock-1-1", NOW)).rejects.toThrow(
      "database is down",
    )
    expect(mockAddForUser).toHaveBeenCalledTimes(1)
  })
})

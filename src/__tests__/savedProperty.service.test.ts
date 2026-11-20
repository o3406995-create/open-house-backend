import { describe, it, expect, jest, beforeAll, afterEach } from "@jest/globals"
import { AppError } from "../lib/AppError.js"
import {
  SAVE_PROPERTY_MAX_ATTEMPTS,
  SAVED_ERROR_NOT_FOUND,
  LISTING_STATUS,
} from "../constants/savedProperty.js"

// The repository and the property service are replaced with fakes, so these tests never
// touch the database or the data source.
const mockSaveForUser = jest.fn<(userId: number, record: unknown) => Promise<unknown>>()
const mockListForUser =
  jest.fn<(userId: number, page: number, pageSize: number) => Promise<unknown>>()
const mockDeleteForUser = jest.fn<(userId: number, id: number) => Promise<number>>()
const mockGetById = jest.fn<(externalId: string) => Promise<unknown>>()
const mockFindById = jest.fn<(externalId: string) => Promise<unknown>>()
const mockGetActiveSource = jest.fn<() => string>()

// The service has to be loaded AFTER the fakes are registered, otherwise it would pick up
// the real repository (and Prisma). jest.mock is only moved to the top of the file when the
// compiler supports it, and @swc/jest does not do it here, so jest.doMock plus a dynamic
// import is used instead: the order is exactly the order written below.
let savedPropertyService: typeof import("../services/savedProperty.service.js").savedPropertyService

beforeAll(async () => {
  jest.doMock("../repositories/savedProperty.repository.js", () => ({
    savedPropertyRepository: {
      saveForUser: (userId: number, record: unknown) => mockSaveForUser(userId, record),
      listForUser: (userId: number, page: number, pageSize: number) =>
        mockListForUser(userId, page, pageSize),
      deleteForUser: (userId: number, id: number) => mockDeleteForUser(userId, id),
    },
  }))

  jest.doMock("../services/property.service.js", () => ({
    propertyService: {
      getById: (externalId: string) => mockGetById(externalId),
      findById: (externalId: string) => mockFindById(externalId),
      getActiveSource: () => mockGetActiveSource(),
    },
  }))

  // These two only reshape data, so the fakes pass the value straight through
  jest.doMock("../mappers/propertyRecordMapper.js", () => ({
    toPropertyRecord: (detail: unknown) => detail,
  }))
  jest.doMock("../helper/propertySummary.js", () => ({
    toSummary: (detail: unknown) => detail,
  }))

  const loaded = await import("../services/savedProperty.service.js")
  savedPropertyService = loaded.savedPropertyService
})

const FAR_PAST = new Date("2000-01-01T00:00:00.000Z")
const FAR_FUTURE = new Date("2099-01-01T00:00:00.000Z")

// A saved property as the repository returns it: the saved row plus the stored snapshot
function row(externalId: string, options: { source?: string; savedPropertyId?: number } = {}) {
  return {
    saved_property_id: options.savedPropertyId ?? 1,
    saved_at: new Date("2026-11-17T00:00:00.000Z"),
    property: {
      external_id: externalId,
      source: options.source ?? "mock",
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
    },
  }
}

// A listing as the data source returns it now: one open house finished, one upcoming
function liveListing(externalId: string, price: number) {
  return {
    externalId,
    source: "mock",
    price,
    openHouses: [
      {
        externalId: `${externalId}-0`,
        startDatetime: FAR_PAST,
        endDatetime: FAR_PAST,
        status: "SCHEDULED",
      },
      {
        externalId: `${externalId}-1`,
        startDatetime: FAR_FUTURE,
        endDatetime: FAR_FUTURE,
        status: "SCHEDULED",
      },
    ],
  }
}

const PAGE = { page: 1, pageSize: 20 }

describe("savedPropertyService.list", () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("shows fresh data and only upcoming open houses when the listing is available", async () => {
    mockGetActiveSource.mockReturnValue("mock")
    mockListForUser.mockResolvedValue({ records: [row("mock-1")], total: 1 })
    mockFindById.mockResolvedValue(liveListing("mock-1", 700000))

    const result = await savedPropertyService.list(7, PAGE)
    const [item] = result.savedProperties

    expect(item?.listingStatus).toBe(LISTING_STATUS.AVAILABLE)
    expect(item?.property.price).toBe(700000)
    expect(item?.property.openHouses.map((o) => o.externalId)).toEqual(["mock-1-1"])
  })

  it("keeps a removed listing and shows its snapshot", async () => {
    mockGetActiveSource.mockReturnValue("mock")
    mockListForUser.mockResolvedValue({ records: [row("mock-1")], total: 1 })
    mockFindById.mockResolvedValue(null)

    const result = await savedPropertyService.list(7, PAGE)
    const [item] = result.savedProperties

    expect(mockFindById).toHaveBeenCalledWith("mock-1")
    expect(item?.listingStatus).toBe(LISTING_STATUS.REMOVED)
    expect(item?.property.price).toBe(650000)
    expect(item?.property.openHouses).toEqual([])
  })

  it("falls back to the snapshot when the lookup fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    mockGetActiveSource.mockReturnValue("mock")
    mockListForUser.mockResolvedValue({ records: [row("mock-1")], total: 1 })
    mockFindById.mockRejectedValue(new Error("data source is down"))

    const result = await savedPropertyService.list(7, PAGE)
    const [item] = result.savedProperties

    expect(item?.listingStatus).toBe(LISTING_STATUS.UNKNOWN)
    expect(item?.property.price).toBe(650000)
  })

  it("does not look up a listing that came from another data source", async () => {
    mockGetActiveSource.mockReturnValue("mock")
    mockListForUser.mockResolvedValue({ records: [row("dom-1", { source: "domain" })], total: 1 })

    const result = await savedPropertyService.list(7, PAGE)

    expect(mockFindById).not.toHaveBeenCalled()
    expect(result.savedProperties.map((i) => i.listingStatus)).toEqual([LISTING_STATUS.UNKNOWN])
  })

  it("lets one failing lookup affect only its own item", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {})
    mockGetActiveSource.mockReturnValue("mock")
    mockListForUser.mockResolvedValue({
      records: [row("mock-1", { savedPropertyId: 1 }), row("mock-2", { savedPropertyId: 2 })],
      total: 2,
    })
    mockFindById.mockImplementation(async (externalId) => {
      if (externalId === "mock-1") throw new Error("data source is down")
      return liveListing(externalId, 480000)
    })

    const result = await savedPropertyService.list(7, PAGE)

    expect(result.savedProperties.map((i) => i.listingStatus)).toEqual([
      LISTING_STATUS.UNKNOWN,
      LISTING_STATUS.AVAILABLE,
    ])
  })

  it("drops rows it cannot match to a listing and passes the paging values through", async () => {
    mockGetActiveSource.mockReturnValue("mock")
    mockListForUser.mockResolvedValue({
      records: [row("x-1", { source: "other" }), row("mock-1")],
      total: 2,
    })
    mockFindById.mockResolvedValue(liveListing("mock-1", 650000))

    const result = await savedPropertyService.list(7, { page: 2, pageSize: 2 })

    expect(result.savedProperties).toHaveLength(1)
    expect(result).toMatchObject({ total: 2, page: 2, pageSize: 2 })
    expect(mockListForUser).toHaveBeenCalledWith(7, 2, 2)
  })
})

describe("savedPropertyService.save", () => {
  const savedRow = { saved_property_id: 5, saved_at: new Date("2026-11-17T00:00:00.000Z") }
  const duplicate = () => ({ code: "P2002" })

  it("returns the new saved property", async () => {
    mockGetById.mockResolvedValue({ externalId: "mock-1" })
    mockSaveForUser.mockResolvedValue({ created: true, savedProperty: savedRow })

    const result = await savedPropertyService.save(7, "mock-1")

    expect(result.created).toBe(true)
    expect(result.savedProperty.savedPropertyId).toBe(5)
    expect(mockSaveForUser).toHaveBeenCalledTimes(1)
  })

  it("reports a repeated save as not created", async () => {
    mockGetById.mockResolvedValue({ externalId: "mock-1" })
    mockSaveForUser.mockResolvedValue({ created: false, savedProperty: savedRow })

    expect((await savedPropertyService.save(7, "mock-1")).created).toBe(false)
  })

  it("retries once when it loses a race on a unique index", async () => {
    mockGetById.mockResolvedValue({ externalId: "mock-1" })
    mockSaveForUser
      .mockRejectedValueOnce(duplicate())
      .mockResolvedValueOnce({ created: false, savedProperty: savedRow })

    const result = await savedPropertyService.save(7, "mock-1")

    expect(mockSaveForUser).toHaveBeenCalledTimes(2)
    expect(result.created).toBe(false)
  })

  it("gives up after the maximum number of attempts", async () => {
    mockGetById.mockResolvedValue({ externalId: "mock-1" })
    mockSaveForUser.mockRejectedValue(duplicate())

    await expect(savedPropertyService.save(7, "mock-1")).rejects.toMatchObject({ code: "P2002" })
    expect(mockSaveForUser).toHaveBeenCalledTimes(SAVE_PROPERTY_MAX_ATTEMPTS)
  })

  it("does not retry other errors", async () => {
    mockGetById.mockResolvedValue({ externalId: "mock-1" })
    mockSaveForUser.mockRejectedValue(new Error("database is down"))

    await expect(savedPropertyService.save(7, "mock-1")).rejects.toThrow("database is down")
    expect(mockSaveForUser).toHaveBeenCalledTimes(1)
  })

  it("does not write anything when the listing does not exist", async () => {
    mockGetById.mockRejectedValue(new AppError("Property not found", 404))

    await expect(savedPropertyService.save(7, "nope")).rejects.toThrow("Property not found")
    expect(mockSaveForUser).not.toHaveBeenCalled()
  })
})

describe("savedPropertyService.remove", () => {
  it("removes the user's own saved property", async () => {
    mockDeleteForUser.mockResolvedValue(1)

    await expect(savedPropertyService.remove(7, 3)).resolves.toBeUndefined()
    expect(mockDeleteForUser).toHaveBeenCalledWith(7, 3)
  })

  it("answers 'not found' when nothing was deleted", async () => {
    mockDeleteForUser.mockResolvedValue(0)

    await expect(savedPropertyService.remove(7, 3)).rejects.toThrow(SAVED_ERROR_NOT_FOUND)
    await expect(savedPropertyService.remove(7, 3)).rejects.toBeInstanceOf(AppError)
  })
})

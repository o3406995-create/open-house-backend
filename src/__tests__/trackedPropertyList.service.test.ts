import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import { AGENT_ERROR_NO_PROFILE } from "../constants/agentProperty.js"

// The three repositories and the provider are replaced with fakes, so these tests never touch the
// database. The mapper is the real one: what leaves the service is what is checked. The service is loaded
// AFTER the fakes are registered (see savedProperty.service.test.ts for why).
const mockFindAgentId = jest.fn<(userId: number) => Promise<number | null>>()
const mockListForAgent = jest.fn<(agentId: number, page: number, pageSize: number) => Promise<unknown>>()
const mockSaveCounts = jest.fn<(ids: number[]) => Promise<Map<number, number>>>()
const mockInterestCounts = jest.fn<(ids: number[]) => Promise<Map<number, number>>>()
const mockUpcoming = jest.fn<(ids: number[], now: Date) => Promise<unknown[]>>()
const mockGetById = jest.fn<(externalId: string) => Promise<unknown>>()
const mockFindById = jest.fn<(externalId: string) => Promise<unknown>>()

let trackedPropertyListService: typeof import("../services/trackedPropertyList.service.js").trackedPropertyListService

beforeAll(async () => {
  jest.doMock("../repositories/agentProperty.repository.js", () => ({
    agentPropertyRepository: { findAgentId: (userId: number) => mockFindAgentId(userId) },
  }))
  jest.doMock("../repositories/trackedPropertyList.repository.js", () => ({
    trackedPropertyListRepository: {
      listForAgent: (agentId: number, page: number, pageSize: number) => mockListForAgent(agentId, page, pageSize),
    },
  }))
  jest.doMock("../repositories/propertyInterest.repository.js", () => ({
    propertyInterestRepository: {
      saveCounts: (ids: number[]) => mockSaveCounts(ids),
      interestCounts: (ids: number[]) => mockInterestCounts(ids),
      upcomingOpenHouses: (ids: number[], now: Date) => mockUpcoming(ids, now),
    },
  }))
  jest.doMock("../services/property.service.js", () => ({
    propertyService: {
      getById: (externalId: string) => mockGetById(externalId),
      findById: (externalId: string) => mockFindById(externalId),
    },
  }))

  const loaded = await import("../services/trackedPropertyList.service.js")
  trackedPropertyListService = loaded.trackedPropertyListService
})

const USER_ID = 7
const AGENT_ID = 5
const NOW = new Date("2026-11-28T00:00:00.000Z")

const snapshot = (n: number, overrides: Record<string, unknown> = {}) => ({
  external_id: `mock-${n}`,
  source: "mock",
  address: `${n} Example Street`,
  suburb: "Brisbane",
  state: "QLD",
  postcode: "4000",
  price: 650000,
  display_price: "$650,000",
  bedrooms: 3,
  bathrooms: 2,
  property_type: "House",
  latitude: -27.47,
  longitude: 153.02,
  ...overrides,
})

const record = (trackedId: number, propertyId: number, overrides: Record<string, unknown> = {}) => ({
  tracked_id: trackedId,
  created_at: new Date("2026-11-27T05:00:00.000Z"),
  property_id: propertyId,
  property: snapshot(propertyId, overrides),
})

const openHouse = (propertyId: number, externalId: string) => ({
  property_id: propertyId,
  external_id: externalId,
  start_datetime: new Date("2026-11-29T00:00:00.000Z"),
  end_datetime: new Date("2026-11-29T00:30:00.000Z"),
  status: "SCHEDULED",
})

beforeEach(() => {
  mockFindAgentId.mockReset()
  mockListForAgent.mockReset()
  mockSaveCounts.mockReset()
  mockInterestCounts.mockReset()
  mockUpcoming.mockReset()
  mockGetById.mockReset()
  mockFindById.mockReset()

  mockFindAgentId.mockResolvedValue(AGENT_ID)
  mockListForAgent.mockResolvedValue({ records: [record(9, 3), record(8, 5)], total: 2 })
  mockSaveCounts.mockResolvedValue(new Map([[3, 4], [5, 1]]))
  mockInterestCounts.mockResolvedValue(new Map([[3, 2], [5, 0]]))
  mockUpcoming.mockResolvedValue([])
})

const list = (page = 1, pageSize = 20) => trackedPropertyListService.list(USER_ID, { page, pageSize }, NOW)

describe("trackedPropertyListService.list", () => {
  it("answers the page, with the two figures of each property", async () => {
    const result = await list()

    expect([result.total, result.page, result.pageSize]).toEqual([2, 1, 20])
    expect(
      result.trackedProperties.map((item) => [
        item.trackedId,
        item.property.externalId,
        item.saveCount,
        item.openHouseInterestCount,
      ]),
    ).toEqual([
      [9, "mock-3", 4, 2],
      [8, "mock-5", 1, 0],
    ])
  })

  it("answers zero for a property that nobody saved or showed an interest in", async () => {
    mockSaveCounts.mockResolvedValue(new Map())
    mockInterestCounts.mockResolvedValue(new Map())

    const result = await list()

    expect(result.trackedProperties.map((item) => [item.saveCount, item.openHouseInterestCount])).toEqual([
      [0, 0],
      [0, 0],
    ])
  })

  it("answers 409 for an account with no profile, and reads nothing", async () => {
    mockFindAgentId.mockResolvedValue(null)

    await expect(list()).rejects.toMatchObject({ statusCode: 409, message: AGENT_ERROR_NO_PROFILE })
    expect(mockListForAgent).not.toHaveBeenCalled()
    expect(mockSaveCounts).not.toHaveBeenCalled()
    expect(mockInterestCounts).not.toHaveBeenCalled()
    expect(mockUpcoming).not.toHaveBeenCalled()
  })

  it("finds the profile of the user", async () => {
    await list()

    expect(mockFindAgentId).toHaveBeenCalledWith(USER_ID)
  })

  it("asks the list for the profile of the agent and the page that was asked for", async () => {
    await list(2, 10)

    expect(mockListForAgent).toHaveBeenCalledWith(AGENT_ID, 2, 10)
  })

  it("asks for each figure once for the whole page, not once for each property", async () => {
    await list()

    expect(mockSaveCounts).toHaveBeenCalledTimes(1)
    expect(mockSaveCounts).toHaveBeenCalledWith([3, 5])
    expect(mockInterestCounts).toHaveBeenCalledTimes(1)
    expect(mockInterestCounts).toHaveBeenCalledWith([3, 5])
    expect(mockUpcoming).toHaveBeenCalledTimes(1)
    expect(mockUpcoming).toHaveBeenCalledWith([3, 5], expect.any(Date))
  })

  it("asks for the open houses that are still to come as of the time it was given", async () => {
    await list()

    expect(mockUpcoming).toHaveBeenCalledWith([3, 5], NOW)
  })

  it("gives each property its own open houses", async () => {
    mockUpcoming.mockResolvedValue([openHouse(5, "a"), openHouse(3, "b"), openHouse(3, "c")])

    const result = await list()

    expect(result.trackedProperties.map((item) => item.property.openHouses.map((o) => o.externalId))).toEqual([
      ["b", "c"],
      ["a"],
    ])
  })

  it("keeps the order of the list", async () => {
    mockListForAgent.mockResolvedValue({ records: [record(1, 5), record(2, 3)], total: 2 })

    const result = await list()

    expect(result.trackedProperties.map((item) => item.trackedId)).toEqual([1, 2])
  })

  it("leaves out a row that cannot be matched to an external listing", async () => {
    mockListForAgent.mockResolvedValue({ records: [record(9, 3, { source: null }), record(8, 5)], total: 2 })

    const result = await list()

    expect(result.trackedProperties.map((item) => item.trackedId)).toEqual([8])
  })

  it("answers an empty page", async () => {
    mockListForAgent.mockResolvedValue({ records: [], total: 0 })

    await expect(list()).resolves.toEqual({ trackedProperties: [], total: 0, page: 1, pageSize: 20 })
  })

  it("never asks the data source: the listings are the snapshots that were stored", async () => {
    await list()

    expect(mockGetById).not.toHaveBeenCalled()
    expect(mockFindById).not.toHaveBeenCalled()
  })

  it("answers exactly these fields for a property: nothing about a person", async () => {
    const result = await list()

    expect(Object.keys(result.trackedProperties[0] ?? {}).sort()).toEqual([
      "addedAt",
      "openHouseInterestCount",
      "property",
      "saveCount",
      "trackedId",
    ])
  })

  it("passes an error of the list on", async () => {
    mockListForAgent.mockRejectedValue(new Error("database is down"))

    await expect(list()).rejects.toThrow("database is down")
  })

  it("passes an error of a figure on", async () => {
    mockInterestCounts.mockRejectedValue(new Error("database is down"))

    await expect(list()).rejects.toThrow("database is down")
  })
})

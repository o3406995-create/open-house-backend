import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import { AppError } from "../lib/AppError.js"
import { AGENT_ERROR_NO_PROFILE, TRACK_PROPERTY_MAX_ATTEMPTS } from "../constants/agentProperty.js"

// The repository, the provider, the mappers and the retry are replaced with fakes, so these tests only
// cover what the service decides. The service is loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const mockFindAgentId = jest.fn<(userId: number) => Promise<number | null>>()
const mockTrack = jest.fn<(agentId: number, record: unknown) => Promise<unknown>>()
const mockGetById = jest.fn<(externalId: string) => Promise<unknown>>()
const mockToRecord = jest.fn<(detail: unknown) => unknown>()
const mockToSummary = jest.fn<(detail: unknown) => unknown>()
const mockRetry = jest.fn<(action: () => Promise<unknown>, maxAttempts: number) => Promise<unknown>>()

let agentPropertyService: typeof import("../services/agentProperty.service.js").agentPropertyService

beforeAll(async () => {
  jest.doMock("../repositories/agentProperty.repository.js", () => ({
    agentPropertyRepository: {
      findAgentId: (userId: number) => mockFindAgentId(userId),
      trackForAgent: (agentId: number, record: unknown) => mockTrack(agentId, record),
    },
  }))
  jest.doMock("../services/property.service.js", () => ({
    propertyService: { getById: (externalId: string) => mockGetById(externalId) },
  }))
  jest.doMock("../mappers/propertyRecordMapper.js", () => ({
    toPropertyRecord: (detail: unknown) => mockToRecord(detail),
  }))
  jest.doMock("../helper/propertySummary.js", () => ({
    toSummary: (detail: unknown) => mockToSummary(detail),
  }))
  jest.doMock("../helper/retryOnConflict.js", () => ({
    retryOnConflict: (action: () => Promise<unknown>, maxAttempts: number) => mockRetry(action, maxAttempts),
  }))

  const loaded = await import("../services/agentProperty.service.js")
  agentPropertyService = loaded.agentPropertyService
})

const USER_ID = 7
const AGENT_ID = 5
const DETAIL = { externalId: "mock-1", address: "1 Example Street" }
const RECORD = { external_id: "mock-1", source: "mock" }
const SUMMARY = { externalId: "mock-1", address: "1 Example Street", openHouses: [] }
const TRACKED = { tracked_id: 9, agent_id: AGENT_ID, property_id: 3, created_at: new Date("2026-11-27T05:00:00.000Z") }

beforeEach(() => {
  mockFindAgentId.mockReset()
  mockTrack.mockReset()
  mockGetById.mockReset()
  mockToRecord.mockReset()
  mockToSummary.mockReset()
  mockRetry.mockReset()

  mockFindAgentId.mockResolvedValue(AGENT_ID)
  mockGetById.mockResolvedValue(DETAIL)
  mockToRecord.mockReturnValue(RECORD)
  mockToSummary.mockReturnValue(SUMMARY)
  mockTrack.mockResolvedValue({ created: true, tracked: TRACKED })
  // The retry runs the action once, as when nothing conflicts
  mockRetry.mockImplementation((action) => action())
})

describe("agentPropertyService.track", () => {
  it("answers created and the tracked property with the summary of the listing", async () => {
    await expect(agentPropertyService.track(USER_ID, "mock-1")).resolves.toEqual({
      created: true,
      trackedProperty: { trackedId: 9, addedAt: TRACKED.created_at, property: SUMMARY },
    })
  })

  it("answers created = false for a property that the agent tracked already", async () => {
    mockTrack.mockResolvedValue({ created: false, tracked: TRACKED })

    const result = await agentPropertyService.track(USER_ID, "mock-1")

    expect(result.created).toBe(false)
    expect(result.trackedProperty.trackedId).toBe(9)
  })

  it("finds the profile of the user", async () => {
    await agentPropertyService.track(USER_ID, "mock-1")

    expect(mockFindAgentId).toHaveBeenCalledWith(USER_ID)
  })

  it("asks the provider for the listing by its id", async () => {
    await agentPropertyService.track(USER_ID, "mock-1")

    expect(mockGetById).toHaveBeenCalledWith("mock-1")
  })

  it("tracks the snapshot of the listing for the agent", async () => {
    await agentPropertyService.track(USER_ID, "mock-1")

    expect(mockToRecord).toHaveBeenCalledWith(DETAIL)
    expect(mockTrack).toHaveBeenCalledWith(AGENT_ID, RECORD)
  })

  it("takes the summary from the listing of the provider", async () => {
    await agentPropertyService.track(USER_ID, "mock-1")

    expect(mockToSummary).toHaveBeenCalledWith(DETAIL)
  })

  it("goes through the retry with the number of attempts that is set", async () => {
    await agentPropertyService.track(USER_ID, "mock-1")

    expect(mockRetry).toHaveBeenCalledTimes(1)
    expect(mockRetry).toHaveBeenCalledWith(expect.any(Function), TRACK_PROPERTY_MAX_ATTEMPTS)
  })

  it("answers 409 for an account with no profile, and neither asks the provider nor writes", async () => {
    mockFindAgentId.mockResolvedValue(null)

    await expect(agentPropertyService.track(USER_ID, "mock-1")).rejects.toMatchObject({
      statusCode: 409,
      message: AGENT_ERROR_NO_PROFILE,
    })
    expect(mockGetById).not.toHaveBeenCalled()
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it("passes a 404 of the provider on and writes nothing", async () => {
    mockGetById.mockRejectedValue(new AppError("Property not found.", 404))

    await expect(agentPropertyService.track(USER_ID, "mock-1")).rejects.toMatchObject({ statusCode: 404 })
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it("passes an error of the repository on", async () => {
    mockTrack.mockRejectedValue(new Error("database is down"))

    await expect(agentPropertyService.track(USER_ID, "mock-1")).rejects.toThrow("database is down")
  })

  it("passes an error of the look-up of the profile on and does not ask the provider", async () => {
    mockFindAgentId.mockRejectedValue(new Error("database is down"))

    await expect(agentPropertyService.track(USER_ID, "mock-1")).rejects.toThrow("database is down")
    expect(mockGetById).not.toHaveBeenCalled()
  })

  it("passes on the error that the retry gives up with", async () => {
    mockRetry.mockRejectedValue(new Error("still conflicting"))

    await expect(agentPropertyService.track(USER_ID, "mock-1")).rejects.toThrow("still conflicting")
  })
})

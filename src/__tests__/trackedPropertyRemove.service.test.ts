import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import { AGENT_ERROR_NO_PROFILE, AGENT_ERROR_TRACKED_NOT_FOUND } from "../constants/agentProperty.js"

// The two repositories are replaced with fakes, so these tests only cover what the service decides. The
// service is loaded AFTER the fakes are registered (see savedProperty.service.test.ts for why).
const mockFindAgentId = jest.fn<(userId: number) => Promise<number | null>>()
const mockDeleteForAgent = jest.fn<(agentId: number, trackedId: number) => Promise<number>>()

let trackedPropertyRemoveService: typeof import("../services/trackedPropertyRemove.service.js").trackedPropertyRemoveService

beforeAll(async () => {
  jest.doMock("../repositories/agentProperty.repository.js", () => ({
    agentPropertyRepository: { findAgentId: (userId: number) => mockFindAgentId(userId) },
  }))
  jest.doMock("../repositories/trackedPropertyRemove.repository.js", () => ({
    trackedPropertyRemoveRepository: {
      deleteForAgent: (agentId: number, trackedId: number) => mockDeleteForAgent(agentId, trackedId),
    },
  }))

  const loaded = await import("../services/trackedPropertyRemove.service.js")
  trackedPropertyRemoveService = loaded.trackedPropertyRemoveService
})

const USER_ID = 7
const AGENT_ID = 5
const TRACKED_ID = 12

beforeEach(() => {
  mockFindAgentId.mockReset()
  mockDeleteForAgent.mockReset()

  mockFindAgentId.mockResolvedValue(AGENT_ID)
  mockDeleteForAgent.mockResolvedValue(1)
})

const remove = () => trackedPropertyRemoveService.remove(USER_ID, TRACKED_ID)

describe("trackedPropertyRemoveService.remove", () => {
  it("answers nothing when the row was removed", async () => {
    await expect(remove()).resolves.toBeUndefined()
  })

  it("finds the profile of the user", async () => {
    await remove()

    expect(mockFindAgentId).toHaveBeenCalledWith(USER_ID)
  })

  it("removes the row with that id for the agent that the profile belongs to", async () => {
    await remove()

    expect(mockDeleteForAgent).toHaveBeenCalledTimes(1)
    expect(mockDeleteForAgent).toHaveBeenCalledWith(AGENT_ID, TRACKED_ID)
  })

  it("answers 409 for an account with no profile, and removes nothing", async () => {
    mockFindAgentId.mockResolvedValue(null)

    await expect(remove()).rejects.toMatchObject({ statusCode: 409, message: AGENT_ERROR_NO_PROFILE })
    expect(mockDeleteForAgent).not.toHaveBeenCalled()
  })

  it("answers 404 when no row was removed: it does not exist, or it is another agent's", async () => {
    mockDeleteForAgent.mockResolvedValue(0)

    await expect(remove()).rejects.toMatchObject({ statusCode: 404, message: AGENT_ERROR_TRACKED_NOT_FOUND })
  })

  it("passes an error of the removal on", async () => {
    mockDeleteForAgent.mockRejectedValue(new Error("database is down"))

    await expect(remove()).rejects.toThrow("database is down")
  })

  it("passes an error of the look-up of the profile on, and removes nothing", async () => {
    mockFindAgentId.mockRejectedValue(new Error("database is down"))

    await expect(remove()).rejects.toThrow("database is down")
    expect(mockDeleteForAgent).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"

// Prisma is replaced with a fake, so these tests check what is asked of the database. The repository is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockDeleteMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
// Nothing but the row of the watchlist may go: these must never be called
const mockOtherDelete = jest.fn<(args: unknown) => Promise<unknown>>()

let trackedPropertyRemoveRepository: typeof import("../repositories/trackedPropertyRemove.repository.js").trackedPropertyRemoveRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      agentTrackedProperty: { deleteMany: (args: unknown) => mockDeleteMany(args) },
      property: {
        delete: (args: unknown) => mockOtherDelete(args),
        deleteMany: (args: unknown) => mockOtherDelete(args),
      },
      openHouse: { deleteMany: (args: unknown) => mockOtherDelete(args) },
    },
  }))

  const loaded = await import("../repositories/trackedPropertyRemove.repository.js")
  trackedPropertyRemoveRepository = loaded.trackedPropertyRemoveRepository
})

beforeEach(() => {
  mockDeleteMany.mockReset()
  mockOtherDelete.mockReset()
  mockDeleteMany.mockResolvedValue({ count: 1 })
})

describe("trackedPropertyRemoveRepository.deleteForAgent", () => {
  it("removes the row with this id, and only when it belongs to this agent", async () => {
    await trackedPropertyRemoveRepository.deleteForAgent(5, 12)

    expect(mockDeleteMany).toHaveBeenCalledTimes(1)
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { tracked_id: 12, agent_id: 5 } })
  })

  it("answers how many rows were removed", async () => {
    await expect(trackedPropertyRemoveRepository.deleteForAgent(5, 12)).resolves.toBe(1)
  })

  it("answers 0 when no row matched: it does not exist, or it belongs to another agent", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 })

    await expect(trackedPropertyRemoveRepository.deleteForAgent(5, 12)).resolves.toBe(0)
  })

  it("never touches the property or its open houses", async () => {
    await trackedPropertyRemoveRepository.deleteForAgent(5, 12)

    expect(mockOtherDelete).not.toHaveBeenCalled()
  })

  it("passes an error on", async () => {
    mockDeleteMany.mockRejectedValue(new Error("boom"))

    await expect(trackedPropertyRemoveRepository.deleteForAgent(5, 12)).rejects.toThrow("boom")
  })
})

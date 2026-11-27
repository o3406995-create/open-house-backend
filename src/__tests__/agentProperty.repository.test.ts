import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { PropertyRecordInput } from "../mappers/propertyRecordMapper.js"

// Prisma is replaced with a fake, so these tests check what is asked of the database and what is done
// with the answers. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
type Call = (args: unknown) => Promise<unknown>

const mockProfileFindUnique = jest.fn<Call>()
const mockUpsert = jest.fn<Call>()
const mockTrackedFindUnique = jest.fn<Call>()
const mockTrackedCreate = jest.fn<Call>()
const mockTransaction = jest.fn<(arg: unknown) => Promise<unknown>>()

// What the callback of a transaction gets
const tx = {
  property: { upsert: (args: unknown) => mockUpsert(args) },
  agentTrackedProperty: {
    findUnique: (args: unknown) => mockTrackedFindUnique(args),
    create: (args: unknown) => mockTrackedCreate(args),
  },
}

let agentPropertyRepository: typeof import("../repositories/agentProperty.repository.js").agentPropertyRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      $transaction: (arg: unknown) => mockTransaction(arg),
      agentProfile: { findUnique: (args: unknown) => mockProfileFindUnique(args) },
    },
  }))

  const loaded = await import("../repositories/agentProperty.repository.js")
  agentPropertyRepository = loaded.agentPropertyRepository
})

const AGENT_ID = 5
const RECORD = {
  external_id: "mock-1",
  source: "mock",
  address: "1 Example Street",
} as unknown as PropertyRecordInput
const TRACKED = {
  tracked_id: 9,
  agent_id: AGENT_ID,
  property_id: 3,
  created_at: new Date("2026-11-27T05:00:00.000Z"),
}

beforeEach(() => {
  mockProfileFindUnique.mockReset()
  mockUpsert.mockReset()
  mockTrackedFindUnique.mockReset()
  mockTrackedCreate.mockReset()
  mockTransaction.mockReset()

  mockProfileFindUnique.mockResolvedValue({ agent_id: AGENT_ID })
  mockUpsert.mockResolvedValue({ property_id: 3 })
  mockTrackedFindUnique.mockResolvedValue(null)
  mockTrackedCreate.mockResolvedValue(TRACKED)
  mockTransaction.mockImplementation(async (arg) =>
    (arg as (client: typeof tx) => Promise<unknown>)(tx),
  )
})

describe("agentPropertyRepository.findAgentId", () => {
  it("answers the id of the profile of the user", async () => {
    await expect(agentPropertyRepository.findAgentId(7)).resolves.toBe(AGENT_ID)
  })

  it("looks the profile up by the id of the user", async () => {
    await agentPropertyRepository.findAgentId(7)

    expect(mockProfileFindUnique).toHaveBeenCalledWith({ where: { user_id: 7 }, select: { agent_id: true } })
  })

  it("answers null for an account with no profile", async () => {
    mockProfileFindUnique.mockResolvedValue(null)

    await expect(agentPropertyRepository.findAgentId(7)).resolves.toBeNull()
  })
})

describe("agentPropertyRepository.trackForAgent", () => {
  it("refreshes the snapshot of the property by its source and id", async () => {
    await agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { source_external_id: { source: "mock", external_id: "mock-1" } },
      create: RECORD,
      update: RECORD,
    })
  })

  it("looks for a row of this agent and of the property that the snapshot belongs to", async () => {
    await agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)

    expect(mockTrackedFindUnique).toHaveBeenCalledWith({
      where: { agent_id_property_id: { agent_id: AGENT_ID, property_id: 3 } },
    })
  })

  it("makes the row when there is none, and says it was created", async () => {
    await expect(agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)).resolves.toEqual({
      created: true,
      tracked: TRACKED,
    })
    expect(mockTrackedCreate).toHaveBeenCalledWith({ data: { agent_id: AGENT_ID, property_id: 3 } })
  })

  it("makes nothing when the agent tracks the property already, and says it was not created", async () => {
    const existing = { ...TRACKED, tracked_id: 4 }
    mockTrackedFindUnique.mockResolvedValue(existing)

    await expect(agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)).resolves.toEqual({
      created: false,
      tracked: existing,
    })
    expect(mockTrackedCreate).not.toHaveBeenCalled()
  })

  it("does everything in one transaction", async () => {
    await agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)

    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it("passes an error of the snapshot on and makes no row", async () => {
    mockUpsert.mockRejectedValue(new Error("boom"))

    await expect(agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)).rejects.toThrow("boom")
    expect(mockTrackedCreate).not.toHaveBeenCalled()
  })

  it("passes an error of the row on, so that the transaction is undone", async () => {
    mockTrackedCreate.mockRejectedValue(new Error("boom"))

    await expect(agentPropertyRepository.trackForAgent(AGENT_ID, RECORD)).rejects.toThrow("boom")
  })
})

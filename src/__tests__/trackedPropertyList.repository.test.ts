import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"

// Prisma is replaced with a fake, so these tests check what is asked of the database and what is done
// with the answers. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
type Call = (args: unknown) => Promise<unknown>

const mockFindMany = jest.fn<Call>()
const mockCount = jest.fn<Call>()
const mockTransaction = jest.fn<(arg: unknown) => Promise<unknown>>()

let trackedPropertyListRepository: typeof import("../repositories/trackedPropertyList.repository.js").trackedPropertyListRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      $transaction: (arg: unknown) => mockTransaction(arg),
      agentTrackedProperty: {
        findMany: (args: unknown) => mockFindMany(args),
        count: (args: unknown) => mockCount(args),
      },
    },
  }))

  const loaded = await import("../repositories/trackedPropertyList.repository.js")
  trackedPropertyListRepository = loaded.trackedPropertyListRepository
})

const AGENT_ID = 5
const ROW = { tracked_id: 9, property_id: 3, property: { external_id: "mock-1" } }
const WHERE = { agent_id: AGENT_ID, property: { external_id: { not: null }, source: { not: null } } }

beforeEach(() => {
  mockFindMany.mockReset()
  mockCount.mockReset()
  mockTransaction.mockReset()

  mockFindMany.mockResolvedValue([ROW])
  mockCount.mockResolvedValue(1)
  // The two queries are made when the array is built; the transaction only waits for both
  mockTransaction.mockImplementation((arg) => Promise.all(arg as Promise<unknown>[]))
})

const firstArg = (mock: { mock: { calls: unknown[][] } }) => mock.mock.calls[0]?.[0]

describe("trackedPropertyListRepository.listForAgent", () => {
  it("asks for the rows of this agent whose property can be matched to an external listing", async () => {
    await trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)

    expect(firstArg(mockFindMany)).toMatchObject({ where: WHERE })
  })

  it("counts the rows with the same condition, so that the total is of the rows that can be shown", async () => {
    await trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)

    expect(mockCount).toHaveBeenCalledWith({ where: WHERE })
  })

  it("loads the property of each row and nothing else: no user, no note", async () => {
    await trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)

    expect((firstArg(mockFindMany) as { include: unknown }).include).toEqual({ property: true })
  })

  it("lists the newest first, and by id when two were made at the same moment", async () => {
    await trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)

    expect(firstArg(mockFindMany)).toMatchObject({
      orderBy: [{ created_at: "desc" }, { tracked_id: "desc" }],
    })
  })

  it.each([
    [1, 20, 0],
    [2, 20, 20],
    [3, 10, 20],
  ])("for page %i of size %i skips %i rows", async (page, pageSize, skip) => {
    await trackedPropertyListRepository.listForAgent(AGENT_ID, page, pageSize)

    expect(firstArg(mockFindMany)).toMatchObject({ skip, take: pageSize })
  })

  it("answers the rows and the total", async () => {
    await expect(trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)).resolves.toEqual({
      records: [ROW],
      total: 1,
    })
  })

  it("reads both in one transaction", async () => {
    await trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockTransaction.mock.calls[0]?.[0]).toHaveLength(2)
  })

  it("passes an error on", async () => {
    mockFindMany.mockRejectedValue(new Error("boom"))

    await expect(trackedPropertyListRepository.listForAgent(AGENT_ID, 1, 20)).rejects.toThrow("boom")
  })
})

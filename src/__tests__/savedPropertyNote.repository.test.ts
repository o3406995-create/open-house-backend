import { describe, it, expect, jest, beforeAll } from "@jest/globals"

// Prisma is replaced with a fake, so this checks the query that is sent, not the database. The
// repository is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()
const mockCount = jest.fn<(args: unknown) => Promise<number>>()

let savedPropertyRepository: typeof import("../repositories/savedProperty.repository.js").savedPropertyRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
      savedProperty: {
        findMany: (args: unknown) => mockFindMany(args),
        count: (args: unknown) => mockCount(args),
      },
    },
  }))

  const loaded = await import("../repositories/savedProperty.repository.js")
  savedPropertyRepository = loaded.savedPropertyRepository
})

describe("savedPropertyRepository.listForUser: the note", () => {
  it("loads the property and the note of each saved property in the same query", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await savedPropertyRepository.listForUser(7, 2, 10)

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ user_id: 7 }),
        include: {
          property: true,
          note: { select: { note_id: true, content: true, updated_at: true } },
        },
        skip: 10,
        take: 10,
      }),
    )
  })

  it("returns the records and the total", async () => {
    mockFindMany.mockResolvedValue([{ id: 1 }])
    mockCount.mockResolvedValue(11)

    expect(await savedPropertyRepository.listForUser(7, 1, 10)).toEqual({
      records: [{ id: 1 }],
      total: 11,
    })
  })
})

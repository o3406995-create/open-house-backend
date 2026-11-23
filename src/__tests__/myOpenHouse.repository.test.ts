import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import { MY_OPEN_HOUSES_LIMIT } from "../constants/myOpenHouse.js"

// Prisma is replaced with a fake, so these tests check the queries that are sent and what is
// done with the rows, not the database. The repository is loaded AFTER the fake is
// registered (see savedProperty.service.test.ts for why).
const mockFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()
const mockFindFirst = jest.fn<(args: unknown) => Promise<unknown>>()
const mockUserOpenHouseUpdateMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
const mockUserOpenHouseDeleteMany = jest.fn<(args: unknown) => Promise<{ count: number }>>()
const mockOpenHouseUpdate = jest.fn<(args: unknown) => Promise<unknown>>()
const mockOpenHouseUpdateMany = jest.fn<(args: unknown) => Promise<unknown>>()
const mockOpenHouseDelete = jest.fn<(args: unknown) => Promise<unknown>>()
const mockOpenHouseDeleteMany = jest.fn<(args: unknown) => Promise<unknown>>()
const mockPropertyDelete = jest.fn<(args: unknown) => Promise<unknown>>()
const mockPropertyDeleteMany = jest.fn<(args: unknown) => Promise<unknown>>()

let myOpenHouseRepository: typeof import("../repositories/myOpenHouse.repository.js").myOpenHouseRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      userOpenHouse: {
        findMany: (args: unknown) => mockFindMany(args),
        findFirst: (args: unknown) => mockFindFirst(args),
        updateMany: (args: unknown) => mockUserOpenHouseUpdateMany(args),
        deleteMany: (args: unknown) => mockUserOpenHouseDeleteMany(args),
      },
      openHouse: {
        update: (args: unknown) => mockOpenHouseUpdate(args),
        updateMany: (args: unknown) => mockOpenHouseUpdateMany(args),
        delete: (args: unknown) => mockOpenHouseDelete(args),
        deleteMany: (args: unknown) => mockOpenHouseDeleteMany(args),
      },
      property: {
        delete: (args: unknown) => mockPropertyDelete(args),
        deleteMany: (args: unknown) => mockPropertyDeleteMany(args),
      },
    },
  }))

  const loaded = await import("../repositories/myOpenHouse.repository.js")
  myOpenHouseRepository = loaded.myOpenHouseRepository
})

describe("myOpenHouseRepository.listForUser", () => {
  it("only asks for the rows of the user, with the open house and its property", async () => {
    mockFindMany.mockResolvedValue([])

    await myOpenHouseRepository.listForUser(7)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 7 },
        include: { openHouse: { include: { property: true } } },
      }),
    )
  })

  it("keeps the most recent entries when there are more than the cap", async () => {
    mockFindMany.mockResolvedValue([])

    await myOpenHouseRepository.listForUser(7)

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: MY_OPEN_HOUSES_LIMIT,
        orderBy: [{ openHouse: { start_datetime: "desc" } }, { user_openHouse_id: "desc" }],
      }),
    )
  })

  it("returns the rows earliest first", async () => {
    // The database answers newest first
    mockFindMany.mockResolvedValue([{ id: 3 }, { id: 2 }, { id: 1 }])

    expect(await myOpenHouseRepository.listForUser(7)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it("returns an empty list when the user has none", async () => {
    mockFindMany.mockResolvedValue([])

    expect(await myOpenHouseRepository.listForUser(7)).toEqual([])
  })
})

describe("myOpenHouseRepository.findForUser", () => {
  it("only looks at the entry with that id that belongs to the user, with its open house and property", async () => {
    mockFindFirst.mockResolvedValue(null)

    await myOpenHouseRepository.findForUser(7, 3)

    expect(mockFindFirst).toHaveBeenCalledTimes(1)
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { user_openHouse_id: 3, user_id: 7 },
      include: { openHouse: { include: { property: true } } },
    })
  })

  it("returns the row, or null when there is none", async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 3 })
    expect(await myOpenHouseRepository.findForUser(7, 3)).toEqual({ id: 3 })

    mockFindFirst.mockResolvedValueOnce(null)
    expect(await myOpenHouseRepository.findForUser(7, 3)).toBeNull()
  })
})

describe("myOpenHouseRepository.markAttended", () => {
  it("updates only the entry with that id that belongs to the user and is not attended yet, to ATTENDED", async () => {
    mockUserOpenHouseUpdateMany.mockResolvedValue({ count: 1 })

    await myOpenHouseRepository.markAttended(7, 3)

    expect(mockUserOpenHouseUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockUserOpenHouseUpdateMany).toHaveBeenCalledWith({
      where: { user_openHouse_id: 3, user_id: 7, status: { not: "ATTENDED" } },
      data: { status: "ATTENDED" },
    })
  })

  it("returns how many rows were updated", async () => {
    mockUserOpenHouseUpdateMany.mockResolvedValueOnce({ count: 1 })
    expect(await myOpenHouseRepository.markAttended(7, 3)).toBe(1)

    mockUserOpenHouseUpdateMany.mockResolvedValueOnce({ count: 0 })
    expect(await myOpenHouseRepository.markAttended(7, 3)).toBe(0)
  })

  it("does not change the open house", async () => {
    mockUserOpenHouseUpdateMany.mockResolvedValue({ count: 1 })

    await myOpenHouseRepository.markAttended(7, 3)

    expect(mockOpenHouseUpdate).not.toHaveBeenCalled()
    expect(mockOpenHouseUpdateMany).not.toHaveBeenCalled()
  })
})

describe("myOpenHouseRepository.deleteForUser", () => {
  it("deletes only the entry with that id that belongs to the user", async () => {
    mockUserOpenHouseDeleteMany.mockResolvedValue({ count: 1 })

    await myOpenHouseRepository.deleteForUser(7, 3)

    expect(mockUserOpenHouseDeleteMany).toHaveBeenCalledTimes(1)
    expect(mockUserOpenHouseDeleteMany).toHaveBeenCalledWith({
      where: { user_openHouse_id: 3, user_id: 7 },
    })
  })

  it("returns how many rows were deleted", async () => {
    mockUserOpenHouseDeleteMany.mockResolvedValueOnce({ count: 1 })
    expect(await myOpenHouseRepository.deleteForUser(7, 3)).toBe(1)

    mockUserOpenHouseDeleteMany.mockResolvedValueOnce({ count: 0 })
    expect(await myOpenHouseRepository.deleteForUser(7, 3)).toBe(0)
  })

  it("never deletes the open house or the property the entry points to", async () => {
    mockUserOpenHouseDeleteMany.mockResolvedValue({ count: 1 })

    await myOpenHouseRepository.deleteForUser(7, 3)

    expect(mockOpenHouseDelete).not.toHaveBeenCalled()
    expect(mockOpenHouseDeleteMany).not.toHaveBeenCalled()
    expect(mockPropertyDelete).not.toHaveBeenCalled()
    expect(mockPropertyDeleteMany).not.toHaveBeenCalled()
  })
})

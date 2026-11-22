import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import { MY_OPEN_HOUSES_LIMIT } from "../constants/myOpenHouse.js"

// Prisma is replaced with a fake, so these tests check the query that is sent and what is
// done with the rows, not the database. The repository is loaded AFTER the fake is
// registered (see savedProperty.service.test.ts for why).
const mockFindMany = jest.fn<(args: unknown) => Promise<unknown[]>>()

let myOpenHouseRepository: typeof import("../repositories/myOpenHouse.repository.js").myOpenHouseRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: { userOpenHouse: { findMany: (args: unknown) => mockFindMany(args) } },
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

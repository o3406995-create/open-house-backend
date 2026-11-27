import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"

// Prisma is replaced with a fake, and so is the generated client that holds the two tags of the raw query:
// they are written down as data, so that the query can be read in the tests. Whether the query is right
// for a real database is checked on one, not here. The repository is loaded AFTER the fakes are
// registered (see savedProperty.service.test.ts for why).
type Call = (args: unknown) => Promise<unknown>

const mockGroupBy = jest.fn<Call>()
const mockQueryRaw = jest.fn<Call>()
const mockOpenHouseFindMany = jest.fn<Call>()

// What the fake of Prisma.sql builds: the text between the values, and the values
interface FakeSql {
  strings: string[]
  values: unknown[]
}

let propertyInterestRepository: typeof import("../repositories/propertyInterest.repository.js").propertyInterestRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      savedProperty: { groupBy: (args: unknown) => mockGroupBy(args) },
      openHouse: { findMany: (args: unknown) => mockOpenHouseFindMany(args) },
      $queryRaw: (query: unknown) => mockQueryRaw(query),
    },
  }))
  jest.doMock("../generated/prisma/client.js", () => ({
    Prisma: {
      sql: (strings: TemplateStringsArray, ...values: unknown[]): FakeSql => ({ strings: [...strings], values }),
      join: (items: unknown[]) => ({ join: items }),
    },
  }))

  const loaded = await import("../repositories/propertyInterest.repository.js")
  propertyInterestRepository = loaded.propertyInterestRepository
})

beforeEach(() => {
  mockGroupBy.mockReset()
  mockQueryRaw.mockReset()
  mockOpenHouseFindMany.mockReset()

  mockGroupBy.mockResolvedValue([])
  mockQueryRaw.mockResolvedValue([])
  mockOpenHouseFindMany.mockResolvedValue([])
})

const NOW = new Date("2026-11-28T00:00:00.000Z")
// The text of the query that was sent, with ? where a value is
const queryText = () => (mockQueryRaw.mock.calls[0]?.[0] as FakeSql).strings.join("?")
const queryValues = () => (mockQueryRaw.mock.calls[0]?.[0] as FakeSql).values

describe("propertyInterestRepository.saveCounts", () => {
  it("answers how many users saved each property", async () => {
    mockGroupBy.mockResolvedValue([
      { property_id: 3, _count: { _all: 4 } },
      { property_id: 5, _count: { _all: 1 } },
    ])

    const counts = await propertyInterestRepository.saveCounts([3, 5])

    expect(counts).toEqual(new Map([[3, 4], [5, 1]]))
  })

  it("counts by property, among the properties that were asked for", async () => {
    await propertyInterestRepository.saveCounts([3, 5])

    expect(mockGroupBy).toHaveBeenCalledWith({
      by: ["property_id"],
      where: { property_id: { in: [3, 5] } },
      _count: { _all: true },
    })
  })

  it("has no entry for a property that nobody saved", async () => {
    mockGroupBy.mockResolvedValue([{ property_id: 3, _count: { _all: 4 } }])

    const counts = await propertyInterestRepository.saveCounts([3, 5])

    expect(counts.has(5)).toBe(false)
  })

  it("asks nothing when there are no properties", async () => {
    await expect(propertyInterestRepository.saveCounts([])).resolves.toEqual(new Map())
    expect(mockGroupBy).not.toHaveBeenCalled()
  })
})

describe("propertyInterestRepository.interestCounts", () => {
  it("answers how many users showed an interest in each property", async () => {
    mockQueryRaw.mockResolvedValue([{ property_id: 3, total: 2 }, { property_id: 5, total: 1 }])

    await expect(propertyInterestRepository.interestCounts([3, 5])).resolves.toEqual(new Map([[3, 2], [5, 1]]))
  })

  it("turns the BigInt that the database sends for a COUNT into a number", async () => {
    mockQueryRaw.mockResolvedValue([{ property_id: BigInt(3), total: BigInt(2) }])

    const counts = await propertyInterestRepository.interestCounts([3])

    expect(counts.get(3)).toBe(2)
  })

  it("counts each user once for a property, however many of its open houses the user added", async () => {
    await propertyInterestRepository.interestCounts([3])

    expect(queryText()).toContain("COUNT(DISTINCT uoh.user_id)")
    expect(queryText()).toContain("GROUP BY oh.property_id")
  })

  it("selects only the property and the number: no column about a user", async () => {
    await propertyInterestRepository.interestCounts([3])

    expect(queryText()).toMatch(
      /SELECT\s+oh\.property_id AS property_id,\s+COUNT\(DISTINCT uoh\.user_id\) AS total\s+FROM/,
    )
  })

  it("hands the ids over as values of the query, not as text in it", async () => {
    await propertyInterestRepository.interestCounts([3, 5])

    expect(queryValues()).toEqual([{ join: [3, 5] }])
    expect(queryText()).not.toMatch(/\b3\b|\b5\b/)
  })

  it("asks nothing when there are no properties", async () => {
    await expect(propertyInterestRepository.interestCounts([])).resolves.toEqual(new Map())
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })
})

describe("propertyInterestRepository.upcomingOpenHouses", () => {
  it("asks for the open houses that are scheduled, not finished and have an id at the data source, earliest first", async () => {
    await propertyInterestRepository.upcomingOpenHouses([3, 5], NOW)

    expect(mockOpenHouseFindMany).toHaveBeenCalledWith({
      where: {
        property_id: { in: [3, 5] },
        status: "SCHEDULED",
        end_datetime: { gt: NOW },
        external_id: { not: null },
      },
      select: {
        property_id: true,
        external_id: true,
        start_datetime: true,
        end_datetime: true,
        status: true,
      },
      orderBy: [{ start_datetime: "asc" }, { openhouse_id: "asc" }],
    })
  })

  it("answers what the query answers", async () => {
    const rows = [{ property_id: 3, external_id: "mock-3-0" }]
    mockOpenHouseFindMany.mockResolvedValue(rows)

    await expect(propertyInterestRepository.upcomingOpenHouses([3], NOW)).resolves.toEqual(rows)
  })

  it("asks nothing when there are no properties", async () => {
    await expect(propertyInterestRepository.upcomingOpenHouses([], NOW)).resolves.toEqual([])
    expect(mockOpenHouseFindMany).not.toHaveBeenCalled()
  })
})

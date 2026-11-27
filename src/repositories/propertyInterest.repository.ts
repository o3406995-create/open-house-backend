import { prisma } from "../lib/prisma.js"
import { Prisma } from "../generated/prisma/client.js"
import { OPEN_HOUSE_STATUS_SCHEDULED } from "../constants/myOpenHouse.js"

interface CountRow {
  property_id: number | bigint
  total: number | bigint
}

// What the database sends for a COUNT can be a BigInt, which is not a number and cannot be put in JSON
const countsOf = (rows: CountRow[]) =>
  new Map<number, number>(rows.map((row) => [Number(row.property_id), Number(row.total)]))

// Figures about the interest of the users in properties, for a set of properties at a time. They are
// numbers only: nothing about a user, a note or a person leaves this file.
export const propertyInterestRepository = {
  // How many users saved each property. A user can save a property once, so a row is a user.
  saveCounts: async (propertyIds: number[]): Promise<Map<number, number>> => {
    if (propertyIds.length === 0) return new Map()

    const rows = await prisma.savedProperty.groupBy({
      by: ["property_id"],
      where: { property_id: { in: propertyIds } },
      _count: { _all: true },
    })

    return new Map(rows.map((row) => [row.property_id, row._count._all]))
  },

  // How many different users added an open house of each property to My Open Houses, whatever
  // that open house is now (past, cancelled or still to come). A user who added several open houses
  // of one property counts once. Counted by the database: Prisma cannot count distinct users across
  // the open houses of a property.
  interestCounts: async (propertyIds: number[]): Promise<Map<number, number>> => {
    if (propertyIds.length === 0) return new Map()

    const rows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT oh.property_id AS property_id, COUNT(DISTINCT uoh.user_id) AS total
      FROM UserOpenHouse uoh
      JOIN OpenHouse oh ON oh.openhouse_id = uoh.openhouse_id
      WHERE oh.property_id IN (${Prisma.join(propertyIds)})
      GROUP BY oh.property_id
    `)

    return countsOf(rows)
  },

  // The open houses of these properties that are still to come (scheduled and not finished), earliest
  // first. One that has no id at the data source cannot be shown and is left out.
  upcomingOpenHouses: (propertyIds: number[], now: Date) => {
    if (propertyIds.length === 0) return Promise.resolve([])

    return prisma.openHouse.findMany({
      where: {
        property_id: { in: propertyIds },
        status: OPEN_HOUSE_STATUS_SCHEDULED,
        end_datetime: { gt: now },
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
  },
}

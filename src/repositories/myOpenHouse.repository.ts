import { prisma } from "../lib/prisma.js"
import type { PropertyRecordInput } from "../mappers/propertyRecordMapper.js"
import type { OpenHouseRecordInput } from "../mappers/openHouseRecordMapper.js"
import { MY_OPEN_HOUSES_LIMIT } from "../constants/myOpenHouse.js"

export const myOpenHouseRepository = {
  // One transaction: refresh the property and open house snapshots, then create the user's
  // row unless it already exists. Returns created = false for a repeated add.
  addForUser: (
    user_id: number,
    propertyRecord: PropertyRecordInput,
    openHouseRecord: OpenHouseRecordInput,
  ) => {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.upsert({
        where: {
          source_external_id: {
            source: propertyRecord.source,
            external_id: propertyRecord.external_id,
          },
        },
        create: propertyRecord,
        update: propertyRecord,
      })

      // The open house id is only unique within its property
      const openHouse = await tx.openHouse.upsert({
        where: {
          property_id_external_id: {
            property_id: property.property_id,
            external_id: openHouseRecord.external_id,
          },
        },
        create: { ...openHouseRecord, property_id: property.property_id },
        update: openHouseRecord,
      })

      const existing = await tx.userOpenHouse.findUnique({
        where: {
          user_id_openhouse_id: { user_id, openhouse_id: openHouse.openhouse_id },
        },
      })

      if (existing) {
        return { created: false, userOpenHouse: existing }
      }

      const userOpenHouse = await tx.userOpenHouse.create({
        data: { user_id, openhouse_id: openHouse.openhouse_id },
      })

      return { created: true, userOpenHouse }
    })
  },

  // The user's own open houses with the stored snapshots, earliest first. When there are
  // more than the cap, the most recent ones are kept: finished open houses pile up over time
  // and are the ones that can be left out. So the newest are fetched first and then turned
  // around.
  listForUser: async (user_id: number) => {
    const rows = await prisma.userOpenHouse.findMany({
      where: { user_id },
      include: { openHouse: { include: { property: true } } },
      orderBy: [{ openHouse: { start_datetime: "desc" } }, { user_openHouse_id: "desc" }],
      take: MY_OPEN_HOUSES_LIMIT,
    })

    return rows.reverse()
  },
}

import { prisma } from "../lib/prisma.js"
import type { PropertyRecordInput } from "../mappers/propertyRecordMapper.js"
import type { OpenHouseRecordInput } from "../mappers/openHouseRecordMapper.js"

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
}

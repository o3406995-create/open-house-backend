import { prisma } from "../lib/prisma.js"
import type { PropertyRecordInput } from "../mappers/propertyRecordMapper.js"

export const savedPropertyRepository = {
  // One transaction: refresh the property snapshot, then create the saved-property row
  // unless it already exists. Returns created = false for a repeated save.
  saveForUser: (user_id: number, record: PropertyRecordInput) => {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.upsert({
        where: {
          source_external_id: {
            source: record.source,
            external_id: record.external_id,
          },
        },
        create: record,
        update: record,
      })

      const existing = await tx.savedProperty.findUnique({
        where: {
          user_id_property_id: { user_id, property_id: property.property_id },
        },
      })

      if (existing) {
        return { created: false, savedProperty: existing }
      }

      const savedProperty = await tx.savedProperty.create({
        data: { user_id, property_id: property.property_id },
      })

      return { created: true, savedProperty }
    })
  },
}
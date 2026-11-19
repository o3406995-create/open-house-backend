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

  // The user's own saved properties, newest first, with the stored snapshot.
  // Only rows that can be matched to an external listing are returned.
  listForUser: async (user_id: number, page: number, pageSize: number) => {
    const where = {
      user_id,
      property: { external_id: { not: null }, source: { not: null } },
    }

    const [records, total] = await prisma.$transaction([
      prisma.savedProperty.findMany({
        where,
        include: { property: true },
        orderBy: [{ saved_at: "desc" }, { saved_property_id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.savedProperty.count({ where }),
    ])

    return { records, total }
  },

  // Deletes one saved property, but only when it belongs to the user. Returns how many
  // rows were deleted (0 when it does not exist or belongs to someone else).
  // The Property row it points to is never touched: other users may have saved it too.
  deleteForUser: async (user_id: number, saved_property_id: number) => {
    const result = await prisma.savedProperty.deleteMany({
      where: { saved_property_id, user_id },
    })
    return result.count
  },
}
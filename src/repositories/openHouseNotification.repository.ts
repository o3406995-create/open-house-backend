import { prisma } from "../lib/prisma.js"
import type { OpenHouseRecordInput } from "../mappers/openHouseRecordMapper.js"
import {
  NEW_OPEN_HOUSE_TYPE,
  NOTIFICATION_BATCH_SIZE,
} from "../constants/openHouseNotification.js"

export interface RecordOpenHousesInput {
  propertyId: number
  // The open houses that were not stored yet
  records: OpenHouseRecordInput[]
  // The external ids among them that the people who saved the property are told about
  notifyExternalIds: string[]
  message: string
  now: Date
}

function inBatches<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size))
  }
  return batches
}

export const openHouseNotificationRepository = {
  // The property with the external ids of the open houses stored for it; null when the property
  // is not stored at all (nobody saved it, nobody added one of its open houses)
  findSeen: (source: string, external_id: string) => {
    return prisma.property.findUnique({
      where: { source_external_id: { source, external_id } },
      select: {
        property_id: true,
        address: true,
        open_houses_seen_at: true,
        openHouses: { select: { external_id: true } },
      },
    })
  },

  // One transaction: store the new open houses, write a notification for every user who saved the
  // property and every open house to tell about, and note the time. A duplicate is skipped, so
  // two requests at the same moment cannot tell the same person twice. Nothing here touches the
  // open houses a user has added to My Open Houses.
  recordAndNotify: ({ propertyId, records, notifyExternalIds, message, now }: RecordOpenHousesInput) => {
    return prisma.$transaction(async (tx) => {
      if (records.length > 0) {
        await tx.openHouse.createMany({
          data: records.map((record) => ({ ...record, property_id: propertyId })),
          skipDuplicates: true,
        })
      }

      let notified = 0

      if (notifyExternalIds.length > 0) {
        const savers = await tx.savedProperty.findMany({
          where: { property_id: propertyId },
          select: { user_id: true },
        })
        const openHouses = await tx.openHouse.findMany({
          where: { property_id: propertyId, external_id: { in: notifyExternalIds } },
          select: { openhouse_id: true },
        })

        const rows = savers.flatMap(({ user_id }) =>
          openHouses.map(({ openhouse_id }) => ({
            user_id,
            property_id: propertyId,
            openhouse_id,
            type: NEW_OPEN_HOUSE_TYPE,
            message,
          })),
        )

        for (const batch of inBatches(rows, NOTIFICATION_BATCH_SIZE)) {
          const result = await tx.notification.createMany({ data: batch, skipDuplicates: true })
          notified += result.count
        }
      }

      await tx.property.update({
        where: { property_id: propertyId },
        data: { open_houses_seen_at: now },
      })

      return { notified }
    })
  },
}

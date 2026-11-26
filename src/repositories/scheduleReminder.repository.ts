import { prisma } from "../lib/prisma.js"
import { OPEN_HOUSE_STATUS_SCHEDULED } from "../constants/myOpenHouse.js"
import {
  NOTIFICATION_BATCH_SIZE,
  OPEN_HOUSE_REMINDER_TYPE,
  REMINDER_ROLE,
  UPCOMING_ENTRY_STATUS,
} from "../constants/openHouseNotification.js"

export interface NewReminderRow {
  user_id: number
  property_id: number
  openhouse_id: number
  message: string
}

export const scheduleReminderRepository = {
  // The entries of My Open Houses that are still UPCOMING and start within the window, of users who
  // are not deleted, with the time zone of the user and what a reminder needs. Only open houses that
  // are scheduled and can be shown (a listing and an open house with an external id) count.
  findDueCandidates: (from: Date, to: Date) => {
    return prisma.userOpenHouse.findMany({
      where: {
        status: UPCOMING_ENTRY_STATUS,
        user: { is_deleted: false, role: REMINDER_ROLE },
        openHouse: {
          status: OPEN_HOUSE_STATUS_SCHEDULED,
          external_id: { not: null },
          start_datetime: { gte: from, lt: to },
          property: { external_id: { not: null }, source: { not: null } },
        },
      },
      select: {
        user_id: true,
        openhouse_id: true,
        user: { select: { time_zone: true } },
        openHouse: {
          select: {
            property_id: true,
            start_datetime: true,
            property: { select: { address: true } },
          },
        },
      },
    })
  },

  // Writes the reminders in batches. One that exists already is skipped (the unique index on user,
  // open house and type), so the job can run as often as it likes. Returns how many were written.
  createReminders: async (rows: NewReminderRow[]) => {
    let created = 0

    for (let start = 0; start < rows.length; start += NOTIFICATION_BATCH_SIZE) {
      const batch = rows.slice(start, start + NOTIFICATION_BATCH_SIZE)
      const result = await prisma.notification.createMany({
        data: batch.map((row) => ({ ...row, type: OPEN_HOUSE_REMINDER_TYPE })),
        skipDuplicates: true,
      })
      created += result.count
    }

    return created
  },
}

import { prisma } from "../lib/prisma.js"

export const notificationRepository = {
  // One page of the user's own notifications, newest first, with the stored snapshot of the
  // property and the open house. Only rows that can be matched to an external listing and
  // open house count, so total and unreadCount agree with what the list can show.
  listForUser: async (user_id: number, page: number, pageSize: number) => {
    const where = {
      user_id,
      property: { external_id: { not: null }, source: { not: null } },
      openHouse: { external_id: { not: null } },
    }

    const [records, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        include: { property: true, openHouse: true },
        orderBy: [{ created_at: "desc" }, { notification_id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, is_read: false } }),
    ])

    return { records, total, unreadCount }
  },
}

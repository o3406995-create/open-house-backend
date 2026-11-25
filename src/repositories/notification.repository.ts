import { prisma } from "../lib/prisma.js"

// Only notifications about a listing and an open house that have an external id can be shown,
// so only those are read
const MATCHABLE = {
  property: { external_id: { not: null }, source: { not: null } },
  openHouse: { external_id: { not: null } },
}

export const notificationRepository = {
  // One page of the user's own notifications, newest first, with the stored snapshot of the
  // property and the open house. Only rows that can be shown count, so total and unreadCount
  // agree with what the list can show.
  listForUser: async (user_id: number, page: number, pageSize: number) => {
    const where = { user_id, ...MATCHABLE }

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

  // One of the user's own notifications that can be shown; null when it does not exist, belongs
  // to someone else or cannot be shown
  findForUser: (user_id: number, notification_id: number) => {
    return prisma.notification.findFirst({
      where: { notification_id, user_id, ...MATCHABLE },
      include: { property: true, openHouse: true },
    })
  },

  // Marks the user's own unread notification as read. Returns how many rows changed: 0 when it
  // was read already (or is not the user's).
  markRead: async (user_id: number, notification_id: number) => {
    const result = await prisma.notification.updateMany({
      where: { notification_id, user_id, is_read: false },
      data: { is_read: true },
    })
    return result.count
  },
}

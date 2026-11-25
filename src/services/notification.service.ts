import { notificationRepository } from "../repositories/notification.repository.js"
import { toNotificationItem } from "../mappers/notificationMapper.js"
import { AppError } from "../lib/AppError.js"
import { NOTIFICATION_ERROR_NOT_FOUND } from "../constants/notification.js"

export const notificationService = {
  list: async (userId: number, { page, pageSize }: { page: number; pageSize: number }) => {
    const { records, total, unreadCount } = await notificationRepository.listForUser(
      userId,
      page,
      pageSize,
    )

    return {
      notifications: records.map(toNotificationItem).filter((item) => item !== null),
      total,
      unreadCount,
      page,
      pageSize,
    }
  },

  // Marks one of the user's own notifications as read. "Does not exist", "belongs to someone
  // else" and "cannot be shown in the list" look the same on purpose, so ids of other users
  // cannot be probed. A notification that is read already is not an error: the answer is the same.
  markRead: async (userId: number, notificationId: number) => {
    const row = await notificationRepository.findForUser(userId, notificationId)
    const item = row === null ? null : toNotificationItem({ ...row, is_read: true })

    if (row === null || item === null) {
      throw new AppError(NOTIFICATION_ERROR_NOT_FOUND, 404)
    }

    if (!row.is_read) {
      await notificationRepository.markRead(userId, notificationId)
    }

    return item
  },
}

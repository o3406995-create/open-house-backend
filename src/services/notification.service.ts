import { notificationRepository } from "../repositories/notification.repository.js"
import { toNotificationItem } from "../mappers/notificationMapper.js"

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
}

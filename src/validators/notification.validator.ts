import { z } from "zod"
import { positiveIntIdSchema } from "./positiveIntId.js"
import {
  NOTIFICATION_DEFAULT_PAGE,
  NOTIFICATION_DEFAULT_PAGE_SIZE,
  NOTIFICATION_ERROR_ID,
  NOTIFICATION_ERROR_PAGE,
  NOTIFICATION_ERROR_PAGE_SIZE,
  NOTIFICATION_MAX_PAGE_SIZE,
} from "../constants/notification.js"

export const listNotificationsSchema = z.object({
  page: z.coerce
    .number()
    .int(NOTIFICATION_ERROR_PAGE)
    .min(1, NOTIFICATION_ERROR_PAGE)
    .default(NOTIFICATION_DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int(NOTIFICATION_ERROR_PAGE_SIZE)
    .min(1, NOTIFICATION_ERROR_PAGE_SIZE)
    .max(NOTIFICATION_MAX_PAGE_SIZE, NOTIFICATION_ERROR_PAGE_SIZE)
    .default(NOTIFICATION_DEFAULT_PAGE_SIZE),
})

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>

export const notificationIdParamSchema = z.object({
  notificationId: positiveIntIdSchema(NOTIFICATION_ERROR_ID),
})

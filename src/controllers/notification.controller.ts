import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { notificationService } from "../services/notification.service.js"
import {
  listNotificationsSchema,
  notificationIdParamSchema,
} from "../validators/notification.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const notificationController = {
  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listNotificationsSchema.safeParse(req.query)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const result = await notificationService.list(Number(req.userId), parsed.data)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },

  markRead: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = notificationIdParamSchema.safeParse(req.params)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const notification = await notificationService.markRead(
        Number(req.userId),
        parsed.data.notificationId,
      )
      return res.status(200).json({ notification })
    } catch (err) {
      next(err)
    }
  },
}

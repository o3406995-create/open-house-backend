import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { notificationService } from "../services/notification.service.js"
import { listNotificationsSchema } from "../validators/notification.validator.js"
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
}

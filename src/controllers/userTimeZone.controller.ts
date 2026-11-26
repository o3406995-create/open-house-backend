import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { userTimeZoneService } from "../services/userTimeZone.service.js"
import { setTimeZoneSchema } from "../validators/userTimeZone.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const userTimeZoneController = {
  set: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = setTimeZoneSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const result = await userTimeZoneService.set(Number(req.userId), parsed.data.timeZone)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },
}

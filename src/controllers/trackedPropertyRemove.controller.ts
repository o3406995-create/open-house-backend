import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { trackedPropertyRemoveService } from "../services/trackedPropertyRemove.service.js"
import { trackedIdParamSchema } from "../validators/agentProperty.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const trackedPropertyRemoveController = {
  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = trackedIdParamSchema.safeParse(req.params)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      await trackedPropertyRemoveService.remove(Number(req.userId), parsed.data.trackedId)
      return res.status(204).send()
    } catch (err) {
      next(err)
    }
  },
}

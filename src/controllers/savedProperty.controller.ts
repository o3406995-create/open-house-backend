import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { savedPropertyService } from "../services/savedProperty.service.js"
import {
  savePropertySchema,
  listSavedPropertiesSchema,
} from "../validators/savedProperty.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const savedPropertyController = {
  save: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = savePropertySchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const { created, savedProperty } = await savedPropertyService.save(
        Number(req.userId),
        parsed.data.externalId,
      )

      // 201 for a new save, 200 when it was already saved (saving twice is not an error)
      return res.status(created ? 201 : 200).json({ savedProperty })
    } catch (err) {
      next(err)
    }
  },

  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listSavedPropertiesSchema.safeParse(req.query)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const result = await savedPropertyService.list(Number(req.userId), parsed.data)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },
}
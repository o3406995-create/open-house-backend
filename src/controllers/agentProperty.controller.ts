import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { agentPropertyService } from "../services/agentProperty.service.js"
import { trackPropertySchema } from "../validators/agentProperty.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const agentPropertyController = {
  add: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = trackPropertySchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const { created, trackedProperty } = await agentPropertyService.track(
        Number(req.userId),
        parsed.data.externalId,
      )

      // 201 for a new one, 200 when the agent tracked it already (tracking twice is not an error)
      return res.status(created ? 201 : 200).json({ trackedProperty })
    } catch (err) {
      next(err)
    }
  },
}

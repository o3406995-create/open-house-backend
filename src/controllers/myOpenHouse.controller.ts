import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { myOpenHouseService } from "../services/myOpenHouse.service.js"
import { addMyOpenHouseSchema } from "../validators/myOpenHouse.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const myOpenHouseController = {
  add: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = addMyOpenHouseSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const { created, myOpenHouse } = await myOpenHouseService.add(
        Number(req.userId),
        parsed.data.propertyExternalId,
        parsed.data.openHouseExternalId,
      )

      // 201 for a new entry, 200 when it was already there (adding twice is not an error)
      return res.status(created ? 201 : 200).json({ myOpenHouse })
    } catch (err) {
      next(err)
    }
  },
}

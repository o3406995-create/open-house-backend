import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { myOpenHouseService } from "../services/myOpenHouse.service.js"
import {
  addMyOpenHouseSchema,
  listMyOpenHousesSchema,
  myOpenHouseIdParamSchema,
} from "../validators/myOpenHouse.validator.js"
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

  list: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = listMyOpenHousesSchema.safeParse(req.query)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const result = await myOpenHouseService.list(Number(req.userId), parsed.data.timeZone)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },

  remove: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = myOpenHouseIdParamSchema.safeParse(req.params)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      await myOpenHouseService.remove(Number(req.userId), parsed.data.myOpenHouseId)
      return res.status(204).send()
    } catch (err) {
      next(err)
    }
  },
}

import type { Request, Response, NextFunction } from "express"
import { propertyService } from "../services/property.service.js"
import {
  propertySearchSchema,
  propertyIdParamSchema,
} from "../validators/property.validator.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const propertyController = {
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = propertySearchSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const properties = await propertyService.search(parsed.data)
      return res.status(200).json({ properties })
    } catch (err) {
      next(err)
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = propertyIdParamSchema.safeParse(req.params)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const property = await propertyService.getById(parsed.data.externalId)
      return res.status(200).json({ property })
    } catch (err) {
      next(err)
    }
  },
}
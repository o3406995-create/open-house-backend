import type { Request, Response, NextFunction } from "express"
import { propertyService } from "../services/property.service.js"
import { propertySearchSchema } from "../validators/property.validator.js"

export const propertyController = {
  search: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = propertySearchSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
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
      const externalId = req.params.externalId
      if (typeof externalId !== "string" || externalId.length === 0) {
        return res.status(400).json({ message: "Property id is required." })
      }

      const property = await propertyService.getById(externalId)
      return res.status(200).json({ property })
    } catch (err) {
      next(err)
    }
  },
}

import type { Request, Response, NextFunction } from "express"
import { createAgentSchema, listAgenciesSchema } from "../validators/admin.validator.js"
import { adminService } from "../services/admin.service.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

export const adminController = {
  createAgent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createAgentSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const result = await adminService.createAgent(parsed.data)
      return res.status(201).json(result)
    } catch (err) {
      next(err)
    }
  },

  listAgencies: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = listAgenciesSchema.safeParse(req.query)

      if (!parsed.success) {
        return res.status(400).json({
          message: VALIDATION_ERROR_MESSAGE,
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const result = await adminService.listAgencies(parsed.data)
      return res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },
}

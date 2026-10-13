import type { Request, Response, NextFunction } from "express"
import { createAgentSchema } from "../validators/admin.validator.js"
import { adminService } from "../services/admin.service.js"

export const adminController = {
  createAgent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createAgentSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const agent = await adminService.createAgent(parsed.data)
      return res.status(201).json({ user: agent })
    } catch (err) {
      next(err)
    }
  },
}
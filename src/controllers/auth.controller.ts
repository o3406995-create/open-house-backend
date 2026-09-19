import type { Request, Response, NextFunction } from "express"
import { registerSchema, loginSchema } from "../validators/auth.validator.js"
import { authService } from "../services/auth.service.js"

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body)

      if (!parsed.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        })
      }

      const user = await authService.register(parsed.data)

      return res.status(201).json({ user })
    } catch (err) {
      next(err)
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = loginSchema.safeParse(req.body)

        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors,
                
            })
        }
        const { token, user } = await authService.login(parsed.data)

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000,
          path: "/",
        })
        
        return res.status(200).json({ user })
    } catch (err) {
        next(err)
    }

  }
}
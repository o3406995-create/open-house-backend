import type { Request, Response, NextFunction } from "express"
import { registerSchema, loginSchema } from "../validators/auth.validator.js"
import { authService } from "../services/auth.service.js"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
}

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

      const { token, user } = await authService.register(parsed.data, {
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      })

      res.cookie("token", token, COOKIE_OPTIONS)
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
        const { token, user } = await authService.login(parsed.data, {
          ip_address: req.ip,
          user_agent: req.headers["user-agent"],
        })

        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(200).json({ user })
    } catch (err) {
        next(err)
    }

  },

    getCurrentUser: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getCurrentUser(req.userId!)
      return res.status(200).json({ user })
    } catch (err) {
      next(err)
    }
  },

  logout: (_req: Request, res: Response) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })
    return res.status(200).json({ message: "Logged out" })
  },
}
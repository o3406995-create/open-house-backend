import type { Request, Response, NextFunction } from "express"
import { registerSchema, loginSchema } from "../validators/auth.validator.js"
import { authService } from "../services/auth.service.js"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import {
  AUTH_COOKIE_MAX_AGE_MS,
  AUTH_COOKIE_NAME,
} from "../constants/auth.js"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
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

      res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS)
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

        res.cookie(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS)

        return res.status(200).json({ user })
    } catch (err) {
        next(err)
    }

  },

  logout: (_req: Request, res: Response) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })
    return res.status(200).json({ message: "Logged out" })
  },
  getCurrentUser: async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getCurrentUser(req.userId!)
      return res.status(200).json({ user })
    } catch (err) {
      next(err)
    }
  },
}
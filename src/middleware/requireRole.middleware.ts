import type { Response, NextFunction } from "express"
import type { AuthenticatedRequest } from "./auth.middleware.js"
import { AppError } from "../lib/AppError.js"

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return next(new AppError("Not authenticated.", 401))
    }

    if (!allowedRoles.includes(req.userRole)) {
      return next(new AppError("Insufficient permissions.", 403))
    }

    next()
  }
}

export const requireAdmin = requireRole("ADMIN")
export const requireAgent = requireRole("AGENT")
export const requireAdminOrAgent = requireRole("ADMIN", "AGENT")
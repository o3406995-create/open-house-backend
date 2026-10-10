import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { AppError } from "../lib/AppError.js"
import { AUTH_COOKIE_NAME } from "../constants/auth.js"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export interface AuthenticatedRequest extends Request {
  userId?: string
  userRole?: string
}

interface JwtPayload {
  sub: string
  role: string
}

export function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (!token) {
    return next(new AppError("Not authenticated.", 401))
  }

  try {
    const payload = jwt.verify(token, requireEnv("JWT_SECRET")) as JwtPayload
    req.userId = payload.sub
    req.userRole = payload.role
    next()
  } catch {
    return next(new AppError("Invalid or expired session.", 401))
  }
}
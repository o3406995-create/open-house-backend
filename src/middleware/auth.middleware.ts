import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { AppError } from "../lib/AppError.js"
import { userRepository } from "../repositories/user.repository.js"
import {
  AUTH_COOKIE_NAME,
  AUTH_ERROR_NOT_AUTHENTICATED,
  AUTH_ERROR_INVALID_SESSION,
} from "../constants/auth.js"

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

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[AUTH_COOKIE_NAME]

  if (!token) {
    return next(new AppError(AUTH_ERROR_NOT_AUTHENTICATED, 401))
  }

  let payload: JwtPayload
  try {
    payload = jwt.verify(token, requireEnv("JWT_SECRET")) as JwtPayload
  } catch {
    return next(new AppError(AUTH_ERROR_INVALID_SESSION, 401))
  }

  const userId = Number(payload.sub)
  if (!Number.isInteger(userId)) {
    return next(new AppError(AUTH_ERROR_INVALID_SESSION, 401))
  }

  try {
    const user = await userRepository.findActiveById(userId)

    if (!user) {
      return next(new AppError(AUTH_ERROR_INVALID_SESSION, 401))
    }

    req.userId = String(user.user_id)
    req.userRole = user.role
    next()
  } catch (err) {
    next(err)
  }
}
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { userRepository } from "../repositories/user.repository.js"
import { activityLogRepository } from "../repositories/activityLog.repository.js"
import { AppError } from "../lib/AppError.js"
import type { RegisterInput, LoginInput } from "../validators/auth.validator.js"
import { string } from "zod"

const SALT_ROUNDS = 10

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function generateToken(user: {user_id: number; role: string}): string {
  return jwt.sign(
    { sub: String(user.user_id),
      role: user.role
    },
    requireEnv("JWT_SECRET"),
    { expiresIn: "24h" },
  )
}

async function logActivity(
  user_id: number,
  action: "REGISTER" | "LOGIN",
  meta: RequestMeta,
): Promise<void> {
  try {
    await activityLogRepository.create({
      user_id,
      action,
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
    })
  } catch (err) {
    console.error(`Failed to log ${action} activity for user ${user_id}:`, err)
  }
}

interface RequestMeta {
  ip_address?: string | undefined
  user_agent?: string | undefined
}

export const authService = {
  register: async (input: RegisterInput, meta: RequestMeta) => {
    const existingUser = await userRepository.findByEmail(input.email)

    if (existingUser) {
      throw new AppError("Email is already registered.", 409)
    }

    const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS)

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password_hash,
    })

    const token = generateToken(user)

    await logActivity(user.user_id, "REGISTER", meta)

    const { password_hash: _omit, ...safeUser } = user
    return { token, user: safeUser }
  },

  login: async (input: LoginInput, meta: RequestMeta) => {
    const user = await userRepository.findByEmail(input.email)

    if (!user) {
        throw new AppError("Invalid email or password.", 401)
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash)

    if (!isPasswordValid) {
        throw new AppError("Invalid email or password.", 401)
    }

    if (user.status !== "ACTIVE") {
        throw new AppError("This account has been disabled.", 403)
    }

    const token = generateToken(user)
    
    await logActivity(user.user_id, "LOGIN", meta)

    const { password_hash: _omit, ...safeUser } = user

    return { token, user: safeUser }
  },
}
import bcrypt from "bcrypt"
import { userRepository } from "../repositories/user.repository.js"
import { AppError } from "../lib/AppError.js"
import { BCRYPT_SALT_ROUNDS } from "../constants/auth.js"
import type { CreateAgentInput } from "../validators/admin.validator.js"

export const adminService = {
  createAgent: async (input: CreateAgentInput) => {
    const existingUser = await userRepository.findByEmail(input.email)

    if (existingUser) {
      throw new AppError("Email is already registered.", 409)
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS)

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password_hash,
      role: "AGENT",
    })

    const { password_hash: _omit, ...safeUser } = user
    return safeUser
  },
}
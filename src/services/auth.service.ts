import bcrypt from "bcrypt"
import { userRepository } from "../repositories/user.repository.js"
import { AppError } from "../lib/AppError.js"
import type { RegisterInput } from "../validators/auth.validator.js"

const SALT_ROUNDS = 10

export const authService = {
  register: async (input: RegisterInput) => {
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

    const { password_hash: _omit, ...safeUser } = user
    return safeUser
  },
}
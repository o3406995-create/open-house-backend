import "dotenv/config"
import bcrypt from "bcrypt"
import { prisma } from "../lib/prisma.js"
import { BCRYPT_SALT_ROUNDS } from "../constants/auth.js"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  })

  if (existingAdmin) {
    console.log("An admin account already exists. Skipping seed.")
    console.log(`Existing admin email: ${existingAdmin.email}`)
    return
  }

  const email = requireEnv("ADMIN_SEED_EMAIL")
  const password = requireEnv("ADMIN_SEED_PASSWORD")
  const name = process.env.ADMIN_SEED_NAME ?? "Admin"

  const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password_hash,
      role: "ADMIN",
    },
  })

  console.log(`Admin account created successfully: ${admin.email}`)
}

main()
  .catch((err) => {
    console.error("Failed to seed admin account:", err)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
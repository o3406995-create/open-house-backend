import "dotenv/config"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../generated/prisma/client.js"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const dbUrl = new URL(requireEnv("DATABASE_URL"))

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: dbUrl.port ? Number(dbUrl.port) : 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.replace(/^\//, ""),
})

const prisma = new PrismaClient({ adapter })

export const userRepository = {
  findByEmail: (email: string) => {
    return prisma.user.findUnique({ where: { email } })
  },

  create: (data: { name: string; email: string; password_hash: string }) => {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: data.password_hash,
        role: "USER",
      },
    })
  },
}
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

export const loggerRepository = {
  create: (data: {
    user_id: number
    action: "REGISTER" | "LOGIN"
    ip_address?: string | undefined
    user_agent?: string | undefined
  }) => {
    return prisma.logger.create({ data: {
        user_id: data.user_id,
        action: data.action,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
    }
   })
  },
}
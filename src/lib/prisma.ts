import "./loadEnv.js"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"
import { PrismaClient } from "../generated/prisma/client.js"
import {
  DEFAULT_DB_PORT,
  DATABASE_SSL_ENV,
  DATABASE_SSL_ENABLED,
  DB_CONNECT_TIMEOUT_MS,
} from "../constants/database.js"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const dbUrl = new URL(requireEnv("DATABASE_URL"))

// Hosted databases such as TiDB Cloud require TLS. It is opt-in so local development is unchanged.
const useSsl = process.env[DATABASE_SSL_ENV] === DATABASE_SSL_ENABLED

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: dbUrl.port ? Number(dbUrl.port) : DEFAULT_DB_PORT,
  // URL parts are percent-encoded, so decode them before connecting
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
  // The driver default is 1s, too short for a TLS handshake to a remote region
  connectTimeout: DB_CONNECT_TIMEOUT_MS,
  ...(useSsl ? { ssl: { rejectUnauthorized: true } } : {}),
})

export const prisma = new PrismaClient({ adapter })
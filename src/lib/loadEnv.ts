import dotenv from "dotenv"

const appEnv = process.env.APP_ENV ?? "local"
const envFile = `env/${appEnv}.env`

// A cloud host injects these before startup. Do not let a file overwrite them.
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: envFile, quiet: true })
}

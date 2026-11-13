export const AUTH_COOKIE_NAME = "token"
export const BCRYPT_SALT_ROUNDS = 10
export const JWT_TTL_SECONDS = 24 * 60 * 60
export const AUTH_COOKIE_MAX_AGE_MS = JWT_TTL_SECONDS * 1000
export const PASSWORD_MIN_LENGTH = 8

export const AUTH_ERROR_NOT_AUTHENTICATED = "Not authenticated."
export const AUTH_ERROR_INVALID_SESSION = "Invalid or expired session."
export const AUTH_ERROR_INVALID_CREDENTIALS = "Invalid email or password."
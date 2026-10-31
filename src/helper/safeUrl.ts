import { ALLOWED_URL_PROTOCOLS } from "../constants/domain.js"

// Provider data is untrusted. Returns an absolute URL only if it uses an allowed
// protocol, otherwise null (blocks javascript:, data:, etc.).
// A relative value is resolved against baseUrl when one is given.
export function toSafeUrl(
  value: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!value) return null

  try {
    const url = new URL(value, baseUrl)
    return ALLOWED_URL_PROTOCOLS.includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}
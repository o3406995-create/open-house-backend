export const SOURCE_DOMAIN = "domain" as const
export const SOURCE_MOCK = "mock" as const

export const DOMAIN_LISTING_BASE_URL = "https://www.domain.com.au/"
export const DOMAIN_MEDIA_CATEGORY_IMAGE = "image"

export const PRICE_WITHHELD_LABEL = "Price withheld"
export const UNKNOWN_PROPERTY_TYPE = "Unknown"

// Only these protocols may be returned to clients as links or image sources
export const ALLOWED_URL_PROTOCOLS: readonly string[] = ["https:"]
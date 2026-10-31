export const PROPERTY_ID_MAX_LENGTH = 64
// Letters, digits, hyphen and underscore only. Mock ids look like "mock-1",
// Domain ids are numeric. Blocks "/", "..", "?" and other URL-altering characters.
export const PROPERTY_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export const PROPERTY_DATA_SOURCE_ENV = "PROPERTY_DATA_SOURCE"
export const PROPERTY_DATA_SOURCE_DOMAIN = "domain"

export const PROPERTY_ERROR_NOT_FOUND = "Property not found."
export const PROPERTY_ERROR_INVALID_ID = "Invalid property id."
export const VALIDATION_ERROR_MESSAGE = "Validation failed"

export const LATITUDE_MIN = -90
export const LATITUDE_MAX = 90
export const LONGITUDE_MIN = -180
export const LONGITUDE_MAX = 180
export const MAX_SEARCH_RADIUS_METERS = 50_000

export const SEARCH_ERROR_LATITUDE = "latitude must be between -90 and 90"
export const SEARCH_ERROR_LONGITUDE = "longitude must be between -180 and 180"
export const SEARCH_ERROR_RADIUS_POSITIVE = "radiusMeters must be greater than 0"
export const SEARCH_ERROR_RADIUS_MAX = "radiusMeters is too large"
export const SEARCH_ERROR_NEGATIVE = "value must not be negative"
export const SEARCH_ERROR_PRICE_RANGE = "minPrice must not be greater than maxPrice"
export const SEARCH_ERROR_BEDROOM_RANGE = "minBedrooms must not be greater than maxBedrooms"
export const SEARCH_ERROR_BATHROOM_RANGE = "minBathrooms must not be greater than maxBathrooms"
export const SEARCH_ERROR_DATE_RANGE = "startDate must not be after endDate"

export const DOMAIN_MEDIA_CATEGORY_IMAGE = "image"
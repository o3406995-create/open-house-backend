export const PROPERTY_ID_MAX_LENGTH = 64
// Letters, digits, hyphen and underscore only. Mock ids look like "mock-1",
// Domain ids are numeric. Blocks "/", "..", "?" and other URL-altering characters.
export const PROPERTY_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export const PROPERTY_DATA_SOURCE_ENV = "PROPERTY_DATA_SOURCE"
export const PROPERTY_DATA_SOURCE_DOMAIN = "domain"

export const PROPERTY_ERROR_NOT_FOUND = "Property not found."
export const PROPERTY_ERROR_INVALID_ID = "Invalid property id."
export const VALIDATION_ERROR_MESSAGE = "Validation failed"
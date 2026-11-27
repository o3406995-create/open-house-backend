export const AGENT_NAME_MAX_LENGTH = 100
export const AGENT_LICENSE_MAX_LENGTH = 50

export const AGENCY_NAME_MAX_LENGTH = 150
export const AGENCY_SUBURB_MAX_LENGTH = 100
export const AGENCY_ADDRESS_MAX_LENGTH = 191
export const AGENCY_EMAIL_MAX_LENGTH = 191
export const AGENCY_WEBSITE_MAX_LENGTH = 2048

// The states of Australia, and a postcode is four digits
export const AGENCY_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"] as const
export const AGENCY_POSTCODE_PATTERN = /^\d{4}$/
export const AGENCY_PHONE_PATTERN = /^[0-9 +()-]{6,30}$/

// A website the admin types is only taken when it is https
export const AGENCY_WEBSITE_PREFIX = "https://"

export const AGENCY_SEARCH_MAX_LENGTH = 100
export const AGENCY_DEFAULT_PAGE = 1
export const AGENCY_DEFAULT_PAGE_SIZE = 20
export const AGENCY_MAX_PAGE_SIZE = 50

export const textError = (field: string, max: number) => `${field} must be 1 to ${max} characters`

export const ADMIN_ERROR_AGENCY_CHOICE =
  "Give either agencyId (an agency that exists) or agency (a new one), not both and not neither."
export const ADMIN_ERROR_AGENCY_ID = "agencyId must be a positive integer"
export const ADMIN_ERROR_AGENCY_NOT_FOUND = "Agency not found."
export const ADMIN_ERROR_EMAIL_TAKEN = "Email is already registered."
export const ADMIN_ERROR_STATE = `state must be one of ${AGENCY_STATES.join(", ")}`
export const ADMIN_ERROR_POSTCODE = "postcode must be 4 digits"
export const ADMIN_ERROR_PHONE = "phone must be 6 to 30 characters: digits, spaces, + ( ) -"
export const ADMIN_ERROR_WEBSITE = `website must be a link that starts with ${AGENCY_WEBSITE_PREFIX}`

export const AGENCY_ERROR_SEARCH = `q must be 1 to ${AGENCY_SEARCH_MAX_LENGTH} characters`
export const AGENCY_ERROR_PAGE = "page must be a positive integer"
export const AGENCY_ERROR_PAGE_SIZE = `pageSize must be an integer between 1 and ${AGENCY_MAX_PAGE_SIZE}`

// A first-time concurrent save can lose two races in a row (creating the property row,
// then creating the saved-property row), so the third attempt always finds both rows.
export const SAVE_PROPERTY_MAX_ATTEMPTS = 3

export const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002"

export const PROPERTY_STATUS_ACTIVE = "ACTIVE" as const

export const SAVED_DEFAULT_PAGE = 1
export const SAVED_DEFAULT_PAGE_SIZE = 20
export const SAVED_MAX_PAGE_SIZE = 50

// Every saved property is re-checked against the data source, so the number of
// parallel provider calls is capped.
export const SAVED_PROVIDER_CONCURRENCY = 5

export const SAVED_ERROR_PAGE = "page must be a positive integer"
export const SAVED_ERROR_PAGE_SIZE = `pageSize must be an integer between 1 and ${SAVED_MAX_PAGE_SIZE}`

export const LISTING_STATUS = {
  // Fetched from the data source just now
  AVAILABLE: "AVAILABLE",
  // The data source no longer has the listing; the stored snapshot is shown
  REMOVED: "REMOVED",
  // Could not be checked (data source error, or the snapshot comes from another source)
  UNKNOWN: "UNKNOWN",
} as const

export type ListingStatus = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS]
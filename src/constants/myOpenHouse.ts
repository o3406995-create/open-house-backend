// Adding an open house needs three rows: the property, the open house and the user's row.
// Each of them can be lost to a concurrent request once, and every lost race aborts the
// transaction, so the fourth attempt always finds all three.
export const MY_OPEN_HOUSE_MAX_ATTEMPTS = 4

export const OPEN_HOUSE_STATUS_SCHEDULED = "SCHEDULED" as const

export const MY_OPEN_HOUSE_ERROR_INVALID_ID = "Invalid open house id."
export const MY_OPEN_HOUSE_ERROR_NOT_FOUND = "Open house not found."
export const MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE =
  "This open house has been cancelled or has already finished."

// Adding an open house needs three rows: the property, the open house and the user's row.
// Each of them can be lost to a concurrent request once, and every lost race aborts the
// transaction, so the fourth attempt always finds all three.
export const MY_OPEN_HOUSE_MAX_ATTEMPTS = 4

export const OPEN_HOUSE_STATUS_SCHEDULED = "SCHEDULED" as const

export const MY_OPEN_HOUSE_ERROR_INVALID_ID = "Invalid open house id."
export const MY_OPEN_HOUSE_ERROR_NOT_FOUND = "Open house not found."
export const MY_OPEN_HOUSE_ERROR_NOT_AVAILABLE =
  "This open house has been cancelled or has already finished."

// The time zone that decides what "today" is when the client does not send one
export const DEFAULT_TIME_ZONE = "Australia/Brisbane"
export const TIME_ZONE_MAX_LENGTH = 64
export const MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE =
  "timeZone must be a valid IANA time zone name, for example Australia/Brisbane"

// A user has a handful of open houses; the cap only keeps one response bounded
export const MY_OPEN_HOUSES_LIMIT = 200

export const USER_OPEN_HOUSE_STATUS_ATTENDED = "ATTENDED" as const
export const USER_OPEN_HOUSE_STATUS_EXPIRED = "EXPIRED" as const

export const MY_OPEN_HOUSE_GROUP = {
  TODAY: "today",
  UPCOMING: "upcoming",
  ATTENDED: "attended",
  EXPIRED: "expired",
} as const

export type MyOpenHouseGroup = (typeof MY_OPEN_HOUSE_GROUP)[keyof typeof MY_OPEN_HOUSE_GROUP]

// The id of an entry in My Open Houses comes from the URL: plain digits, no leading zero
export const MY_OPEN_HOUSE_ID_PATTERN = /^[1-9]\d*$/
// The largest value an INT column can hold; anything bigger cannot be a valid id
export const MY_OPEN_HOUSE_MAX_ID = 2147483647
export const MY_OPEN_HOUSE_ERROR_INVALID_ENTRY_ID = "myOpenHouseId must be a positive integer"
export const MY_OPEN_HOUSE_ERROR_ENTRY_NOT_FOUND = "My open house not found."

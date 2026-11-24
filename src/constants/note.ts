export const NOTE_MAX_LENGTH = 2000

export const NOTE_ERROR_CONTENT = `content must be between 1 and ${NOTE_MAX_LENGTH} characters`
export const NOTE_ERROR_TARGET_ID = "savedPropertyId and userOpenHouseId must be positive integers"
export const NOTE_ERROR_TARGET = "Give exactly one of savedPropertyId and userOpenHouseId"
export const NOTE_ERROR_INVALID_ID = "noteId must be a positive integer"
export const NOTE_ERROR_NOT_FOUND = "Note not found."
export const NOTE_ERROR_TARGET_NOT_FOUND = "Saved property or open house not found."
export const NOTE_ERROR_ALREADY_EXISTS = "This item already has a note. Update it instead."

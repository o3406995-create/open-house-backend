import { z } from "zod"
import { INT_COLUMN_MAX, POSITIVE_INT_ID_PATTERN } from "../constants/ids.js"

// The id of a row, as it arrives in a URL. It is checked as text before it becomes a number,
// and anything above the INT range is rejected here instead of failing in the database.
export function positiveIntIdSchema(message: string) {
  return z
    .string()
    .regex(POSITIVE_INT_ID_PATTERN, message)
    .transform(Number)
    .refine((id) => id <= INT_COLUMN_MAX, message)
}

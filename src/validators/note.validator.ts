import { z } from "zod"
import { positiveIntIdSchema } from "./positiveIntId.js"
import { INT_COLUMN_MAX } from "../constants/ids.js"
import {
  NOTE_ERROR_CONTENT,
  NOTE_ERROR_INVALID_ID,
  NOTE_ERROR_TARGET,
  NOTE_ERROR_TARGET_ID,
  NOTE_MAX_LENGTH,
} from "../constants/note.js"

// The id of a saved property or of an entry in My Open Houses, sent in the JSON body as a number
const targetIdSchema = z
  .number()
  .int(NOTE_ERROR_TARGET_ID)
  .min(1, NOTE_ERROR_TARGET_ID)
  .max(INT_COLUMN_MAX, NOTE_ERROR_TARGET_ID)

const contentSchema = z
  .string()
  .trim()
  .min(1, NOTE_ERROR_CONTENT)
  .max(NOTE_MAX_LENGTH, NOTE_ERROR_CONTENT)

// A note belongs to exactly one thing: a saved property or an entry in My Open Houses
export const createNoteSchema = z
  .object({
    savedPropertyId: targetIdSchema.optional(),
    userOpenHouseId: targetIdSchema.optional(),
    content: contentSchema,
  })
  .refine((value) => (value.savedPropertyId === undefined) !== (value.userOpenHouseId === undefined), {
    message: NOTE_ERROR_TARGET,
    path: ["savedPropertyId"],
  })

export const updateNoteSchema = z.object({ content: contentSchema })

export const noteIdParamSchema = z.object({
  noteId: positiveIntIdSchema(NOTE_ERROR_INVALID_ID),
})

export type CreateNoteBody = z.infer<typeof createNoteSchema>

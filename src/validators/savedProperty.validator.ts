import { z } from "zod"
import { propertyIdParamSchema } from "./property.validator.js"
import { positiveIntIdSchema } from "./positiveIntId.js"
import {
  SAVED_DEFAULT_PAGE,
  SAVED_DEFAULT_PAGE_SIZE,
  SAVED_MAX_PAGE_SIZE,
  SAVED_ERROR_PAGE,
  SAVED_ERROR_PAGE_SIZE,
  SAVED_ERROR_ID,
} from "../constants/savedProperty.js"

// Reuses the property id rules from the details endpoint so the two can never disagree
export const savePropertySchema = z.object({
  externalId: propertyIdParamSchema.shape.externalId,
})

export const listSavedPropertiesSchema = z.object({
  page: z.coerce.number().int(SAVED_ERROR_PAGE).min(1, SAVED_ERROR_PAGE).default(SAVED_DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int(SAVED_ERROR_PAGE_SIZE)
    .min(1, SAVED_ERROR_PAGE_SIZE)
    .max(SAVED_MAX_PAGE_SIZE, SAVED_ERROR_PAGE_SIZE)
    .default(SAVED_DEFAULT_PAGE_SIZE),
})

export const savedPropertyIdParamSchema = z.object({
  savedPropertyId: positiveIntIdSchema(SAVED_ERROR_ID),
})

export type SavePropertyInput = z.infer<typeof savePropertySchema>
export type ListSavedPropertiesInput = z.infer<typeof listSavedPropertiesSchema>

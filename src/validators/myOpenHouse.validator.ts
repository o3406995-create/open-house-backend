import { z } from "zod"
import { propertyIdParamSchema } from "./property.validator.js"
import { PROPERTY_ID_MAX_LENGTH, PROPERTY_ID_PATTERN } from "../constants/property.js"
import { isValidTimeZone } from "../helper/timeZone.js"
import {
  DEFAULT_TIME_ZONE,
  MY_OPEN_HOUSE_ERROR_INVALID_ENTRY_ID,
  MY_OPEN_HOUSE_ERROR_INVALID_ID,
  MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE,
  MY_OPEN_HOUSE_ID_PATTERN,
  MY_OPEN_HOUSE_MAX_ID,
  TIME_ZONE_MAX_LENGTH,
} from "../constants/myOpenHouse.js"

// The property id reuses the rules of the details endpoint so the two can never disagree.
// Open house ids come from the same providers, so they follow the same character rules.
export const addMyOpenHouseSchema = z.object({
  propertyExternalId: propertyIdParamSchema.shape.externalId,
  openHouseExternalId: z
    .string()
    .min(1, MY_OPEN_HOUSE_ERROR_INVALID_ID)
    .max(PROPERTY_ID_MAX_LENGTH, MY_OPEN_HOUSE_ERROR_INVALID_ID)
    .regex(PROPERTY_ID_PATTERN, MY_OPEN_HOUSE_ERROR_INVALID_ID),
})

// The browser sends its own time zone so that "today" is the user's day. A name that
// the runtime does not know is rejected instead of silently falling back to another zone.
export const listMyOpenHousesSchema = z.object({
  timeZone: z
    .string()
    .min(1, MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE)
    .max(TIME_ZONE_MAX_LENGTH, MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE)
    .refine(isValidTimeZone, MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE)
    .default(DEFAULT_TIME_ZONE),
})

// The id is checked as text before it becomes a number. Number() alone would accept "1e2",
// "0x10" and " 3", which are not ids.
export const myOpenHouseIdParamSchema = z.object({
  myOpenHouseId: z
    .string()
    .regex(MY_OPEN_HOUSE_ID_PATTERN, MY_OPEN_HOUSE_ERROR_INVALID_ENTRY_ID)
    .transform(Number)
    .refine((id) => id <= MY_OPEN_HOUSE_MAX_ID, MY_OPEN_HOUSE_ERROR_INVALID_ENTRY_ID),
})

export type AddMyOpenHouseInput = z.infer<typeof addMyOpenHouseSchema>
export type ListMyOpenHousesInput = z.infer<typeof listMyOpenHousesSchema>

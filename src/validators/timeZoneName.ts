import { z } from "zod"
import { canonicalTimeZone, isValidTimeZone } from "../helper/timeZone.js"
import {
  MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE,
  TIME_ZONE_MAX_LENGTH,
} from "../constants/myOpenHouse.js"

// An IANA time zone name that the runtime knows. A name it does not know is rejected instead of
// silently falling back to another zone.
export const timeZoneNameSchema = z
  .string()
  .min(1, MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE)
  .max(TIME_ZONE_MAX_LENGTH, MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE)
  .refine(isValidTimeZone, MY_OPEN_HOUSE_ERROR_INVALID_TIME_ZONE)
  .transform(canonicalTimeZone)

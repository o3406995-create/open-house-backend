import { z } from "zod"
import { timeZoneNameSchema } from "./timeZoneName.js"

export const setTimeZoneSchema = z.object({ timeZone: timeZoneNameSchema })

export type SetTimeZoneInput = z.infer<typeof setTimeZoneSchema>

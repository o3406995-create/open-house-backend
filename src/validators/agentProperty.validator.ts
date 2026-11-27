import { z } from "zod"
import { savePropertySchema } from "./savedProperty.validator.js"

// The same rules as for saving a property: the id of a listing, never the listing itself
export const trackPropertySchema = savePropertySchema

export type TrackPropertyInput = z.infer<typeof trackPropertySchema>

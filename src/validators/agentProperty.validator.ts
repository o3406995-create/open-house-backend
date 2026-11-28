import { z } from "zod"
import { listSavedPropertiesSchema, savePropertySchema } from "./savedProperty.validator.js"

// The same rules as for saving a property: the id of a listing, never the listing itself
export const trackPropertySchema = savePropertySchema

// The watchlist is paged like the list of saved properties (the same schema: page and pageSize)
export const listTrackedPropertiesSchema = listSavedPropertiesSchema

export type TrackPropertyInput = z.infer<typeof trackPropertySchema>
export type ListTrackedPropertiesInput = z.infer<typeof listTrackedPropertiesSchema>

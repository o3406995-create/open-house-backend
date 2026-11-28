import { z } from "zod"
import { listSavedPropertiesSchema, savePropertySchema } from "./savedProperty.validator.js"
import { positiveIntIdSchema } from "./positiveIntId.js"
import { AGENT_ERROR_TRACKED_ID } from "../constants/agentProperty.js"

// The same rules as for saving a property: the id of a listing, never the listing itself
export const trackPropertySchema = savePropertySchema

// The watchlist is paged like the list of saved properties (the same schema: page and pageSize)
export const listTrackedPropertiesSchema = listSavedPropertiesSchema

// The id of a row of the watchlist, taken from the path: plain digits that fit the column
export const trackedIdParamSchema = z.object({
  trackedId: positiveIntIdSchema(AGENT_ERROR_TRACKED_ID),
})

export type TrackPropertyInput = z.infer<typeof trackPropertySchema>
export type ListTrackedPropertiesInput = z.infer<typeof listTrackedPropertiesSchema>

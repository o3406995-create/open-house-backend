import { z } from "zod"
import { propertyIdParamSchema } from "./property.validator.js"
import { PROPERTY_ID_MAX_LENGTH, PROPERTY_ID_PATTERN } from "../constants/property.js"
import { MY_OPEN_HOUSE_ERROR_INVALID_ID } from "../constants/myOpenHouse.js"

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

export type AddMyOpenHouseInput = z.infer<typeof addMyOpenHouseSchema>

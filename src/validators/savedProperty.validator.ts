import { z } from "zod"
import { propertyIdParamSchema } from "./property.validator.js"

// Reuses the property id rules from the details endpoint so the two can never disagree
export const savePropertySchema = z.object({
  externalId: propertyIdParamSchema.shape.externalId,
})

export type SavePropertyInput = z.infer<typeof savePropertySchema>
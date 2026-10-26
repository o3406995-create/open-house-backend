import { z } from "zod"
import {
  PROPERTY_ID_MAX_LENGTH,
  PROPERTY_ID_PATTERN,
  PROPERTY_ERROR_INVALID_ID,
} from "../constants/property.js"

export const propertySearchSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().positive("radiusMeters must be greater than 0"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().int().optional(),
  maxBedrooms: z.number().int().optional(),
  minBathrooms: z.number().int().optional(),
  maxBathrooms: z.number().int().optional(),
  propertyType: z.string().optional(),
  auctionOnly: z.boolean().optional(),
})

export const propertyIdParamSchema = z.object({
  externalId: z
    .string()
    .min(1, PROPERTY_ERROR_INVALID_ID)
    .max(PROPERTY_ID_MAX_LENGTH, PROPERTY_ERROR_INVALID_ID)
    .regex(PROPERTY_ID_PATTERN, PROPERTY_ERROR_INVALID_ID),
})

export type PropertySearchInput = z.infer<typeof propertySearchSchema>
export type PropertyIdParam = z.infer<typeof propertyIdParamSchema>
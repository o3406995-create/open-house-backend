import { z } from "zod"
import {
  PROPERTY_ID_MAX_LENGTH,
  PROPERTY_ID_PATTERN,
  PROPERTY_ERROR_INVALID_ID,
  LATITUDE_MIN,
  LATITUDE_MAX,
  LONGITUDE_MIN,
  LONGITUDE_MAX,
  MAX_SEARCH_RADIUS_METERS,
  SEARCH_ERROR_LATITUDE,
  SEARCH_ERROR_LONGITUDE,
  SEARCH_ERROR_RADIUS_POSITIVE,
  SEARCH_ERROR_RADIUS_MAX,
  SEARCH_ERROR_NEGATIVE,
  SEARCH_ERROR_PRICE_RANGE,
  SEARCH_ERROR_BEDROOM_RANGE,
  SEARCH_ERROR_BATHROOM_RANGE,
  SEARCH_ERROR_DATE_RANGE,
} from "../constants/property.js"

export const propertySearchSchema = z
  .object({
    latitude: z.number().min(LATITUDE_MIN, SEARCH_ERROR_LATITUDE).max(LATITUDE_MAX, SEARCH_ERROR_LATITUDE),
    longitude: z.number().min(LONGITUDE_MIN, SEARCH_ERROR_LONGITUDE).max(LONGITUDE_MAX, SEARCH_ERROR_LONGITUDE),
    radiusMeters: z
      .number()
      .positive(SEARCH_ERROR_RADIUS_POSITIVE)
      .max(MAX_SEARCH_RADIUS_METERS, SEARCH_ERROR_RADIUS_MAX),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minPrice: z.number().min(0, SEARCH_ERROR_NEGATIVE).optional(),
    maxPrice: z.number().min(0, SEARCH_ERROR_NEGATIVE).optional(),
    minBedrooms: z.number().int().min(0, SEARCH_ERROR_NEGATIVE).optional(),
    maxBedrooms: z.number().int().min(0, SEARCH_ERROR_NEGATIVE).optional(),
    minBathrooms: z.number().int().min(0, SEARCH_ERROR_NEGATIVE).optional(),
    maxBathrooms: z.number().int().min(0, SEARCH_ERROR_NEGATIVE).optional(),
    propertyType: z.string().optional(),
    auctionOnly: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const checkRange = (
      min: number | Date | undefined,
      max: number | Date | undefined,
      path: string,
      message: string,
    ) => {
      if (min !== undefined && max !== undefined && min > max) {
        ctx.addIssue({ code: "custom", message, path: [path] })
      }
    }

    checkRange(data.minPrice, data.maxPrice, "minPrice", SEARCH_ERROR_PRICE_RANGE)
    checkRange(data.minBedrooms, data.maxBedrooms, "minBedrooms", SEARCH_ERROR_BEDROOM_RANGE)
    checkRange(data.minBathrooms, data.maxBathrooms, "minBathrooms", SEARCH_ERROR_BATHROOM_RANGE)
    checkRange(data.startDate, data.endDate, "startDate", SEARCH_ERROR_DATE_RANGE)
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
import { z } from "zod"

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

export type PropertySearchInput = z.infer<typeof propertySearchSchema>

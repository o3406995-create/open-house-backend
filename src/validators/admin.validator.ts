import { z } from "zod"
import { PASSWORD_MIN_LENGTH } from "../constants/auth.js"
import { INT_COLUMN_MAX } from "../constants/ids.js"
import {
  ADMIN_ERROR_AGENCY_CHOICE,
  ADMIN_ERROR_AGENCY_ID,
  ADMIN_ERROR_PHONE,
  ADMIN_ERROR_POSTCODE,
  ADMIN_ERROR_STATE,
  ADMIN_ERROR_WEBSITE,
  AGENCY_ADDRESS_MAX_LENGTH,
  AGENCY_DEFAULT_PAGE,
  AGENCY_DEFAULT_PAGE_SIZE,
  AGENCY_EMAIL_MAX_LENGTH,
  AGENCY_ERROR_PAGE,
  AGENCY_ERROR_PAGE_SIZE,
  AGENCY_ERROR_SEARCH,
  AGENCY_MAX_PAGE_SIZE,
  AGENCY_NAME_MAX_LENGTH,
  AGENCY_PHONE_PATTERN,
  AGENCY_POSTCODE_PATTERN,
  AGENCY_SEARCH_MAX_LENGTH,
  AGENCY_STATES,
  AGENCY_SUBURB_MAX_LENGTH,
  AGENCY_WEBSITE_MAX_LENGTH,
  AGENCY_WEBSITE_PREFIX,
  AGENT_LICENSE_MAX_LENGTH,
  AGENT_NAME_MAX_LENGTH,
  textError,
} from "../constants/admin.js"

// Text with no space at the ends, which must not be empty
const text = (field: string, max: number) =>
  z.string().trim().min(1, textError(field, max)).max(max, textError(field, max))

// A new agency. The suburb and the postcode are what a search by area looks at, so they are required.
export const agencyInputSchema = z.object({
  name: text("name", AGENCY_NAME_MAX_LENGTH),
  address: text("address", AGENCY_ADDRESS_MAX_LENGTH).optional(),
  suburb: text("suburb", AGENCY_SUBURB_MAX_LENGTH),
  state: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => (AGENCY_STATES as readonly string[]).includes(value), ADMIN_ERROR_STATE),
  postcode: z.string().trim().regex(AGENCY_POSTCODE_PATTERN, ADMIN_ERROR_POSTCODE),
  phone: z.string().trim().regex(AGENCY_PHONE_PATTERN, ADMIN_ERROR_PHONE).optional(),
  email: z.string().trim().max(AGENCY_EMAIL_MAX_LENGTH).email().optional(),
  website: z
    .string()
    .trim()
    .max(AGENCY_WEBSITE_MAX_LENGTH)
    .url(ADMIN_ERROR_WEBSITE)
    .refine((value) => value.startsWith(AGENCY_WEBSITE_PREFIX), ADMIN_ERROR_WEBSITE)
    .optional(),
})

// An agent account always comes with a profile, and a profile belongs to an agency: either one that
// exists (agencyId) or a new one (agency), never both and never neither. Fields that are not
// listed here (a role, for instance) are dropped.
export const createAgentSchema = z
  .object({
    name: text("name", AGENT_NAME_MAX_LENGTH),
    email: z.string().email().max(AGENCY_EMAIL_MAX_LENGTH),
    password: z.string().min(PASSWORD_MIN_LENGTH),
    licenseNumber: text("licenseNumber", AGENT_LICENSE_MAX_LENGTH),
    agencyId: z
      .number()
      .int(ADMIN_ERROR_AGENCY_ID)
      .min(1, ADMIN_ERROR_AGENCY_ID)
      .max(INT_COLUMN_MAX, ADMIN_ERROR_AGENCY_ID)
      .optional(),
    agency: agencyInputSchema.optional(),
  })
  .refine((input) => (input.agencyId === undefined) !== (input.agency === undefined), {
    message: ADMIN_ERROR_AGENCY_CHOICE,
    path: ["agencyId"],
  })

// The agencies an admin can choose from, found by a part of the name
export const listAgenciesSchema = z.object({
  q: z.string().trim().min(1, AGENCY_ERROR_SEARCH).max(AGENCY_SEARCH_MAX_LENGTH, AGENCY_ERROR_SEARCH).optional(),
  page: z.coerce.number().int(AGENCY_ERROR_PAGE).min(1, AGENCY_ERROR_PAGE).default(AGENCY_DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int(AGENCY_ERROR_PAGE_SIZE)
    .min(1, AGENCY_ERROR_PAGE_SIZE)
    .max(AGENCY_MAX_PAGE_SIZE, AGENCY_ERROR_PAGE_SIZE)
    .default(AGENCY_DEFAULT_PAGE_SIZE),
})

export type AgencyInput = z.infer<typeof agencyInputSchema>
export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type ListAgenciesInput = z.infer<typeof listAgenciesSchema>

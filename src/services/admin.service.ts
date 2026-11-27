import bcrypt from "bcrypt"
import { userRepository } from "../repositories/user.repository.js"
import {
  adminRepository,
  type AgencyChoice,
  type AgencySummary,
} from "../repositories/admin.repository.js"
import { AppError } from "../lib/AppError.js"
import { isUniqueConstraintError } from "../helper/prismaErrors.js"
import { BCRYPT_SALT_ROUNDS } from "../constants/auth.js"
import {
  ADMIN_ERROR_AGENCY_CHOICE,
  ADMIN_ERROR_AGENCY_NOT_FOUND,
  ADMIN_ERROR_EMAIL_TAKEN,
} from "../constants/admin.js"
import type { CreateAgentInput, ListAgenciesInput } from "../validators/admin.validator.js"

function toAgencyChoice(input: CreateAgentInput): AgencyChoice {
  if (input.agencyId !== undefined) return { kind: "existing", agencyId: input.agencyId }
  if (input.agency !== undefined) return { kind: "new", agency: input.agency }

  // The schema refuses a request with neither; this only keeps the types honest
  throw new AppError(ADMIN_ERROR_AGENCY_CHOICE, 400)
}

const toAgencySummary = (agency: AgencySummary) => ({
  agencyId: agency.agency_id,
  name: agency.name,
  suburb: agency.suburb,
  state: agency.state,
  postcode: agency.postcode,
})

export const adminService = {
  // An agent account always comes with a profile, in an agency that exists or in a new one.
  createAgent: async (input: CreateAgentInput) => {
    const existingUser = await userRepository.findByEmail(input.email)

    if (existingUser) {
      throw new AppError(ADMIN_ERROR_EMAIL_TAKEN, 409)
    }

    const agency = toAgencyChoice(input)
    const password_hash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS)

    let created
    try {
      created = await adminRepository.createAgentWithProfile({
        name: input.name,
        email: input.email,
        password_hash,
        license_number: input.licenseNumber,
        agency,
      })
    } catch (err) {
      // Somebody registered the same e-mail address between the check and the insert
      if (isUniqueConstraintError(err)) {
        throw new AppError(ADMIN_ERROR_EMAIL_TAKEN, 409)
      }
      throw err
    }

    if (!created.found) {
      throw new AppError(ADMIN_ERROR_AGENCY_NOT_FOUND, 404)
    }

    return {
      user: created.user,
      agentProfile: {
        agentId: created.profile.agent_id,
        licenseNumber: created.profile.license_number,
        agency: toAgencySummary(created.agency),
      },
      agencyCreated: created.agencyCreated,
    }
  },

  listAgencies: async ({ q, page, pageSize }: ListAgenciesInput) => {
    const { records, total } = await adminRepository.listAgencies({ q, page, pageSize })

    return {
      agencies: records.map((record) => ({
        ...toAgencySummary(record),
        agentCount: record._count.agents,
      })),
      total,
      page,
      pageSize,
    }
  },
}

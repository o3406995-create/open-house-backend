import { prisma } from "../lib/prisma.js"
import { findSameAgency } from "../helper/agency.js"
import type { AgencyInput } from "../validators/admin.validator.js"

// What the answer says about an agency
const AGENCY_SUMMARY_SELECT = {
  agency_id: true,
  name: true,
  suburb: true,
  state: true,
  postcode: true,
} as const

// Explicit select so password_hash can never leave through the answer
const AGENT_USER_SELECT = {
  user_id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const

export interface AgencySummary {
  agency_id: number
  name: string
  suburb: string | null
  state: string | null
  postcode: string | null
}

// The profile of the agent belongs to an agency that exists, or to a new one
export type AgencyChoice =
  | { kind: "existing"; agencyId: number }
  | { kind: "new"; agency: AgencyInput }

export interface CreateAgentRecord {
  name: string
  email: string
  password_hash: string
  license_number: string
  agency: AgencyChoice
}

export const adminRepository = {
  // One transaction: the agency (found or made), the account and the profile. When any step fails,
  // nothing is left behind. A new agency whose name (compared without regard to capitals and
  // spacing) is already taken in the same postcode is not made twice: the one that exists is used.
  // That comparison is done in code and not in the query, because whether two spellings are equal
  // in the database depends on its collation. Returns found = false when the agency that was asked
  // for does not exist.
  createAgentWithProfile: (record: CreateAgentRecord) => {
    return prisma.$transaction(async (tx) => {
      let agency: AgencySummary
      let agencyCreated = false

      if (record.agency.kind === "existing") {
        const existing = await tx.agency.findUnique({
          where: { agency_id: record.agency.agencyId },
          select: AGENCY_SUMMARY_SELECT,
        })
        if (!existing) return { found: false as const }
        agency = existing
      } else {
        const input = record.agency.agency
        const candidates = await tx.agency.findMany({
          where: { postcode: input.postcode },
          select: AGENCY_SUMMARY_SELECT,
        })
        const same = findSameAgency(candidates, input.name)

        if (same) {
          agency = same
        } else {
          agency = await tx.agency.create({
            data: {
              name: input.name,
              address: input.address ?? null,
              suburb: input.suburb,
              state: input.state,
              postcode: input.postcode,
              phone: input.phone ?? null,
              email: input.email ?? null,
              website: input.website ?? null,
            },
            select: AGENCY_SUMMARY_SELECT,
          })
          agencyCreated = true
        }
      }

      const user = await tx.user.create({
        data: {
          name: record.name,
          email: record.email,
          password_hash: record.password_hash,
          role: "AGENT",
        },
        select: AGENT_USER_SELECT,
      })

      const profile = await tx.agentProfile.create({
        data: {
          user_id: user.user_id,
          agency_id: agency.agency_id,
          license_number: record.license_number,
        },
        select: { agent_id: true, license_number: true },
      })

      return { found: true as const, user, profile, agency, agencyCreated }
    })
  },

  // The agencies an admin can choose from, by name, with the number of agents of each. Whether a
  // search ignores capitals depends on the collation of the database.
  listAgencies: async ({
    q,
    page,
    pageSize,
  }: {
    q?: string | undefined
    page: number
    pageSize: number
  }) => {
    const where = q === undefined ? {} : { name: { contains: q } }

    const [records, total] = await prisma.$transaction([
      prisma.agency.findMany({
        where,
        select: { ...AGENCY_SUMMARY_SELECT, _count: { select: { agents: true } } },
        orderBy: [{ name: "asc" }, { agency_id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.agency.count({ where }),
    ])

    return { records, total }
  },
}

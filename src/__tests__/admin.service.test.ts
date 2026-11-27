import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { CreateAgentInput } from "../validators/admin.validator.js"
import { ADMIN_ERROR_AGENCY_NOT_FOUND, ADMIN_ERROR_EMAIL_TAKEN } from "../constants/admin.js"

// The repositories, the hashing and the check of a unique key are replaced with fakes, so these tests
// only cover what the service decides. The service is loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const mockFindByEmail = jest.fn<(email: string) => Promise<unknown>>()
const mockCreate = jest.fn<(record: unknown) => Promise<unknown>>()
const mockListAgencies = jest.fn<(args: unknown) => Promise<unknown>>()
const mockHash = jest.fn<(plain: string, rounds: number) => Promise<string>>()

let adminService: typeof import("../services/admin.service.js").adminService

beforeAll(async () => {
  jest.doMock("bcrypt", () => ({
    __esModule: true,
    default: { hash: (plain: string, rounds: number) => mockHash(plain, rounds) },
  }))
  jest.doMock("../repositories/user.repository.js", () => ({
    userRepository: { findByEmail: (email: string) => mockFindByEmail(email) },
  }))
  jest.doMock("../repositories/admin.repository.js", () => ({
    adminRepository: {
      createAgentWithProfile: (record: unknown) => mockCreate(record),
      listAgencies: (args: unknown) => mockListAgencies(args),
    },
  }))
  jest.doMock("../helper/prismaErrors.js", () => ({
    isUniqueConstraintError: (err: unknown) =>
      typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002",
  }))

  const loaded = await import("../services/admin.service.js")
  adminService = loaded.adminService
})

const PASSWORD = "long-enough-password"
const HASH = "a-hash"

const AGENCY_INPUT = { name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" }

const BY_ID: CreateAgentInput = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  password: PASSWORD,
  licenseNumber: "L-1234",
  agencyId: 3,
}
const BY_NEW_AGENCY: CreateAgentInput = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  password: PASSWORD,
  licenseNumber: "L-1234",
  agency: AGENCY_INPUT,
}

const USER = {
  user_id: 12,
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  phone: null,
  role: "AGENT",
  status: "ACTIVE",
  created_at: new Date("2026-11-27T01:00:00.000Z"),
  updated_at: new Date("2026-11-27T01:00:00.000Z"),
}
const AGENCY = { agency_id: 3, name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" }

// What the repository answers when the agent was made
const made = (overrides: Record<string, unknown> = {}) => ({
  found: true,
  user: USER,
  profile: { agent_id: 5, license_number: "L-1234" },
  agency: AGENCY,
  agencyCreated: false,
  ...overrides,
})

beforeEach(() => {
  mockFindByEmail.mockReset()
  mockCreate.mockReset()
  mockListAgencies.mockReset()
  mockHash.mockReset()

  mockFindByEmail.mockResolvedValue(null)
  mockHash.mockResolvedValue(HASH)
  mockCreate.mockResolvedValue(made())
})

const recordSent = () => mockCreate.mock.calls[0]?.[0]

describe("adminService.createAgent", () => {
  it("answers the account, the profile and the agency", async () => {
    await expect(adminService.createAgent(BY_ID)).resolves.toEqual({
      user: USER,
      agentProfile: {
        agentId: 5,
        licenseNumber: "L-1234",
        agency: { agencyId: 3, name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" },
      },
      agencyCreated: false,
    })
  })

  it("says that the agency was made when it was", async () => {
    mockCreate.mockResolvedValue(made({ agencyCreated: true }))

    const result = await adminService.createAgent(BY_NEW_AGENCY)

    expect(result.agencyCreated).toBe(true)
  })

  it("asks for an agency that exists when an id is given", async () => {
    await adminService.createAgent(BY_ID)

    expect(recordSent()).toMatchObject({ agency: { kind: "existing", agencyId: 3 } })
  })

  it("asks for a new agency when one is described", async () => {
    await adminService.createAgent(BY_NEW_AGENCY)

    expect(recordSent()).toMatchObject({ agency: { kind: "new", agency: AGENCY_INPUT } })
  })

  it("hands the name, the e-mail address and the licence number on", async () => {
    await adminService.createAgent(BY_ID)

    expect(recordSent()).toMatchObject({
      name: "Alex Morgan",
      email: "alex.morgan@example.com",
      license_number: "L-1234",
    })
  })

  it("hashes the password once and never hands the plain one on", async () => {
    await adminService.createAgent(BY_ID)

    expect(mockHash).toHaveBeenCalledTimes(1)
    expect(mockHash).toHaveBeenCalledWith(PASSWORD, expect.any(Number))
    expect(recordSent()).toMatchObject({ password_hash: HASH })
    expect(JSON.stringify(recordSent())).not.toContain(PASSWORD)
  })

  it("answers 409 and writes nothing when the e-mail address is registered already", async () => {
    mockFindByEmail.mockResolvedValue({ user_id: 1 })

    await expect(adminService.createAgent(BY_ID)).rejects.toMatchObject({
      statusCode: 409,
      message: ADMIN_ERROR_EMAIL_TAKEN,
    })
    expect(mockHash).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("answers 404 when the agency does not exist", async () => {
    mockCreate.mockResolvedValue({ found: false })

    await expect(adminService.createAgent(BY_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: ADMIN_ERROR_AGENCY_NOT_FOUND,
    })
  })

  it("answers 409 when somebody registered the e-mail address in the meantime (a unique key)", async () => {
    mockCreate.mockRejectedValue({ code: "P2002" })

    await expect(adminService.createAgent(BY_ID)).rejects.toMatchObject({
      statusCode: 409,
      message: ADMIN_ERROR_EMAIL_TAKEN,
    })
  })

  it("passes any other error of the repository on", async () => {
    mockCreate.mockRejectedValue(new Error("database is down"))

    await expect(adminService.createAgent(BY_ID)).rejects.toThrow("database is down")
  })

  it("passes an error of the look-up of the e-mail address on and writes nothing", async () => {
    mockFindByEmail.mockRejectedValue(new Error("database is down"))

    await expect(adminService.createAgent(BY_ID)).rejects.toThrow("database is down")
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("refuses a request with no agency at all (the schema does that first; this is the guard)", async () => {
    const withoutAgency: CreateAgentInput = {
      name: "Alex Morgan",
      email: "alex.morgan@example.com",
      password: PASSWORD,
      licenseNumber: "L-1234",
    }

    await expect(adminService.createAgent(withoutAgency)).rejects.toMatchObject({ statusCode: 400 })
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe("adminService.listAgencies", () => {
  it("answers the agencies with the number of their agents and the numbers of the page", async () => {
    mockListAgencies.mockResolvedValue({
      records: [{ ...AGENCY, _count: { agents: 2 } }],
      total: 1,
    })

    await expect(adminService.listAgencies({ page: 1, pageSize: 20 })).resolves.toEqual({
      agencies: [
        {
          agencyId: 3,
          name: "Riverside Realty",
          suburb: "Brisbane City",
          state: "QLD",
          postcode: "4000",
          agentCount: 2,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })

  it("passes the search text and the page on", async () => {
    mockListAgencies.mockResolvedValue({ records: [], total: 0 })

    await adminService.listAgencies({ q: "river", page: 2, pageSize: 10 })

    expect(mockListAgencies).toHaveBeenCalledWith({ q: "river", page: 2, pageSize: 10 })
  })

  it("does not search for anything in particular when there is no text", async () => {
    mockListAgencies.mockResolvedValue({ records: [], total: 0 })

    await adminService.listAgencies({ page: 1, pageSize: 20 })

    expect(mockListAgencies).toHaveBeenCalledWith({ q: undefined, page: 1, pageSize: 20 })
  })
})

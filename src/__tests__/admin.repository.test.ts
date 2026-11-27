import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { CreateAgentRecord } from "../repositories/admin.repository.js"

// Prisma is replaced with a fake, so these tests check what is asked of the database and what is
// done with the answers. The repository is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
type Call = (args: unknown) => Promise<unknown>

const mockFindUnique = jest.fn<Call>()
const mockTxFindMany = jest.fn<Call>()
const mockAgencyCreate = jest.fn<Call>()
const mockUserCreate = jest.fn<Call>()
const mockProfileCreate = jest.fn<Call>()
const mockListFindMany = jest.fn<Call>()
const mockListCount = jest.fn<Call>()
const mockTransaction = jest.fn<(arg: unknown) => Promise<unknown>>()

// What the callback of a transaction gets
const tx = {
  agency: {
    findUnique: (args: unknown) => mockFindUnique(args),
    findMany: (args: unknown) => mockTxFindMany(args),
    create: (args: unknown) => mockAgencyCreate(args),
  },
  user: { create: (args: unknown) => mockUserCreate(args) },
  agentProfile: { create: (args: unknown) => mockProfileCreate(args) },
}

let adminRepository: typeof import("../repositories/admin.repository.js").adminRepository

beforeAll(async () => {
  jest.doMock("../lib/prisma.js", () => ({
    prisma: {
      $transaction: (arg: unknown) => mockTransaction(arg),
      agency: {
        findMany: (args: unknown) => mockListFindMany(args),
        count: (args: unknown) => mockListCount(args),
      },
    },
  }))

  const loaded = await import("../repositories/admin.repository.js")
  adminRepository = loaded.adminRepository
})

const AGENCY_ROW = { agency_id: 3, name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" }
const USER_ROW = { user_id: 12, name: "Alex Morgan", email: "alex.morgan@example.com", role: "AGENT" }
const PROFILE_ROW = { agent_id: 5, license_number: "L-1234" }

const record = (agency: CreateAgentRecord["agency"]): CreateAgentRecord => ({
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  password_hash: "a-hash",
  license_number: "L-1234",
  agency,
})

const EXISTING: CreateAgentRecord["agency"] = { kind: "existing", agencyId: 3 }
const NEW_AGENCY: CreateAgentRecord["agency"] = {
  kind: "new",
  agency: { name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" },
}

// The first argument that a fake was called with
const firstArg = (mock: { mock: { calls: unknown[][] } }) => mock.mock.calls[0]?.[0]

beforeEach(() => {
  mockFindUnique.mockReset()
  mockTxFindMany.mockReset()
  mockAgencyCreate.mockReset()
  mockUserCreate.mockReset()
  mockProfileCreate.mockReset()
  mockListFindMany.mockReset()
  mockListCount.mockReset()
  mockTransaction.mockReset()

  mockFindUnique.mockResolvedValue(AGENCY_ROW)
  mockTxFindMany.mockResolvedValue([])
  mockAgencyCreate.mockResolvedValue(AGENCY_ROW)
  mockUserCreate.mockResolvedValue(USER_ROW)
  mockProfileCreate.mockResolvedValue(PROFILE_ROW)
  mockListFindMany.mockResolvedValue([])
  mockListCount.mockResolvedValue(0)
  mockTransaction.mockImplementation(async (arg) =>
    typeof arg === "function"
      ? (arg as (client: typeof tx) => Promise<unknown>)(tx)
      : Promise.all(arg as unknown[]),
  )
})

describe("adminRepository.createAgentWithProfile, an agency that exists", () => {
  it("looks the agency up by its id and makes none", async () => {
    await adminRepository.createAgentWithProfile(record(EXISTING))

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { agency_id: 3 }, select: expect.any(Object) })
    expect(mockTxFindMany).not.toHaveBeenCalled()
    expect(mockAgencyCreate).not.toHaveBeenCalled()
  })

  it("makes an AGENT account with the hash that was handed in", async () => {
    await adminRepository.createAgentWithProfile(record(EXISTING))

    expect(firstArg(mockUserCreate)).toMatchObject({
      data: { name: "Alex Morgan", email: "alex.morgan@example.com", password_hash: "a-hash", role: "AGENT" },
    })
  })

  it("makes a profile for that account in that agency, with the licence number", async () => {
    await adminRepository.createAgentWithProfile(record(EXISTING))

    expect(firstArg(mockProfileCreate)).toMatchObject({
      data: { user_id: 12, agency_id: 3, license_number: "L-1234" },
    })
  })

  it("never asks for the password hash back", async () => {
    await adminRepository.createAgentWithProfile(record(EXISTING))

    const args = firstArg(mockUserCreate) as { select: Record<string, unknown> }
    expect(args.select).not.toHaveProperty("password_hash")
    expect(args.select).toHaveProperty("user_id", true)
  })

  it("answers what was made", async () => {
    await expect(adminRepository.createAgentWithProfile(record(EXISTING))).resolves.toEqual({
      found: true,
      user: USER_ROW,
      profile: PROFILE_ROW,
      agency: AGENCY_ROW,
      agencyCreated: false,
    })
  })

  it("makes everything in one transaction", async () => {
    await adminRepository.createAgentWithProfile(record(EXISTING))

    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it("answers found = false and makes no account when the agency does not exist", async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(adminRepository.createAgentWithProfile(record(EXISTING))).resolves.toEqual({ found: false })
    expect(mockUserCreate).not.toHaveBeenCalled()
    expect(mockProfileCreate).not.toHaveBeenCalled()
  })

  it("passes an error of the profile on, so that the transaction is undone", async () => {
    mockProfileCreate.mockRejectedValue(new Error("boom"))

    await expect(adminRepository.createAgentWithProfile(record(EXISTING))).rejects.toThrow("boom")
  })
})

describe("adminRepository.createAgentWithProfile, a new agency", () => {
  const OTHER = { ...AGENCY_ROW, agency_id: 8, name: "Other Realty" }

  it("looks for an agency of the same name only among the agencies of the same postcode", async () => {
    await adminRepository.createAgentWithProfile(record(NEW_AGENCY))

    expect(mockTxFindMany).toHaveBeenCalledWith({ where: { postcode: "4000" }, select: expect.any(Object) })
  })

  it("makes the agency when none has that name, with null for what was not given", async () => {
    mockTxFindMany.mockResolvedValue([OTHER])
    mockAgencyCreate.mockResolvedValue({ ...AGENCY_ROW, agency_id: 9 })

    const result = await adminRepository.createAgentWithProfile(record(NEW_AGENCY))

    expect(firstArg(mockAgencyCreate)).toMatchObject({
      data: {
        name: "Riverside Realty",
        address: null,
        suburb: "Brisbane City",
        state: "QLD",
        postcode: "4000",
        phone: null,
        email: null,
        website: null,
      },
    })
    expect(result).toMatchObject({ found: true, agencyCreated: true })
    expect(firstArg(mockProfileCreate)).toMatchObject({ data: { agency_id: 9 } })
  })

  it("writes the details of the agency that were given", async () => {
    const details: CreateAgentRecord["agency"] = {
      kind: "new",
      agency: {
        name: "Riverside Realty",
        suburb: "Brisbane City",
        state: "QLD",
        postcode: "4000",
        address: "12 Example Street",
        phone: "07 5550 0101",
        email: "hello@riverside.example.com",
        website: "https://riverside.example.com",
      },
    }

    await adminRepository.createAgentWithProfile(record(details))

    expect(firstArg(mockAgencyCreate)).toMatchObject({
      data: {
        address: "12 Example Street",
        phone: "07 5550 0101",
        email: "hello@riverside.example.com",
        website: "https://riverside.example.com",
      },
    })
  })

  it("uses the agency that has the same name, whatever the capitals and the spacing, and makes none", async () => {
    mockTxFindMany.mockResolvedValue([{ ...AGENCY_ROW, agency_id: 4, name: "  riverside   REALTY " }])

    const result = await adminRepository.createAgentWithProfile(record(NEW_AGENCY))

    expect(mockAgencyCreate).not.toHaveBeenCalled()
    expect(result).toMatchObject({ found: true, agencyCreated: false, agency: { agency_id: 4 } })
    expect(firstArg(mockProfileCreate)).toMatchObject({ data: { agency_id: 4 } })
  })

  it("takes the one that was made first when several have that name", async () => {
    mockTxFindMany.mockResolvedValue([
      { ...AGENCY_ROW, agency_id: 9 },
      { ...AGENCY_ROW, agency_id: 4, name: "riverside realty" },
    ])

    await adminRepository.createAgentWithProfile(record(NEW_AGENCY))

    expect(firstArg(mockProfileCreate)).toMatchObject({ data: { agency_id: 4 } })
  })
})

describe("adminRepository.listAgencies", () => {
  const ROW = { ...AGENCY_ROW, _count: { agents: 2 } }

  beforeEach(() => {
    mockListFindMany.mockResolvedValue([ROW])
    mockListCount.mockResolvedValue(1)
  })

  it("lists every agency when there is no search text", async () => {
    await adminRepository.listAgencies({ page: 1, pageSize: 20 })

    expect((firstArg(mockListFindMany) as { where: unknown }).where).toEqual({})
    expect(mockListCount).toHaveBeenCalledWith({ where: {} })
  })

  it("searches by a part of the name, and counts the agencies of the search", async () => {
    await adminRepository.listAgencies({ q: "river", page: 1, pageSize: 20 })

    expect((firstArg(mockListFindMany) as { where: unknown }).where).toEqual({ name: { contains: "river" } })
    expect(mockListCount).toHaveBeenCalledWith({ where: { name: { contains: "river" } } })
  })

  it("skips the agencies of the earlier pages", async () => {
    await adminRepository.listAgencies({ page: 3, pageSize: 10 })

    expect(firstArg(mockListFindMany)).toMatchObject({ skip: 20, take: 10 })
  })

  it("sorts by name, then by id", async () => {
    await adminRepository.listAgencies({ page: 1, pageSize: 20 })

    expect(firstArg(mockListFindMany)).toMatchObject({ orderBy: [{ name: "asc" }, { agency_id: "asc" }] })
  })

  it("asks for the number of agents of each agency", async () => {
    await adminRepository.listAgencies({ page: 1, pageSize: 20 })

    const args = firstArg(mockListFindMany) as { select: { _count: unknown } }
    expect(args.select._count).toEqual({ select: { agents: true } })
  })

  it("answers the agencies and the total", async () => {
    await expect(adminRepository.listAgencies({ page: 1, pageSize: 20 })).resolves.toEqual({
      records: [ROW],
      total: 1,
    })
  })
})

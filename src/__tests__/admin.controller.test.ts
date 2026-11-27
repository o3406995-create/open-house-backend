import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { NextFunction, Request, Response } from "express"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the request, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockCreateAgent = jest.fn<(input: unknown) => Promise<unknown>>()
const mockListAgencies = jest.fn<(input: unknown) => Promise<unknown>>()

let adminController: typeof import("../controllers/admin.controller.js").adminController

beforeAll(async () => {
  jest.doMock("../services/admin.service.js", () => ({
    adminService: {
      createAgent: (input: unknown) => mockCreateAgent(input),
      listAgencies: (input: unknown) => mockListAgencies(input),
    },
  }))

  const loaded = await import("../controllers/admin.controller.js")
  adminController = loaded.adminController
})

beforeEach(() => {
  mockCreateAgent.mockReset()
  mockListAgencies.mockReset()
})

function fakeResponse() {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

async function create(body: unknown) {
  const req = { body } as unknown as Request
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await adminController.createAgent(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

async function list(query: unknown) {
  const req = { query } as unknown as Request
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await adminController.listAgencies(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const AGENCY = { name: "Riverside Realty", suburb: "Brisbane City", state: "QLD", postcode: "4000" }
const VALID = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  password: "long-enough-password",
  licenseNumber: "L-1234",
  agencyId: 3,
}
const RESULT = { user: { user_id: 12 }, agentProfile: { agentId: 5 }, agencyCreated: false }

// The names of the fields that the answer of a failed validation lists
const fieldsOf = (res: { json: { mock: { calls: unknown[][] } } }) =>
  Object.keys((res.json.mock.calls[0]?.[0] as { errors: Record<string, unknown> }).errors)

describe("adminController.createAgent", () => {
  it("answers 201 with what the service returns", async () => {
    mockCreateAgent.mockResolvedValue(RESULT)

    const { res, next } = await create(VALID)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(RESULT)
    expect(next).not.toHaveBeenCalled()
  })

  it("hands the checked data to the service: trimmed, and without fields it does not know", async () => {
    mockCreateAgent.mockResolvedValue(RESULT)

    await create({ ...VALID, name: "  Alex Morgan  ", role: "ADMIN" })

    expect(mockCreateAgent).toHaveBeenCalledWith({
      name: "Alex Morgan",
      email: "alex.morgan@example.com",
      password: "long-enough-password",
      licenseNumber: "L-1234",
      agencyId: 3,
    })
  })

  it("answers 400 with the message and the fields that are wrong", async () => {
    const { res, next } = await create({ ...VALID, licenseNumber: undefined })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: VALIDATION_ERROR_MESSAGE, errors: expect.any(Object) })
    expect(fieldsOf(res)).toContain("licenseNumber")
    expect(next).not.toHaveBeenCalled()
  })

  it("does not call the service for a request that is not valid", async () => {
    await create({ ...VALID, email: "nope" })

    expect(mockCreateAgent).not.toHaveBeenCalled()
  })

  it("answers 400 when an agency id and a new agency are both given", async () => {
    const { res } = await create({ ...VALID, agency: AGENCY })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(fieldsOf(res)).toContain("agencyId")
    expect(mockCreateAgent).not.toHaveBeenCalled()
  })

  it("answers 400 when there is no body at all", async () => {
    const { res } = await create(undefined)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockCreateAgent).not.toHaveBeenCalled()
  })

  it("hands an error of the service to next and sends no response", async () => {
    const error = new AppError("Email is already registered.", 409)
    mockCreateAgent.mockRejectedValue(error)

    const { res, next } = await create(VALID)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe("adminController.listAgencies", () => {
  const PAGE = { agencies: [], total: 0, page: 1, pageSize: 20 }

  it("answers 200 with what the service returns", async () => {
    mockListAgencies.mockResolvedValue(PAGE)

    const { res, next } = await list({})

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(PAGE)
    expect(next).not.toHaveBeenCalled()
  })

  it("uses the defaults when the query is empty", async () => {
    mockListAgencies.mockResolvedValue(PAGE)

    await list({})

    expect(mockListAgencies).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
  })

  it("hands the search text and the numbers to the service as they were checked", async () => {
    mockListAgencies.mockResolvedValue(PAGE)

    await list({ q: "  river ", page: "2", pageSize: "10" })

    expect(mockListAgencies).toHaveBeenCalledWith({ q: "river", page: 2, pageSize: 10 })
  })

  it("answers 400 for a query that is not valid and does not call the service", async () => {
    const { res } = await list({ pageSize: "51" })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: VALIDATION_ERROR_MESSAGE, errors: expect.any(Object) })
    expect(mockListAgencies).not.toHaveBeenCalled()
  })

  it("hands an error of the service to next", async () => {
    const error = new Error("database is down")
    mockListAgencies.mockRejectedValue(error)

    const { res, next } = await list({})

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

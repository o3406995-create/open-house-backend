import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"
import { AGENT_ERROR_NO_PROFILE } from "../constants/agentProperty.js"

// The service is replaced with a fake, so these tests only cover what the controller does: validating
// the query, choosing the status code and passing errors on. The controller is loaded AFTER the fake is
// registered (see savedProperty.service.test.ts for why).
const mockList = jest.fn<(userId: number, input: unknown) => Promise<unknown>>()

let trackedPropertyListController: typeof import("../controllers/trackedPropertyList.controller.js").trackedPropertyListController

beforeAll(async () => {
  jest.doMock("../services/trackedPropertyList.service.js", () => ({
    trackedPropertyListService: {
      list: (userId: number, input: unknown) => mockList(userId, input),
    },
  }))

  const loaded = await import("../controllers/trackedPropertyList.controller.js")
  trackedPropertyListController = loaded.trackedPropertyListController
})

beforeEach(() => {
  mockList.mockReset()
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

// The user id is set by the auth middleware as a string, like in a real request
async function list(query: unknown, userId = "7") {
  const req = { userId, query } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await trackedPropertyListController.list(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const RESULT = { trackedProperties: [], total: 0, page: 1, pageSize: 20 }

describe("trackedPropertyListController.list", () => {
  it("answers 200 with what the service returns", async () => {
    mockList.mockResolvedValue(RESULT)

    const { res, next } = await list({})

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(RESULT)
    expect(next).not.toHaveBeenCalled()
  })

  it("hands the user as a number and the first page of twenty to the service when the query is empty", async () => {
    mockList.mockResolvedValue(RESULT)

    await list({}, "7")

    expect(mockList).toHaveBeenCalledWith(7, { page: 1, pageSize: 20 })
  })

  it("hands the page and the size to the service as numbers", async () => {
    mockList.mockResolvedValue(RESULT)

    await list({ page: "2", pageSize: "10" }, "7")

    expect(mockList).toHaveBeenCalledWith(7, { page: 2, pageSize: 10 })
  })

  it("answers 400 with the message and the field that is wrong", async () => {
    const { res, next } = await list({ pageSize: "51" })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: VALIDATION_ERROR_MESSAGE, errors: expect.any(Object) })
    expect(Object.keys((res.json.mock.calls[0]?.[0] as { errors: object }).errors)).toContain("pageSize")
    expect(next).not.toHaveBeenCalled()
  })

  it("does not call the service for a query that is not valid", async () => {
    await list({ page: "0" })

    expect(mockList).not.toHaveBeenCalled()
  })

  it("hands an error of the service to next and sends no response", async () => {
    const error = new AppError(AGENT_ERROR_NO_PROFILE, 409)
    mockList.mockRejectedValue(error)

    const { res, next } = await list({})

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

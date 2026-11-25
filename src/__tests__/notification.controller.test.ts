import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the query, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockList = jest.fn<(userId: number, input: unknown) => Promise<unknown>>()

let notificationController: typeof import("../controllers/notification.controller.js").notificationController

beforeAll(async () => {
  jest.doMock("../services/notification.service.js", () => ({
    notificationService: { list: (userId: number, input: unknown) => mockList(userId, input) },
  }))

  const loaded = await import("../controllers/notification.controller.js")
  notificationController = loaded.notificationController
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
async function call(query: unknown, userId = "7") {
  const req = { userId, query } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await notificationController.list(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const RESULT = { notifications: [], total: 0, unreadCount: 0, page: 1, pageSize: 20 }

describe("notificationController.list", () => {
  it("answers 200 with what the service returns", async () => {
    mockList.mockResolvedValue(RESULT)

    const { res, next } = await call({})

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(RESULT)
    expect(next).not.toHaveBeenCalled()
  })

  it("passes the user as a number and the default page to the service", async () => {
    mockList.mockResolvedValue(RESULT)

    await call({}, "7")

    expect(mockList).toHaveBeenCalledWith(7, { page: 1, pageSize: 20 })
  })

  it("turns the query strings into numbers", async () => {
    mockList.mockResolvedValue(RESULT)

    await call({ page: "3", pageSize: "5" })

    expect(mockList).toHaveBeenCalledWith(7, { page: 3, pageSize: 5 })
  })

  it.each([
    ["page 0", { page: "0" }],
    ["a page that is not a number", { page: "abc" }],
    ["page size 0", { pageSize: "0" }],
    ["a page size above the limit", { pageSize: "51" }],
    ["a decimal page size", { pageSize: "1.5" }],
  ])("answers 400 for %s and does not call the service", async (_label, query) => {
    const { res, next } = await call(query)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: VALIDATION_ERROR_MESSAGE }),
    )
    expect(mockList).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands an error from the service to next and sends no response", async () => {
    const error = new AppError("Something went wrong", 500)
    mockList.mockRejectedValue(error)

    const { res, next } = await call({})

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

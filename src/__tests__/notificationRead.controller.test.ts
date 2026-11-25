import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the id, choosing the status code and passing errors on. The controller is loaded
// AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockMarkRead = jest.fn<(userId: number, id: number) => Promise<unknown>>()

let notificationController: typeof import("../controllers/notification.controller.js").notificationController

beforeAll(async () => {
  jest.doMock("../services/notification.service.js", () => ({
    notificationService: {
      list: () => Promise.reject(new Error("not used by these tests")),
      markRead: (userId: number, id: number) => mockMarkRead(userId, id),
    },
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
async function call(params: unknown, userId = "7") {
  const req = { userId, params } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await notificationController.markRead(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const NOTIFICATION = { notificationId: 4, isRead: true }

describe("notificationController.markRead", () => {
  it("answers 200 with the notification", async () => {
    mockMarkRead.mockResolvedValue(NOTIFICATION)

    const { res, next } = await call({ notificationId: "4" })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ notification: NOTIFICATION })
    expect(next).not.toHaveBeenCalled()
  })

  it("passes the user and the id to the service as numbers", async () => {
    mockMarkRead.mockResolvedValue(NOTIFICATION)

    await call({ notificationId: "4" }, "7")

    expect(mockMarkRead).toHaveBeenCalledWith(7, 4)
  })

  it.each([
    ["a non-numeric id", "abc"],
    ["id 0", "0"],
    ["an id in exponent form", "1e2"],
    ["an id above the INT range", "99999999999"],
  ])("answers 400 for %s and does not call the service", async (_label, notificationId) => {
    const { res, next } = await call({ notificationId })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: VALIDATION_ERROR_MESSAGE }),
    )
    expect(mockMarkRead).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands a 404 from the service to next and sends no response", async () => {
    const error = new AppError("Notification not found.", 404)
    mockMarkRead.mockRejectedValue(error)

    const { res, next } = await call({ notificationId: "4" })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

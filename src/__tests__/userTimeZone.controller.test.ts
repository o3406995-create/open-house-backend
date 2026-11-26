import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the body, choosing the status code and passing errors on. The controller is loaded
// AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockSet = jest.fn<(userId: number, timeZone: string) => Promise<unknown>>()

let userTimeZoneController: typeof import("../controllers/userTimeZone.controller.js").userTimeZoneController

beforeAll(async () => {
  jest.doMock("../services/userTimeZone.service.js", () => ({
    userTimeZoneService: { set: (userId: number, timeZone: string) => mockSet(userId, timeZone) },
  }))

  const loaded = await import("../controllers/userTimeZone.controller.js")
  userTimeZoneController = loaded.userTimeZoneController
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
async function call(body: unknown, userId = "7") {
  const req = { userId, body } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await userTimeZoneController.set(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

describe("userTimeZoneController.set", () => {
  it("answers 200 with what the service returns", async () => {
    mockSet.mockResolvedValue({ timeZone: "Australia/Sydney" })

    const { res, next } = await call({ timeZone: "Australia/Sydney" })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ timeZone: "Australia/Sydney" })
    expect(next).not.toHaveBeenCalled()
  })

  it("passes the user as a number and the time zone to the service", async () => {
    mockSet.mockResolvedValue({ timeZone: "UTC" })

    await call({ timeZone: "UTC" }, "7")

    expect(mockSet).toHaveBeenCalledWith(7, "UTC")
  })

  it.each([
    ["no body", undefined],
    ["an empty body", {}],
    ["an empty time zone", { timeZone: "" }],
    ["a name that is not a time zone", { timeZone: "Mars/Olympus" }],
    ["a number", { timeZone: 5 }],
  ])("answers 400 for %s and does not call the service", async (_label, body) => {
    const { res, next } = await call(body)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: VALIDATION_ERROR_MESSAGE }),
    )
    expect(mockSet).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands an error from the service to next and sends no response", async () => {
    const error = new AppError("Something went wrong", 500)
    mockSet.mockRejectedValue(error)

    const { res, next } = await call({ timeZone: "UTC" })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

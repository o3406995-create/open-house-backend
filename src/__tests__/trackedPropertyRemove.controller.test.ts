import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"
import { AGENT_ERROR_NO_PROFILE, AGENT_ERROR_TRACKED_NOT_FOUND } from "../constants/agentProperty.js"

// The service is replaced with a fake, so these tests only cover what the controller does: validating the
// id in the path, choosing the status code and passing errors on. The controller is loaded AFTER the fake
// is registered (see savedProperty.service.test.ts for why).
const mockRemove = jest.fn<(userId: number, trackedId: number) => Promise<void>>()

let trackedPropertyRemoveController: typeof import("../controllers/trackedPropertyRemove.controller.js").trackedPropertyRemoveController

beforeAll(async () => {
  jest.doMock("../services/trackedPropertyRemove.service.js", () => ({
    trackedPropertyRemoveService: {
      remove: (userId: number, trackedId: number) => mockRemove(userId, trackedId),
    },
  }))

  const loaded = await import("../controllers/trackedPropertyRemove.controller.js")
  trackedPropertyRemoveController = loaded.trackedPropertyRemoveController
})

beforeEach(() => {
  mockRemove.mockReset()
  mockRemove.mockResolvedValue(undefined)
})

function fakeResponse() {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
    send: jest.fn<() => unknown>(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res
}

// The user id is set by the auth middleware as a string, like in a real request
async function remove(params: unknown, userId = "7") {
  const req = { userId, params } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await trackedPropertyRemoveController.remove(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

describe("trackedPropertyRemoveController.remove", () => {
  it("answers 204 with no body when the row was removed", async () => {
    const { res, next } = await remove({ trackedId: "12" })

    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.json).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands the user and the id from the path to the service as numbers", async () => {
    await remove({ trackedId: "12" }, "7")

    expect(mockRemove).toHaveBeenCalledWith(7, 12)
  })

  it("answers 400 with the message and the field that is wrong", async () => {
    const { res, next } = await remove({ trackedId: "abc" })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: VALIDATION_ERROR_MESSAGE, errors: expect.any(Object) })
    expect(Object.keys((res.json.mock.calls[0]?.[0] as { errors: object }).errors)).toContain("trackedId")
    expect(next).not.toHaveBeenCalled()
  })

  it.each(["abc", "0", "-1", "1e2"])("does not call the service for the id %j", async (trackedId) => {
    await remove({ trackedId })

    expect(mockRemove).not.toHaveBeenCalled()
  })

  it("answers 400 when there is no id in the path", async () => {
    const { res } = await remove({})

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it.each([
    ["a row that is not found", new AppError(AGENT_ERROR_TRACKED_NOT_FOUND, 404)],
    ["an account with no profile", new AppError(AGENT_ERROR_NO_PROFILE, 409)],
  ])("hands the error for %s to next and sends no response", async (_label, error) => {
    mockRemove.mockRejectedValue(error)

    const { res, next } = await remove({ trackedId: "12" })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })
})

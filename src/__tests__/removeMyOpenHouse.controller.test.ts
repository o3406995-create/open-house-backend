import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the id, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockRemove = jest.fn<(userId: number, myOpenHouseId: number) => Promise<void>>()

let myOpenHouseController: typeof import("../controllers/myOpenHouse.controller.js").myOpenHouseController

beforeAll(async () => {
  jest.doMock("../services/myOpenHouse.service.js", () => ({
    myOpenHouseService: {
      add: () => Promise.reject(new Error("not used by these tests")),
      list: () => Promise.reject(new Error("not used by these tests")),
      remove: (userId: number, myOpenHouseId: number) => mockRemove(userId, myOpenHouseId),
    },
  }))

  const loaded = await import("../controllers/myOpenHouse.controller.js")
  myOpenHouseController = loaded.myOpenHouseController
})

function fakeResponse() {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
    send: jest.fn<() => unknown>(),
  }
  // Express chains res.status(...).json(...) and res.status(...).send()
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res
}

// The user id is set by the auth middleware as a string, like in a real request
async function callRemove(params: unknown, userId = "7") {
  const req = { params, userId } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await myOpenHouseController.remove(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

describe("myOpenHouseController.remove", () => {
  it("answers 204 without a body", async () => {
    mockRemove.mockResolvedValue(undefined)

    const { res, next } = await callRemove({ myOpenHouseId: "3" })

    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("passes the user of the request and the id as numbers to the service", async () => {
    mockRemove.mockResolvedValue(undefined)

    await callRemove({ myOpenHouseId: "3" }, "7")

    expect(mockRemove).toHaveBeenCalledWith(7, 3)
  })

  it.each([
    ["a non-numeric id", "abc"],
    ["id 0", "0"],
    ["a negative id", "-1"],
    ["a decimal id", "1.5"],
    ["an id in exponent form", "1e2"],
    ["an id above the INT range", "99999999999"],
  ])("answers 400 for %s and does not call the service", async (_label, myOpenHouseId) => {
    const { res, next } = await callRemove({ myOpenHouseId })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: VALIDATION_ERROR_MESSAGE,
        errors: expect.objectContaining({ myOpenHouseId: expect.any(Array) }),
      }),
    )
    expect(mockRemove).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands a 404 from the service to next and sends no response", async () => {
    const error = new AppError("My open house not found.", 404)
    mockRemove.mockRejectedValue(error)

    const { res, next } = await callRemove({ myOpenHouseId: "3" })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })
})

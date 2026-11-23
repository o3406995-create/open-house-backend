import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the id, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockMarkAttended = jest.fn<(userId: number, myOpenHouseId: number) => Promise<unknown>>()

let myOpenHouseController: typeof import("../controllers/myOpenHouse.controller.js").myOpenHouseController

beforeAll(async () => {
  jest.doMock("../services/myOpenHouse.service.js", () => ({
    myOpenHouseService: {
      add: () => Promise.reject(new Error("not used by these tests")),
      list: () => Promise.reject(new Error("not used by these tests")),
      remove: () => Promise.reject(new Error("not used by these tests")),
      markAttended: (userId: number, myOpenHouseId: number) =>
        mockMarkAttended(userId, myOpenHouseId),
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
  // Express chains res.status(...).json(...)
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res
}

// The user id is set by the auth middleware as a string, like in a real request
async function callMarkAttended(params: unknown, userId = "7") {
  const req = { params, userId } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await myOpenHouseController.markAttended(
    req,
    res as unknown as Response,
    next as unknown as NextFunction,
  )

  return { res, next }
}

const ITEM = { myOpenHouseId: 3, attended: true, group: "attended" }

describe("myOpenHouseController.markAttended", () => {
  it("answers 200 with the entry", async () => {
    mockMarkAttended.mockResolvedValue(ITEM)

    const { res, next } = await callMarkAttended({ myOpenHouseId: "3" })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ myOpenHouse: ITEM })
    expect(next).not.toHaveBeenCalled()
  })

  it("passes the user of the request and the id as numbers to the service", async () => {
    mockMarkAttended.mockResolvedValue(ITEM)

    await callMarkAttended({ myOpenHouseId: "3" }, "7")

    expect(mockMarkAttended).toHaveBeenCalledWith(7, 3)
  })

  it.each([
    ["a non-numeric id", "abc"],
    ["id 0", "0"],
    ["a negative id", "-1"],
    ["a decimal id", "1.5"],
    ["an id in exponent form", "1e2"],
    ["an id above the INT range", "99999999999"],
  ])("answers 400 for %s and does not call the service", async (_label, myOpenHouseId) => {
    const { res, next } = await callMarkAttended({ myOpenHouseId })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: VALIDATION_ERROR_MESSAGE,
        errors: expect.objectContaining({ myOpenHouseId: expect.any(Array) }),
      }),
    )
    expect(mockMarkAttended).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    ["404", new AppError("My open house not found.", 404)],
    ["409", new AppError("This open house has not started yet.", 409)],
  ])("hands a %s from the service to next and sends no response", async (_label, error) => {
    mockMarkAttended.mockRejectedValue(error)

    const { res, next } = await callMarkAttended({ myOpenHouseId: "3" })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })
})

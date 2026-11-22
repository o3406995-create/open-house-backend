import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"
import { DEFAULT_TIME_ZONE } from "../constants/myOpenHouse.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the query, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockList = jest.fn<(userId: number, timeZone: string) => Promise<unknown>>()

let myOpenHouseController: typeof import("../controllers/myOpenHouse.controller.js").myOpenHouseController

beforeAll(async () => {
  jest.doMock("../services/myOpenHouse.service.js", () => ({
    myOpenHouseService: {
      add: () => Promise.reject(new Error("not used by these tests")),
      list: (userId: number, timeZone: string) => mockList(userId, timeZone),
    },
  }))

  const loaded = await import("../controllers/myOpenHouse.controller.js")
  myOpenHouseController = loaded.myOpenHouseController
})

function fakeResponse() {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
  }
  // Express chains res.status(...).json(...)
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

// The user id is set by the auth middleware as a string, like in a real request
async function callList(query: unknown, userId = "7") {
  const req = { query, userId } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await myOpenHouseController.list(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const RESULT = { timeZone: "UTC", counts: {}, myOpenHouses: {} }

describe("myOpenHouseController.list", () => {
  it("answers 200 with what the service returns", async () => {
    mockList.mockResolvedValue(RESULT)

    const { res } = await callList({ timeZone: "UTC" })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(RESULT)
  })

  it("uses the default time zone when none is sent", async () => {
    mockList.mockResolvedValue(RESULT)

    await callList({})

    expect(mockList).toHaveBeenCalledWith(7, DEFAULT_TIME_ZONE)
  })

  it("passes the time zone of the query and the user of the request as a number", async () => {
    mockList.mockResolvedValue(RESULT)

    await callList({ timeZone: "Australia/Sydney" }, "7")

    expect(mockList).toHaveBeenCalledWith(7, "Australia/Sydney")
  })

  it.each([
    ["an unknown time zone", { timeZone: "Mars/Olympus" }],
    ["an empty time zone", { timeZone: "" }],
    ["a time zone sent twice", { timeZone: ["UTC", "UTC"] }],
  ])("answers 400 for %s and does not call the service", async (_label, query) => {
    const { res, next } = await callList(query)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: VALIDATION_ERROR_MESSAGE,
        errors: expect.objectContaining({ timeZone: expect.any(Array) }),
      }),
    )
    expect(mockList).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands an error from the service to next and sends no response", async () => {
    const error = new Error("database is down")
    mockList.mockRejectedValue(error)

    const { res, next } = await callList({})

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the body, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockAdd =
  jest.fn<
    (userId: number, propertyExternalId: string, openHouseExternalId: string) => Promise<unknown>
  >()

let myOpenHouseController: typeof import("../controllers/myOpenHouse.controller.js").myOpenHouseController

beforeAll(async () => {
  jest.doMock("../services/myOpenHouse.service.js", () => ({
    myOpenHouseService: {
      add: (userId: number, propertyExternalId: string, openHouseExternalId: string) =>
        mockAdd(userId, propertyExternalId, openHouseExternalId),
    },
  }))

  const loaded = await import("../controllers/myOpenHouse.controller.js")
  myOpenHouseController = loaded.myOpenHouseController
})

const VALID_BODY = { propertyExternalId: "mock-1", openHouseExternalId: "mock-1-1" }

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
async function callAdd(body: unknown, userId = "7") {
  const req = { body, userId } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await myOpenHouseController.add(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

describe("myOpenHouseController.add", () => {
  it("answers 201 with the new entry", async () => {
    mockAdd.mockResolvedValue({ created: true, myOpenHouse: { myOpenHouseId: 9 } })

    const { res } = await callAdd(VALID_BODY)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ myOpenHouse: { myOpenHouseId: 9 } })
  })

  it("answers 200 when the open house was already added", async () => {
    mockAdd.mockResolvedValue({ created: false, myOpenHouse: { myOpenHouseId: 9 } })

    const { res } = await callAdd(VALID_BODY)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ myOpenHouse: { myOpenHouseId: 9 } })
  })

  it("passes the user of the request as a number, and the two ids, to the service", async () => {
    mockAdd.mockResolvedValue({ created: true, myOpenHouse: {} })

    await callAdd(VALID_BODY, "7")

    expect(mockAdd).toHaveBeenCalledWith(7, "mock-1", "mock-1-1")
  })

  it("ignores a user id sent in the body", async () => {
    mockAdd.mockResolvedValue({ created: true, myOpenHouse: {} })

    await callAdd({ ...VALID_BODY, userId: 99 }, "7")

    expect(mockAdd).toHaveBeenCalledWith(7, "mock-1", "mock-1-1")
  })

  it.each([
    ["an empty body", {}],
    ["no body", undefined],
    ["a missing open house id", { propertyExternalId: "mock-1" }],
    ["an open house id with a slash", { ...VALID_BODY, openHouseExternalId: "a/b" }],
  ])("answers 400 for %s and does not call the service", async (_label, body) => {
    const { res, next } = await callAdd(body)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: VALIDATION_ERROR_MESSAGE }),
    )
    expect(mockAdd).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("names the invalid field in the 400 response", async () => {
    const { res } = await callAdd({ propertyExternalId: "mock-1", openHouseExternalId: "a..b" })

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({ openHouseExternalId: expect.any(Array) }),
      }),
    )
  })

  it("hands an error from the service to next and sends no response", async () => {
    const error = new AppError("Open house not found.", 404)
    mockAdd.mockRejectedValue(error)

    const { res, next } = await callAdd(VALID_BODY)

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

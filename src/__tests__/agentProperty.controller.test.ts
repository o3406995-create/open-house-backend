import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"
import { AGENT_ERROR_NO_PROFILE } from "../constants/agentProperty.js"

// The service is replaced with a fake, so these tests only cover what the controller does: validating
// the request, choosing the status code and passing errors on. The controller is loaded AFTER the fake
// is registered (see savedProperty.service.test.ts for why).
const mockTrack = jest.fn<(userId: number, externalId: string) => Promise<unknown>>()

let agentPropertyController: typeof import("../controllers/agentProperty.controller.js").agentPropertyController

beforeAll(async () => {
  jest.doMock("../services/agentProperty.service.js", () => ({
    agentPropertyService: {
      track: (userId: number, externalId: string) => mockTrack(userId, externalId),
    },
  }))

  const loaded = await import("../controllers/agentProperty.controller.js")
  agentPropertyController = loaded.agentPropertyController
})

beforeEach(() => {
  mockTrack.mockReset()
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
async function add(body: unknown, userId = "7") {
  const req = { userId, body } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await agentPropertyController.add(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const TRACKED = { trackedId: 9, addedAt: "2026-11-27T05:00:00.000Z", property: { externalId: "mock-1" } }

describe("agentPropertyController.add", () => {
  it("answers 201 with the tracked property when it was made", async () => {
    mockTrack.mockResolvedValue({ created: true, trackedProperty: TRACKED })

    const { res, next } = await add({ externalId: "mock-1" })

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ trackedProperty: TRACKED })
    expect(next).not.toHaveBeenCalled()
  })

  it("answers 200 when the agent tracked the property already", async () => {
    mockTrack.mockResolvedValue({ created: false, trackedProperty: TRACKED })

    const { res } = await add({ externalId: "mock-1" })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ trackedProperty: TRACKED })
  })

  it("hands the user as a number and the id of the listing to the service, and nothing else of the body", async () => {
    mockTrack.mockResolvedValue({ created: true, trackedProperty: TRACKED })

    await add({ externalId: "mock-1", address: "1 Fake Street" }, "7")

    expect(mockTrack).toHaveBeenCalledWith(7, "mock-1")
  })

  it("answers 400 with the message and the field that is wrong", async () => {
    const { res, next } = await add({})

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: VALIDATION_ERROR_MESSAGE, errors: expect.any(Object) })
    expect(Object.keys((res.json.mock.calls[0]?.[0] as { errors: object }).errors)).toContain("externalId")
    expect(next).not.toHaveBeenCalled()
  })

  it("does not call the service for a request that is not valid", async () => {
    await add({ externalId: "" })

    expect(mockTrack).not.toHaveBeenCalled()
  })

  it("answers 400 when there is no body at all", async () => {
    const { res } = await add(undefined)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it("hands an error of the service to next and sends no response", async () => {
    const error = new AppError(AGENT_ERROR_NO_PROFILE, 409)
    mockTrack.mockRejectedValue(error)

    const { res, next } = await add({ externalId: "mock-1" })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

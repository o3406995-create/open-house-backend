import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Request, Response } from "express"
import { AppError } from "../lib/AppError.js"

// The service is replaced with a fake, so these tests only cover what the controller does: choosing
// the status code and passing errors on. The controller is loaded AFTER the fake is registered (see
// savedProperty.service.test.ts for why).
const mockGenerate = jest.fn<() => Promise<unknown>>()

let jobsController: typeof import("../controllers/jobs.controller.js").jobsController

beforeAll(async () => {
  jest.doMock("../services/scheduleReminder.service.js", () => ({
    scheduleReminderService: { generate: (...args: []) => mockGenerate(...args) },
  }))

  const loaded = await import("../controllers/jobs.controller.js")
  jobsController = loaded.jobsController
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

async function call() {
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await jobsController.scheduleReminders({} as Request, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

describe("jobsController.scheduleReminders", () => {
  it("answers 200 with what the service returns", async () => {
    mockGenerate.mockResolvedValue({ candidates: 2, due: 1, created: 1 })

    const { res, next } = await call()

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ candidates: 2, due: 1, created: 1 })
    expect(next).not.toHaveBeenCalled()
  })

  it("lets the service use the time of now: it is called without a time", async () => {
    mockGenerate.mockResolvedValue({ candidates: 0, due: 0, created: 0 })

    await call()

    expect(mockGenerate).toHaveBeenCalledWith()
  })

  it("hands an error from the service to next and sends no response", async () => {
    const error = new AppError("Something went wrong", 500)
    mockGenerate.mockRejectedValue(error)

    const { res, next } = await call()

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals"
import type { NextFunction, Request, Response } from "express"
import { AppError } from "../lib/AppError.js"

// The service is replaced with a fake, so these tests only cover what the controller does: asking for
// both reminders, choosing the status code and passing errors on. The controller is loaded AFTER the
// fake is registered (see savedProperty.service.test.ts for why).
const mockGenerate = jest.fn<() => Promise<unknown>>()
const mockGenerateMorning = jest.fn<() => Promise<unknown>>()

let jobsController: typeof import("../controllers/jobs.controller.js").jobsController

beforeAll(async () => {
  jest.doMock("../services/scheduleReminder.service.js", () => ({
    scheduleReminderService: {
      generate: (...args: []) => mockGenerate(...args),
      generateMorning: (...args: []) => mockGenerateMorning(...args),
    },
  }))

  const loaded = await import("../controllers/jobs.controller.js")
  jobsController = loaded.jobsController
})

beforeEach(() => {
  mockGenerate.mockReset()
  mockGenerateMorning.mockReset()
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

const EVENING_RESULT = { candidates: 2, due: 1, created: 1 }
const MORNING_RESULT = { candidates: 3, due: 2, created: 2 }

describe("jobsController.scheduleReminders", () => {
  it("answers 200 with the result of each reminder", async () => {
    mockGenerate.mockResolvedValue(EVENING_RESULT)
    mockGenerateMorning.mockResolvedValue(MORNING_RESULT)

    const { res, next } = await call()

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ evening: EVENING_RESULT, morning: MORNING_RESULT })
    expect(next).not.toHaveBeenCalled()
  })

  it("asks for both reminders once, and lets the service use the time of now", async () => {
    mockGenerate.mockResolvedValue(EVENING_RESULT)
    mockGenerateMorning.mockResolvedValue(MORNING_RESULT)

    await call()

    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(mockGenerate).toHaveBeenCalledWith()
    expect(mockGenerateMorning).toHaveBeenCalledTimes(1)
    expect(mockGenerateMorning).toHaveBeenCalledWith()
  })

  it("still asks for the morning reminder when the evening one fails, and hands the error to next", async () => {
    const error = new AppError("Something went wrong", 500)
    mockGenerate.mockRejectedValue(error)
    mockGenerateMorning.mockResolvedValue(MORNING_RESULT)

    const { res, next } = await call()

    expect(mockGenerateMorning).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("still asks for the evening reminder when the morning one fails, and hands the error to next", async () => {
    const error = new AppError("Something went wrong", 500)
    mockGenerate.mockResolvedValue(EVENING_RESULT)
    mockGenerateMorning.mockRejectedValue(error)

    const { res, next } = await call()

    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("hands the error of the evening reminder on when both fail", async () => {
    const eveningError = new AppError("evening failed", 500)
    mockGenerate.mockRejectedValue(eveningError)
    mockGenerateMorning.mockRejectedValue(new AppError("morning failed", 500))

    const { next } = await call()

    expect(next).toHaveBeenCalledWith(eveningError)
  })
})

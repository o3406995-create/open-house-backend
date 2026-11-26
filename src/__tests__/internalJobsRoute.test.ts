import { describe, it, expect, jest, beforeAll, beforeEach, afterEach } from "@jest/globals"
import express, { type Express, type Request, type Response } from "express"
import request from "supertest"
import { errorHandler } from "../middleware/errorHandler.js"
import { JOB_SECRET_ENV, JOB_SECRET_HEADER } from "../constants/jobs.js"

// The real route and the real secret check, with a fake controller: what is tested is how the route
// is wired. The route is loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const SECRET = "a-secret-that-is-long-enough"
const original = process.env[JOB_SECRET_ENV]
const handled = jest.fn<() => void>()

let app: Express

beforeAll(async () => {
  jest.doMock("../controllers/jobs.controller.js", () => ({
    jobsController: {
      scheduleReminders: (_req: Request, res: Response) => {
        handled()
        res.status(200).json({ ran: true })
      },
    },
  }))

  const routes = await import("../routes/internalJobs.routes.js")

  app = express()
  app.use(express.json())
  app.use("/api/internal/jobs", routes.default)
  app.use(errorHandler)
})

beforeEach(() => {
  handled.mockClear()
  process.env[JOB_SECRET_ENV] = SECRET
})

afterEach(() => {
  if (original === undefined) {
    delete process.env[JOB_SECRET_ENV]
  } else {
    process.env[JOB_SECRET_ENV] = original
  }
})

function post(secret?: string) {
  const req = request(app).post("/api/internal/jobs/schedule-reminders")
  if (secret !== undefined) req.set(JOB_SECRET_HEADER, secret)
  return req.send()
}

describe("POST /api/internal/jobs/schedule-reminders", () => {
  it("answers 404 when the server has no secret, even for a caller that sends one", async () => {
    delete process.env[JOB_SECRET_ENV]

    const res = await post(SECRET)

    expect(res.status).toBe(404)
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 without the secret and does not reach the handler", async () => {
    const res = await post()

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 for a wrong secret and does not reach the handler", async () => {
    const res = await post("not-the-right-secret-at-all")

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it("runs the job for the right secret, without any login", async () => {
    const res = await post(SECRET)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ran: true })
    expect(handled).toHaveBeenCalledTimes(1)
  })
})

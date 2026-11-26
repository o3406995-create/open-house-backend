import { describe, it, expect, jest, beforeAll, afterAll } from "@jest/globals"
import express, { type Express, type Request, type Response } from "express"
import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import request from "supertest"
import { errorHandler } from "../middleware/errorHandler.js"
import { AUTH_COOKIE_NAME } from "../constants/auth.js"

// The real route and the real login check, with fake controllers and a fake user lookup: what is
// tested is how the route is wired. The modules are loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const SECRET = "time-zone-route-secret"

const mockFindActiveById =
  jest.fn<(id: number) => Promise<{ user_id: number; role: string } | null>>()
const handled = jest.fn<(name: string) => void>()

const handler = (name: string) => (_req: Request, res: Response) => {
  handled(name)
  res.status(200).json({ handler: name })
}

let app: Express
let originalSecret: string | undefined

beforeAll(async () => {
  originalSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = SECRET

  jest.doMock("../repositories/user.repository.js", () => ({
    userRepository: { findActiveById: (id: number) => mockFindActiveById(id) },
  }))
  jest.doMock("../controllers/auth.controller.js", () => ({
    authController: { getCurrentUser: handler("auth.getCurrentUser") },
  }))
  jest.doMock("../controllers/userTimeZone.controller.js", () => ({
    userTimeZoneController: { set: handler("userTimeZone.set") },
  }))

  const users = await import("../routes/users.routes.js")

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/users", users.default)
  app.use(errorHandler)
})

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = originalSecret
  }
})

const cookieFor = (secret = SECRET) =>
  `${AUTH_COOKIE_NAME}=${jwt.sign({ sub: "7", role: "USER" }, secret)}`

function put(cookie?: string) {
  const req = request(app).put("/api/users/me/time-zone")
  if (cookie) req.set("Cookie", cookie)
  return req.send({ timeZone: "UTC" })
}

describe("PUT /api/users/me/time-zone", () => {
  it("answers 401 without a login and does not reach the handler", async () => {
    const res = await put()

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 for a token that was signed with another secret", async () => {
    const res = await put(cookieFor("someone-elses-secret"))

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 when the account is not active any more", async () => {
    mockFindActiveById.mockResolvedValue(null)

    const res = await put(cookieFor())

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it.each(["USER", "AGENT", "ADMIN"])("lets an %s through: every kind of account has a time zone", async (role) => {
    mockFindActiveById.mockResolvedValue({ user_id: 7, role })

    const res = await put(cookieFor())

    expect(res.status).toBe(200)
    expect(handled).toHaveBeenCalledWith("userTimeZone.set")
  })
})

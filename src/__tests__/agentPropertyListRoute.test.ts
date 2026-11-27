import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from "@jest/globals"
import express, { type Express, type Request, type Response } from "express"
import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import request from "supertest"
import { errorHandler } from "../middleware/errorHandler.js"
import {
  AUTH_COOKIE_NAME,
  AUTH_ERROR_INVALID_SESSION,
  AUTH_ERROR_NOT_AUTHENTICATED,
} from "../constants/auth.js"

// The real routes (both files that are mounted under /api/agent, as in server.ts) and the real login and
// role checks, with fake controllers and a fake user lookup: what is tested is who gets through and
// which handler an answer comes from. The modules are loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const SECRET = "agent-list-route-test-secret"
const USER_ID = 7
const PATH = "/api/agent/my-properties"
const ADD = "agentProperty.add"
const LIST = "trackedPropertyList.list"

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
  jest.doMock("../controllers/agentProperty.controller.js", () => ({
    agentPropertyController: { add: handler(ADD) },
  }))
  jest.doMock("../controllers/trackedPropertyList.controller.js", () => ({
    trackedPropertyListController: { list: handler(LIST) },
  }))

  const { default: agentPropertyRoutes } = await import("../routes/agentProperty.routes.js")
  const { default: agentPropertyListRoutes } = await import("../routes/agentPropertyList.routes.js")

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/agent", agentPropertyRoutes)
  app.use("/api/agent", agentPropertyListRoutes)
  app.use(errorHandler)
})

afterAll(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalSecret
})

beforeEach(() => {
  mockFindActiveById.mockReset()
  handled.mockReset()
})

// A login cookie for an account with the given role, signed with the given secret
const cookieFor = (role: string, secret = SECRET) =>
  `${AUTH_COOKIE_NAME}=${jwt.sign({ sub: String(USER_ID), role }, secret)}`

function get(cookie?: string) {
  const req = request(app).get(PATH)
  if (cookie) req.set("Cookie", cookie)
  return req
}

function post(cookie: string) {
  return request(app).post(PATH).set("Cookie", cookie).send({ externalId: "mock-1" })
}

describe(`GET ${PATH}`, () => {
  it("answers 401 without a login, and never reaches the controller", async () => {
    const res = await get()

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: AUTH_ERROR_NOT_AUTHENTICATED })
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 for a login that was signed with another secret", async () => {
    const res = await get(cookieFor("AGENT", "another-secret"))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: AUTH_ERROR_INVALID_SESSION })
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 when the account is not active any more (deleted or disabled)", async () => {
    mockFindActiveById.mockResolvedValue(null)

    const res = await get(cookieFor("AGENT"))

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it.each(["USER", "ADMIN"])("answers 403 for a %s account, and never reaches the controller", async (role) => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role })

    const res = await get(cookieFor(role))

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: "Insufficient permissions." })
    expect(handled).not.toHaveBeenCalled()
  })

  it("goes by the role in the database, not by the one written in the login", async () => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "USER" })

    const res = await get(cookieFor("AGENT"))

    expect(res.status).toBe(403)
    expect(handled).not.toHaveBeenCalled()
  })

  it("lets an AGENT account through to the list, and not to the other handler of the same path", async () => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "AGENT" })

    const res = await get(cookieFor("AGENT"))

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ handler: LIST })
    expect(handled).toHaveBeenCalledTimes(1)
    expect(handled).toHaveBeenCalledWith(LIST)
  })
})

describe(`POST ${PATH} with both routes mounted`, () => {
  it("still goes to the handler that tracks a property, and not to the list", async () => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "AGENT" })

    const res = await post(cookieFor("AGENT"))

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ handler: ADD })
    expect(handled).toHaveBeenCalledTimes(1)
    expect(handled).toHaveBeenCalledWith(ADD)
  })
})

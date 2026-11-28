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

// The real routes (the three files that are mounted under /api/agent, as in server.ts) and the real login and
// role checks, with fake controllers and a fake user lookup: what is tested is who gets through and which
// handler an answer comes from. The modules are loaded AFTER the fakes are registered (see
// savedProperty.service.test.ts for why).
const SECRET = "agent-remove-route-test-secret"
const USER_ID = 7
const PATH = "/api/agent/my-properties"
const ADD = "agentProperty.add"
const LIST = "trackedPropertyList.list"
const REMOVE = "trackedPropertyRemove.remove"

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
  jest.doMock("../controllers/trackedPropertyRemove.controller.js", () => ({
    trackedPropertyRemoveController: { remove: handler(REMOVE) },
  }))

  const { default: addRoutes } = await import("../routes/agentProperty.routes.js")
  const { default: listRoutes } = await import("../routes/agentPropertyList.routes.js")
  const { default: removeRoutes } = await import("../routes/agentPropertyRemove.routes.js")

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/agent", addRoutes)
  app.use("/api/agent", listRoutes)
  app.use("/api/agent", removeRoutes)
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

function del(path: string, cookie?: string) {
  const req = request(app).delete(path)
  if (cookie) req.set("Cookie", cookie)
  return req
}

describe(`DELETE ${PATH}/:trackedId`, () => {
  const target = `${PATH}/12`

  it("answers 401 without a login, and never reaches the controller", async () => {
    const res = await del(target)

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: AUTH_ERROR_NOT_AUTHENTICATED })
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 for a login that was signed with another secret", async () => {
    const res = await del(target, cookieFor("AGENT", "another-secret"))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: AUTH_ERROR_INVALID_SESSION })
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 when the account is not active any more (deleted or disabled)", async () => {
    mockFindActiveById.mockResolvedValue(null)

    const res = await del(target, cookieFor("AGENT"))

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it.each(["USER", "ADMIN"])("answers 403 for a %s account, and never reaches the controller", async (role) => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role })

    const res = await del(target, cookieFor(role))

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: "Insufficient permissions." })
    expect(handled).not.toHaveBeenCalled()
  })

  it("goes by the role in the database, not by the one written in the login", async () => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "USER" })

    const res = await del(target, cookieFor("AGENT"))

    expect(res.status).toBe(403)
    expect(handled).not.toHaveBeenCalled()
  })

  it("lets an AGENT account through to the removal, and not to the other handlers of the same path", async () => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "AGENT" })

    const res = await del(target, cookieFor("AGENT"))

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ handler: REMOVE })
    expect(handled).toHaveBeenCalledTimes(1)
    expect(handled).toHaveBeenCalledWith(REMOVE)
  })

  it("has no such route without an id", async () => {
    mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "AGENT" })

    const res = await del(PATH, cookieFor("AGENT"))

    expect(res.status).toBe(404)
    expect(handled).not.toHaveBeenCalled()
  })
})

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

// The real routes and the real login and role checks, with a fake controller and a fake user lookup:
// what is tested is who gets through, not what the controller does. The modules are loaded AFTER the
// fakes are registered (see savedProperty.service.test.ts for why).
const SECRET = "admin-route-test-secret"
const USER_ID = 7

const mockFindActiveById =
  jest.fn<(id: number) => Promise<{ user_id: number; role: string } | null>>()
const handled = jest.fn<(name: string) => void>()

const handler = (name: string) => (_req: Request, res: Response) => {
  handled(name)
  res.status(200).json({ handler: name })
}

interface RouteCase {
  method: "get" | "post"
  path: string
  name: string
}

// Every endpoint that only an ADMIN may use
const ROUTES: RouteCase[] = [
  { method: "post", path: "/api/admin/agents", name: "admin.createAgent" },
  { method: "get", path: "/api/admin/agencies", name: "admin.listAgencies" },
]

let app: Express
let originalSecret: string | undefined

beforeAll(async () => {
  originalSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = SECRET

  jest.doMock("../repositories/user.repository.js", () => ({
    userRepository: { findActiveById: (id: number) => mockFindActiveById(id) },
  }))
  jest.doMock("../controllers/admin.controller.js", () => ({
    adminController: {
      createAgent: handler("admin.createAgent"),
      listAgencies: handler("admin.listAgencies"),
    },
  }))

  const { default: adminRoutes } = await import("../routes/admin.routes.js")

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/admin", adminRoutes)
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

function call(route: RouteCase, cookie?: string) {
  const req = request(app)[route.method](route.path)
  if (cookie) req.set("Cookie", cookie)
  return route.method === "post" ? req.send({}) : req
}

for (const route of ROUTES) {
  describe(`${route.method.toUpperCase()} ${route.path}`, () => {
    it("answers 401 without a login, and never reaches the controller", async () => {
      const res = await call(route)

      expect(res.status).toBe(401)
      expect(res.body).toEqual({ message: AUTH_ERROR_NOT_AUTHENTICATED })
      expect(handled).not.toHaveBeenCalled()
    })

    it("answers 401 for a login that was signed with another secret", async () => {
      const res = await call(route, cookieFor("ADMIN", "another-secret"))

      expect(res.status).toBe(401)
      expect(res.body).toEqual({ message: AUTH_ERROR_INVALID_SESSION })
      expect(handled).not.toHaveBeenCalled()
    })

    it("answers 401 when the account is not active any more (deleted or disabled)", async () => {
      mockFindActiveById.mockResolvedValue(null)

      const res = await call(route, cookieFor("ADMIN"))

      expect(res.status).toBe(401)
      expect(handled).not.toHaveBeenCalled()
    })

    it.each(["USER", "AGENT"])("answers 403 for a %s account, and never reaches the controller", async (role) => {
      mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role })

      const res = await call(route, cookieFor(role))

      expect(res.status).toBe(403)
      expect(res.body).toEqual({ message: "Insufficient permissions." })
      expect(handled).not.toHaveBeenCalled()
    })

    it("goes by the role in the database, not by the one written in the login", async () => {
      mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "USER" })

      const res = await call(route, cookieFor("ADMIN"))

      expect(res.status).toBe(403)
      expect(handled).not.toHaveBeenCalled()
    })

    it("lets an ADMIN account through to the controller", async () => {
      mockFindActiveById.mockResolvedValue({ user_id: USER_ID, role: "ADMIN" })

      const res = await call(route, cookieFor("ADMIN"))

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ handler: route.name })
      expect(handled).toHaveBeenCalledTimes(1)
      expect(handled).toHaveBeenCalledWith(route.name)
    })
  })
}

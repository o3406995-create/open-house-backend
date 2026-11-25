import { describe, it, expect, jest, beforeAll, afterAll } from "@jest/globals"
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

// The real routes and the real login and role checks, with fake controllers and a fake user
// lookup: what is tested is how the routes are wired, not the controllers or the database.
// The modules are loaded AFTER the fakes are registered (see savedProperty.service.test.ts).
const SECRET = "route-test-secret"

const mockFindActiveById =
  jest.fn<(id: number) => Promise<{ user_id: number; role: string } | null>>()
const handled = jest.fn<(name: string) => void>()

const handler = (name: string) => (_req: Request, res: Response) => {
  handled(name)
  res.status(200).json({ handler: name })
}

interface RouteCase {
  method: "get" | "post" | "put" | "patch" | "delete"
  path: string
  name: string
}

// Every endpoint that only a USER may use
const ROUTES: RouteCase[] = [
  { method: "post", path: "/api/saved-properties", name: "savedProperty.save" },
  { method: "get", path: "/api/saved-properties", name: "savedProperty.list" },
  { method: "delete", path: "/api/saved-properties/3", name: "savedProperty.remove" },
  { method: "post", path: "/api/my-open-houses", name: "myOpenHouse.add" },
  { method: "get", path: "/api/my-open-houses", name: "myOpenHouse.list" },
  { method: "delete", path: "/api/my-open-houses/3", name: "myOpenHouse.remove" },
  { method: "patch", path: "/api/my-open-houses/3/attended", name: "myOpenHouse.markAttended" },
  { method: "post", path: "/api/notes", name: "note.create" },
  { method: "put", path: "/api/notes/3", name: "note.update" },
  { method: "delete", path: "/api/notes/3", name: "note.remove" },
  { method: "get", path: "/api/notifications", name: "notification.list" },
  { method: "patch", path: "/api/notifications/3/read", name: "notification.markRead" },
]

const SAMPLE: RouteCase = { method: "post", path: "/api/notes", name: "note.create" }

let app: Express
let originalSecret: string | undefined

beforeAll(async () => {
  originalSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = SECRET

  jest.doMock("../repositories/user.repository.js", () => ({
    userRepository: { findActiveById: (id: number) => mockFindActiveById(id) },
  }))
  jest.doMock("../controllers/savedProperty.controller.js", () => ({
    savedPropertyController: {
      save: handler("savedProperty.save"),
      list: handler("savedProperty.list"),
      remove: handler("savedProperty.remove"),
    },
  }))
  jest.doMock("../controllers/myOpenHouse.controller.js", () => ({
    myOpenHouseController: {
      add: handler("myOpenHouse.add"),
      list: handler("myOpenHouse.list"),
      remove: handler("myOpenHouse.remove"),
      markAttended: handler("myOpenHouse.markAttended"),
    },
  }))
  jest.doMock("../controllers/note.controller.js", () => ({
    noteController: {
      create: handler("note.create"),
      update: handler("note.update"),
      remove: handler("note.remove"),
    },
  }))
  jest.doMock("../controllers/notification.controller.js", () => ({
    notificationController: {
      list: handler("notification.list"),
      markRead: handler("notification.markRead"),
    },
  }))

  const savedProperty = await import("../routes/savedProperty.routes.js")
  const myOpenHouse = await import("../routes/myOpenHouse.routes.js")
  const note = await import("../routes/note.routes.js")
  const notification = await import("../routes/notification.routes.js")

  app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use("/api/saved-properties", savedProperty.default)
  app.use("/api/my-open-houses", myOpenHouse.default)
  app.use("/api/notes", note.default)
  app.use("/api/notifications", notification.default)
  app.use(errorHandler)
})

afterAll(() => {
  if (originalSecret === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = originalSecret
  }
})

function cookieFor(options: { sub?: string; role?: string; secret?: string } = {}) {
  const { sub = "7", role = "USER", secret = SECRET } = options
  return `${AUTH_COOKIE_NAME}=${jwt.sign({ sub, role }, secret)}`
}

// The role of the user comes from the database, not from the token
const givenUser = (role: string) => mockFindActiveById.mockResolvedValue({ user_id: 7, role })

function send(route: RouteCase, cookie?: string) {
  const req = request(app)[route.method](route.path)
  if (cookie) req.set("Cookie", cookie)
  return route.method === "get" ? req : req.send({})
}

describe.each(ROUTES)("$method $path", (route) => {
  it("answers 401 without a login and does not reach the handler", async () => {
    const res = await send(route)

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: AUTH_ERROR_NOT_AUTHENTICATED })
    expect(mockFindActiveById).not.toHaveBeenCalled()
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 for a token that was signed with another secret", async () => {
    const res = await send(route, cookieFor({ secret: "someone-elses-secret" }))

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: AUTH_ERROR_INVALID_SESSION })
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 when the account is not active any more", async () => {
    mockFindActiveById.mockResolvedValue(null)

    const res = await send(route, cookieFor())

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it.each(["AGENT", "ADMIN"])("answers 403 for an %s and does not reach the handler", async (role) => {
    givenUser(role)

    const res = await send(route, cookieFor())

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: expect.any(String) })
    expect(handled).not.toHaveBeenCalled()
  })

  it("lets a USER through to this handler", async () => {
    givenUser("USER")

    const res = await send(route, cookieFor())

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ handler: route.name })
    expect(handled).toHaveBeenCalledTimes(1)
    expect(handled).toHaveBeenCalledWith(route.name)
    expect(mockFindActiveById).toHaveBeenCalledWith(7)
  })
})

describe("the login check", () => {
  it("ignores a cookie that has another name", async () => {
    const token = cookieFor().split("=")[1]

    const res = await send(SAMPLE, `other=${token}`)

    expect(res.status).toBe(401)
    expect(handled).not.toHaveBeenCalled()
  })

  it("answers 401 when the user id in the token is not a number", async () => {
    const res = await send(SAMPLE, cookieFor({ sub: "abc" }))

    expect(res.status).toBe(401)
    expect(mockFindActiveById).not.toHaveBeenCalled()
    expect(handled).not.toHaveBeenCalled()
  })

  it("takes the role from the database: a token that says ADMIN does not let an AGENT through", async () => {
    givenUser("AGENT")

    const res = await send(SAMPLE, cookieFor({ role: "ADMIN" }))

    expect(res.status).toBe(403)
    expect(handled).not.toHaveBeenCalled()
  })

  it("takes the role from the database: a token that says AGENT does not stop a USER", async () => {
    givenUser("USER")

    const res = await send(SAMPLE, cookieFor({ role: "AGENT" }))

    expect(res.status).toBe(200)
    expect(handled).toHaveBeenCalledWith("note.create")
  })
})

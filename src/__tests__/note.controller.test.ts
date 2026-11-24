import { describe, it, expect, jest, beforeAll } from "@jest/globals"
import type { NextFunction, Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js"
import { AppError } from "../lib/AppError.js"
import { VALIDATION_ERROR_MESSAGE } from "../constants/property.js"

// The service is replaced with a fake, so these tests only cover what the controller does:
// validating the input, choosing the status code and passing errors on. The controller is
// loaded AFTER the fake is registered (see savedProperty.service.test.ts for why).
const mockCreate = jest.fn<(userId: number, input: unknown) => Promise<unknown>>()
const mockUpdate = jest.fn<(userId: number, id: number, content: string) => Promise<unknown>>()
const mockRemove = jest.fn<(userId: number, id: number) => Promise<void>>()

let noteController: typeof import("../controllers/note.controller.js").noteController

beforeAll(async () => {
  jest.doMock("../services/note.service.js", () => ({
    noteService: {
      create: (userId: number, input: unknown) => mockCreate(userId, input),
      update: (userId: number, id: number, content: string) => mockUpdate(userId, id, content),
      remove: (userId: number, id: number) => mockRemove(userId, id),
    },
  }))

  const loaded = await import("../controllers/note.controller.js")
  noteController = loaded.noteController
})

function fakeResponse() {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
    send: jest.fn<() => unknown>(),
  }
  // Express chains res.status(...).json(...) and res.status(...).send()
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res
}

type Handler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<unknown>

interface FakeRequest {
  body?: unknown
  params?: unknown
}

// The user id is set by the auth middleware as a string, like in a real request
async function call(handler: Handler, request: FakeRequest, userId = "7") {
  const req = { userId, ...request } as unknown as AuthenticatedRequest
  const res = fakeResponse()
  const next = jest.fn<(err?: unknown) => void>()

  await handler(req, res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

const expectValidationError = (res: ReturnType<typeof fakeResponse>) => {
  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: VALIDATION_ERROR_MESSAGE }),
  )
}

const NOTE = { noteId: 5, content: "Call the agent" }

describe("noteController.create", () => {
  it("answers 201 with the note", async () => {
    mockCreate.mockResolvedValue(NOTE)

    const { res, next } = await call(noteController.create, {
      body: { savedPropertyId: 3, content: "Call the agent" },
    })

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ note: NOTE })
    expect(next).not.toHaveBeenCalled()
  })

  it("passes the user of the request as a number and the input to the service", async () => {
    mockCreate.mockResolvedValue(NOTE)

    await call(noteController.create, { body: { userOpenHouseId: 4, content: " hello " } }, "7")

    expect(mockCreate).toHaveBeenCalledWith(7, { userOpenHouseId: 4, content: "hello" })
  })

  it("ignores a user id sent in the body", async () => {
    mockCreate.mockResolvedValue(NOTE)

    await call(noteController.create, {
      body: { savedPropertyId: 3, content: "x", userId: 99 },
    })

    expect(mockCreate).toHaveBeenCalledWith(7, { savedPropertyId: 3, content: "x" })
  })

  it.each([
    ["an empty body", {}],
    ["no body", undefined],
    ["two targets", { savedPropertyId: 1, userOpenHouseId: 2, content: "x" }],
    ["empty content", { savedPropertyId: 1, content: "" }],
    ["content of spaces only", { savedPropertyId: 1, content: "   " }],
    ["content that is too long", { savedPropertyId: 1, content: "a".repeat(2001) }],
    ["a target id of 0", { savedPropertyId: 0, content: "x" }],
    ["a target id sent as text", { savedPropertyId: "3", content: "x" }],
    ["a target id above the INT range", { userOpenHouseId: 2147483648, content: "x" }],
  ])("answers 400 for %s and does not call the service", async (_label, body) => {
    const { res, next } = await call(noteController.create, { body })

    expectValidationError(res)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    ["404", new AppError("Saved property or open house not found.", 404)],
    ["409", new AppError("This item already has a note. Update it instead.", 409)],
  ])("hands a %s from the service to next and sends no response", async (_label, error) => {
    mockCreate.mockRejectedValue(error)

    const { res, next } = await call(noteController.create, {
      body: { savedPropertyId: 3, content: "x" },
    })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe("noteController.update", () => {
  it("answers 200 with the note", async () => {
    mockUpdate.mockResolvedValue(NOTE)

    const { res } = await call(noteController.update, {
      params: { noteId: "5" },
      body: { content: " New text " },
    })

    expect(mockUpdate).toHaveBeenCalledWith(7, 5, "New text")
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ note: NOTE })
  })

  it.each([
    ["a non-numeric id", { noteId: "abc" }, { content: "x" }],
    ["id 0", { noteId: "0" }, { content: "x" }],
    ["an id in exponent form", { noteId: "1e2" }, { content: "x" }],
    ["empty content", { noteId: "5" }, { content: "" }],
    ["content of spaces only", { noteId: "5" }, { content: "  " }],
    ["content that is too long", { noteId: "5" }, { content: "a".repeat(2001) }],
    ["no body", { noteId: "5" }, undefined],
  ])("answers 400 for %s and does not call the service", async (_label, params, body) => {
    const { res, next } = await call(noteController.update, { params, body })

    expectValidationError(res)
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands a 404 from the service to next and sends no response", async () => {
    const error = new AppError("Note not found.", 404)
    mockUpdate.mockRejectedValue(error)

    const { res, next } = await call(noteController.update, {
      params: { noteId: "5" },
      body: { content: "x" },
    })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe("noteController.remove", () => {
  it("answers 204 without a body", async () => {
    mockRemove.mockResolvedValue(undefined)

    const { res } = await call(noteController.remove, { params: { noteId: "5" } })

    expect(mockRemove).toHaveBeenCalledWith(7, 5)
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  it.each([
    ["a non-numeric id", "abc"],
    ["id 0", "0"],
    ["a decimal id", "1.5"],
    ["an id above the INT range", "99999999999"],
  ])("answers 400 for %s and does not call the service", async (_label, noteId) => {
    const { res, next } = await call(noteController.remove, { params: { noteId } })

    expectValidationError(res)
    expect(mockRemove).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it("hands a 404 from the service to next and sends no response", async () => {
    const error = new AppError("Note not found.", 404)
    mockRemove.mockRejectedValue(error)

    const { res, next } = await call(noteController.remove, { params: { noteId: "5" } })

    expect(next).toHaveBeenCalledWith(error)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
  })
})

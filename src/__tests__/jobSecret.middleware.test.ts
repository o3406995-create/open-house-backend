import { describe, it, expect, jest, afterEach } from "@jest/globals"
import type { NextFunction, Request, Response } from "express"
import { requireJobSecret } from "../middleware/jobSecret.middleware.js"
import {
  JOB_SECRET_ENV,
  JOB_SECRET_HEADER,
  JOB_SECRET_MIN_LENGTH,
} from "../constants/jobs.js"

const SECRET = "a-secret-that-is-long-enough"
const original = process.env[JOB_SECRET_ENV]

afterEach(() => {
  if (original === undefined) {
    delete process.env[JOB_SECRET_ENV]
  } else {
    process.env[JOB_SECRET_ENV] = original
  }
})

// The fake request only knows the header the job secret is sent in
function fakeRequest(headerValue?: string) {
  return {
    header: (name: string) => (name.toLowerCase() === JOB_SECRET_HEADER ? headerValue : undefined),
  } as unknown as Request
}

function fakeResponse() {
  const res = {
    status: jest.fn<(code: number) => unknown>(),
    json: jest.fn<(body: unknown) => unknown>(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

function run(headerValue?: string) {
  const res = fakeResponse()
  const next = jest.fn<() => void>()

  requireJobSecret(fakeRequest(headerValue), res as unknown as Response, next as unknown as NextFunction)

  return { res, next }
}

describe("requireJobSecret", () => {
  it("answers 404 when the server has no secret, even for a caller that sends one", () => {
    delete process.env[JOB_SECRET_ENV]

    const { res, next } = run(SECRET)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(next).not.toHaveBeenCalled()
  })

  it("answers 404 when the secret of the server is too short, even if the caller sends the same", () => {
    const tooShort = "x".repeat(JOB_SECRET_MIN_LENGTH - 1)
    process.env[JOB_SECRET_ENV] = tooShort

    const { res, next } = run(tooShort)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(next).not.toHaveBeenCalled()
  })

  it("accepts a secret that has exactly the shortest length", () => {
    const shortest = "x".repeat(JOB_SECRET_MIN_LENGTH)
    process.env[JOB_SECRET_ENV] = shortest

    const { res, next } = run(shortest)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("answers 401 when the caller sends no secret", () => {
    process.env[JOB_SECRET_ENV] = SECRET

    const { res, next } = run(undefined)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("answers 401 for an empty secret", () => {
    process.env[JOB_SECRET_ENV] = SECRET

    const { res, next } = run("")

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("answers 401 for a wrong secret of the same length", () => {
    process.env[JOB_SECRET_ENV] = SECRET

    const { res, next } = run("b" + SECRET.slice(1))

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it.each([
    ["shorter", SECRET.slice(0, -1)],
    ["longer", SECRET + "x"],
  ])("answers 401 for a wrong secret that is %s, without an error", (_label, given) => {
    process.env[JOB_SECRET_ENV] = SECRET

    const { res, next } = run(given)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it("goes on for the right secret and sends no response", () => {
    process.env[JOB_SECRET_ENV] = SECRET

    const { res, next } = run(SECRET)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})

import { describe, it, expect } from "@jest/globals"
import { isUniqueConstraintError } from "../helper/prismaErrors.js"

describe("isUniqueConstraintError", () => {
  it("is true for the Prisma unique constraint code", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true)
  })

  it("is false for other Prisma codes", () => {
    expect(isUniqueConstraintError({ code: "P2039" })).toBe(false)
  })

  it("is false for errors without a code", () => {
    expect(isUniqueConstraintError(new Error("boom"))).toBe(false)
  })

  it("is false for values that are not objects", () => {
    expect(isUniqueConstraintError(null)).toBe(false)
    expect(isUniqueConstraintError(undefined)).toBe(false)
    expect(isUniqueConstraintError("P2002")).toBe(false)
    expect(isUniqueConstraintError(2002)).toBe(false)
  })
})
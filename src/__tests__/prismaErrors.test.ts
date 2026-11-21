import { describe, it, expect } from "@jest/globals"
import { isTransactionConflictError, isUniqueConstraintError } from "../helper/prismaErrors.js"

describe("isUniqueConstraintError", () => {
  it("is true for the Prisma unique constraint code", () => {
    expect(isUniqueConstraintError({ code: "P2002" })).toBe(true)
  })

  it("is false for other Prisma codes", () => {
    expect(isUniqueConstraintError({ code: "P2039" })).toBe(false)
  })

  it("is false for a transaction conflict", () => {
    expect(isUniqueConstraintError({ code: "P2034" })).toBe(false)
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

describe("isTransactionConflictError", () => {
  it("is true for the Prisma write conflict and deadlock code", () => {
    expect(isTransactionConflictError({ code: "P2034" })).toBe(true)
  })

  it("is false for a unique constraint conflict", () => {
    expect(isTransactionConflictError({ code: "P2002" })).toBe(false)
  })

  it("is false for errors without a code", () => {
    expect(isTransactionConflictError(new Error("boom"))).toBe(false)
  })

  it("is false for values that are not objects", () => {
    expect(isTransactionConflictError(null)).toBe(false)
    expect(isTransactionConflictError(undefined)).toBe(false)
    expect(isTransactionConflictError("P2034")).toBe(false)
  })
})

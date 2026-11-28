import { describe, it, expect } from "@jest/globals"
import { trackedIdParamSchema } from "../validators/agentProperty.validator.js"

describe("trackedIdParamSchema", () => {
  it("turns a plain id from the path into a number", () => {
    expect(trackedIdParamSchema.parse({ trackedId: "12" })).toEqual({ trackedId: 12 })
  })

  it.each(["1", "12", "2147483647"])("accepts %j", (value) => {
    expect(trackedIdParamSchema.safeParse({ trackedId: value }).success).toBe(true)
  })

  // Number() alone would take "1e2", "0x10" and " 3", which are not ids
  it.each(["0", "-1", "1.5", "1e2", "0x10", " 3", "03", "abc", "", "2147483648"])("rejects %j", (value) => {
    expect(trackedIdParamSchema.safeParse({ trackedId: value }).success).toBe(false)
  })

  it("rejects a missing id", () => {
    expect(trackedIdParamSchema.safeParse({}).success).toBe(false)
  })
})

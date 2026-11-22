import { describe, it, expect } from "@jest/globals"
import { positiveIntIdSchema } from "../validators/positiveIntId.js"

const MESSAGE = "id must be a positive integer"
const schema = positiveIntIdSchema(MESSAGE)

describe("positiveIntIdSchema", () => {
  it.each([
    ["1", 1],
    ["3", 3],
    ["42", 42],
    ["2147483647", 2147483647],
  ])("turns %p into the number %p", (text, id) => {
    expect(schema.parse(text)).toBe(id)
  })

  // Number() would accept several of these ("1e2", "0x10", " 3", "3 ", "")
  it.each([
    "",
    "0",
    "-1",
    "+3",
    "03",
    "1.5",
    "1e2",
    "0x10",
    " 3",
    "3 ",
    "abc",
    "2147483648",
    "99999999999",
  ])("rejects %p", (value) => {
    expect(schema.safeParse(value).success).toBe(false)
  })

  it("rejects values that are not text", () => {
    expect(schema.safeParse(3).success).toBe(false)
    expect(schema.safeParse(undefined).success).toBe(false)
    expect(schema.safeParse(null).success).toBe(false)
  })

  it.each(["abc", "2147483648"])("reports the given message for %p", (value) => {
    const result = schema.safeParse(value)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGE)
    }
  })
})

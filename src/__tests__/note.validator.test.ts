import { describe, it, expect } from "@jest/globals"
import {
  createNoteSchema,
  noteIdParamSchema,
  updateNoteSchema,
} from "../validators/note.validator.js"
import { NOTE_MAX_LENGTH } from "../constants/note.js"

describe("createNoteSchema", () => {
  it("accepts a note on a saved property", () => {
    expect(createNoteSchema.parse({ savedPropertyId: 3, content: "Call the agent" })).toEqual({
      savedPropertyId: 3,
      content: "Call the agent",
    })
  })

  it("accepts a note on an entry in My Open Houses", () => {
    expect(createNoteSchema.parse({ userOpenHouseId: 4, content: "Ask about parking" })).toEqual({
      userOpenHouseId: 4,
      content: "Ask about parking",
    })
  })

  it("trims the content", () => {
    expect(createNoteSchema.parse({ savedPropertyId: 3, content: "  hello  " }).content).toBe("hello")
  })

  it("accepts a note of the largest length", () => {
    const content = "a".repeat(NOTE_MAX_LENGTH)

    expect(createNoteSchema.safeParse({ savedPropertyId: 3, content }).success).toBe(true)
  })

  it("accepts the largest INT value as a target id", () => {
    expect(createNoteSchema.safeParse({ savedPropertyId: 2147483647, content: "x" }).success).toBe(true)
  })

  it("ignores fields it does not know, such as a user id", () => {
    expect(createNoteSchema.parse({ savedPropertyId: 3, content: "x", userId: 99 })).toEqual({
      savedPropertyId: 3,
      content: "x",
    })
  })

  it.each([
    ["no target", { content: "x" }],
    ["two targets", { savedPropertyId: 1, userOpenHouseId: 2, content: "x" }],
    ["no content", { savedPropertyId: 1 }],
    ["empty content", { savedPropertyId: 1, content: "" }],
    ["content of spaces only", { savedPropertyId: 1, content: "   " }],
    ["content that is too long", { savedPropertyId: 1, content: "a".repeat(NOTE_MAX_LENGTH + 1) }],
    ["content that is not text", { savedPropertyId: 1, content: 5 }],
    ["a target id of 0", { savedPropertyId: 0, content: "x" }],
    ["a negative target id", { savedPropertyId: -1, content: "x" }],
    ["a decimal target id", { savedPropertyId: 1.5, content: "x" }],
    ["a target id above the INT range", { savedPropertyId: 2147483648, content: "x" }],
    ["a target id sent as text", { savedPropertyId: "3", content: "x" }],
    ["a null target id", { savedPropertyId: null, content: "x" }],
    ["an entry id of 0", { userOpenHouseId: 0, content: "x" }],
  ])("rejects %s", (_label, body) => {
    expect(createNoteSchema.safeParse(body).success).toBe(false)
  })

  it.each([undefined, null, "x", 3])("rejects a body that is %p", (body) => {
    expect(createNoteSchema.safeParse(body).success).toBe(false)
  })

  it("reports a missing or doubled target on savedPropertyId", () => {
    const result = createNoteSchema.safeParse({ content: "x" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.savedPropertyId).toBeDefined()
    }
  })
})

describe("updateNoteSchema", () => {
  it("accepts and trims the content", () => {
    expect(updateNoteSchema.parse({ content: "  new text " })).toEqual({ content: "new text" })
  })

  it.each([
    ["no content", {}],
    ["empty content", { content: "" }],
    ["content of spaces only", { content: "  " }],
    ["content that is too long", { content: "a".repeat(NOTE_MAX_LENGTH + 1) }],
    ["content that is not text", { content: 5 }],
  ])("rejects %s", (_label, body) => {
    expect(updateNoteSchema.safeParse(body).success).toBe(false)
  })
})

describe("noteIdParamSchema", () => {
  it("turns the path value into a number", () => {
    expect(noteIdParamSchema.parse({ noteId: "5" })).toEqual({ noteId: 5 })
  })

  it.each(["", "0", "-1", "1.5", "1e2", "0x10", " 3", "abc", "2147483648"])("rejects %p", (value) => {
    expect(noteIdParamSchema.safeParse({ noteId: value }).success).toBe(false)
  })
})

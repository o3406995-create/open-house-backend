import { describe, it, expect } from "@jest/globals"
import { noteSummaryOf } from "../mappers/noteMapper.js"

describe("noteSummaryOf", () => {
  it("describes a note with its id, its text and the time it was last changed", () => {
    const updated = new Date("2026-11-24T01:00:00.000Z")

    expect(noteSummaryOf({ note_id: 5, content: "Call the agent", updated_at: updated })).toEqual({
      noteId: 5,
      content: "Call the agent",
      updatedAt: updated,
    })
  })

  it.each([null, undefined])("answers null for %p", (row) => {
    expect(noteSummaryOf(row)).toBeNull()
  })
})

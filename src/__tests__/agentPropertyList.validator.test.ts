import { describe, it, expect } from "@jest/globals"
import { listTrackedPropertiesSchema } from "../validators/agentProperty.validator.js"
import { listSavedPropertiesSchema } from "../validators/savedProperty.validator.js"

describe("listTrackedPropertiesSchema", () => {
  it("uses the first page of twenty when nothing is given", () => {
    expect(listTrackedPropertiesSchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it("turns the numbers from text, as they come in a query", () => {
    expect(listTrackedPropertiesSchema.parse({ page: "2", pageSize: "10" })).toEqual({ page: 2, pageSize: 10 })
  })

  it.each([
    ["page 0", { page: "0" }],
    ["a page that is not a number", { page: "abc" }],
    ["a decimal page", { page: "1.5" }],
    ["page size 0", { pageSize: "0" }],
    ["a page size above the limit", { pageSize: "51" }],
    ["a page size that is not a number", { pageSize: "x" }],
  ])("rejects %s", (_label, query) => {
    expect(listTrackedPropertiesSchema.safeParse(query).success).toBe(false)
  })

  // The two lists are paged the same way, so the rules must never drift apart
  it.each([[{}], [{ page: "2" }], [{ pageSize: "50" }], [{ pageSize: "51" }], [{ page: "0" }], [{ page: "abc" }]])(
    "agrees with the list of saved properties about %j",
    (query) => {
      expect(listTrackedPropertiesSchema.safeParse(query).success).toBe(
        listSavedPropertiesSchema.safeParse(query).success,
      )
    },
  )
})
